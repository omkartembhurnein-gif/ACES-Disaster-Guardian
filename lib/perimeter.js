// Perimeter extraction: DBSCAN clustering of detections, concave hull per
// cluster, buffered by the VIIRS pixel half-width so the polygon reaches the
// pixel edges rather than the pixel centres.

const turf = require("@turf/turf");

const CLUSTER_EPS_KM = 1.5;
const HULL_MAX_EDGE_KM = 1.5;

function detectionsToPoints(detections) {
  return turf.featureCollection(
    detections.map((d, i) => turf.point([d.lon, d.lat], { i }))
  );
}

// Groups detections into clusters (arrays of detections).
// minPoints = 1 so isolated single-pixel fires still become incidents.
function clusterDetections(detections) {
  if (!detections.length) return [];
  const clustered = turf.clustersDbscan(
    detectionsToPoints(detections),
    CLUSTER_EPS_KM,
    { units: "kilometers", minPoints: 1 }
  );

  const groups = new Map();
  for (const f of clustered.features) {
    const id = f.properties.cluster ?? `noise-${f.properties.i}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(detections[f.properties.i]);
  }
  return [...groups.values()];
}

// Outer rings of a Polygon/MultiPolygon, holes dropped.
function outerPolygon(geometry) {
  if (geometry.type === "Polygon") {
    return turf.polygon([geometry.coordinates[0]]);
  }
  return turf.multiPolygon(geometry.coordinates.map(p => [p[0]]));
}

function countVertices(geometry) {
  const polys =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polys.reduce(
    (sum, poly) => sum + poly.reduce((s, ring) => s + ring.length, 0),
    0
  );
}

function extractPerimeter(cluster) {
  const points = detectionsToPoints(cluster);

  // Pixel footprint grows toward the scan edge; use the cluster's mean
  // scan x track size (km) rather than assuming 375 m nadir pixels.
  const pixelKm =
    cluster.reduce((s, d) => s + Math.sqrt(d.scan * d.track), 0) /
    cluster.length;
  const bufferKm = pixelKm / 2;

  let hull = null;
  let method;
  if (cluster.length >= 3) {
    try {
      hull = turf.concave(points, {
        maxEdge: HULL_MAX_EDGE_KM,
        units: "kilometers",
      });
      method = "concave";
    } catch {
      hull = null;
    }
    if (!hull) {
      hull = turf.convex(points);
      method = "convex";
    }
  }
  if (!hull && cluster.length >= 2) {
    hull = turf.lineString(points.features.map(f => f.geometry.coordinates));
    method = "line";
  }
  if (!hull) {
    hull = points.features[0];
    method = "point";
  }

  const buffered = turf.buffer(hull, bufferKm, {
    units: "kilometers",
    steps: 6,
  });

  // A concave hull can exclude interior-gap pixels near its edge; union with
  // buffered pixels guarantees every detection lies inside the perimeter.
  const pixels = turf.buffer(points, bufferKm, { units: "kilometers", steps: 4 });
  const merged =
    turf.union(turf.featureCollection([buffered, ...pixels.features])) ||
    buffered;

  const polygon = outerPolygon(merged.geometry);
  const rawVertices = countVertices(polygon.geometry);
  const simplified = turf.simplify(polygon, {
    tolerance: 0.0002, // ~20 m
    highQuality: true,
  });

  const inside = cluster.filter(d =>
    turf.booleanPointInPolygon([d.lon, d.lat], simplified)
  ).length;

  return {
    polygon: simplified,
    rawPolygon: polygon,
    method,
    pixelKm,
    rawVertices,
    vertices: countVertices(simplified.geometry),
    areaKm2: turf.area(simplified) / 1e6,
    coverage: inside / cluster.length,
  };
}

module.exports = {
  clusterDetections,
  extractPerimeter,
  outerPolygon,
  countVertices,
  CLUSTER_EPS_KM,
};
