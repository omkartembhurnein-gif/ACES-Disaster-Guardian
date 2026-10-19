// Orchestrates ingest -> cluster -> perimeter -> spread forecast -> compact
// output, and renders GeoJSON / KML exports for field teams.

const zlib = require("zlib");
const turf = require("@turf/turf");
const { fetchLiveDetections, loadSample } = require("./firms");
const {
  clusterDetections,
  extractPerimeter,
  countVertices,
} = require("./perimeter");
const {
  fetchLiveInputs,
  sampleInputs,
  defaultInputs,
  forecastSpread,
  HORIZONS_H,
  BASE_ROS_M_PER_H,
} = require("./spread");

const PRECISION = 1e5; // 5 decimals ~ 1.1 m
const OUTPUT_TOLERANCE_DEG = 0.00025; // ~25 m, well under one VIIRS pixel
const MAX_FORECAST_INCIDENTS = 25;
const MAX_DETECTIONS_OUT = 5000;
const DEFAULT_BBOX = [89.6, 21.9, 97.5, 29.5]; // North-east India
const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const round = v => Math.round(v * PRECISION) / PRECISION;
const round2 = v => Math.round(v * 100) / 100;
const compass = deg => COMPASS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];

// Quantize coordinates and drop consecutive duplicates it creates.
function quantizeGeometry(geometry) {
  const ring = r => {
    const out = [];
    for (const [x, y] of r) {
      const p = [round(x), round(y)];
      const last = out[out.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
    }
    return out;
  };
  if (geometry.type === "Point") {
    return { type: "Point", coordinates: geometry.coordinates.map(round) };
  }
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(ring) };
  }
  return {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map(p => p.map(ring)),
  };
}

function parseBbox(value) {
  if (!value) return DEFAULT_BBOX;
  const parts = String(value).split(",").map(Number);
  const [w, s, e, n] = parts;
  if (
    parts.length !== 4 ||
    parts.some(v => !Number.isFinite(v)) ||
    w < -180 || e > 180 || s < -90 || n > 90 || w >= e || s >= n
  ) {
    throw Object.assign(new Error("bbox must be west,south,east,north"), {
      status: 400,
    });
  }
  return parts;
}

function nearestCity(lat, lon, cities) {
  let best = null;
  for (const [name, c] of Object.entries(cities || {})) {
    const km = turf.distance([lon, lat], [c.lon, c.lat]);
    if (!best || km < best.km) {
      const bearing = turf.bearing([c.lon, c.lat], [lon, lat]);
      best = { name, km: Math.round(km), direction: compass(bearing) };
    }
  }
  return best;
}

function nextHourIso(isoTimes) {
  const latest = Math.max(...isoTimes.map(t => Date.parse(t)));
  return new Date(Math.ceil(latest / 3600e3) * 3600e3).toISOString();
}

const CONFIDENCE_RANK = { l: 0, n: 1, h: 2 };

async function ingest({ mode, bbox, days }) {
  const timings = {};
  const t = Date.now();
  if (mode === "replay") {
    const sample = loadSample();
    timings.ingestMs = Date.now() - t;
    return { mode: "replay", data: sample, timings, reason: "Replay requested" };
  }

  try {
    const live = await fetchLiveDetections({ bbox, days });
    timings.ingestMs = Date.now() - t;
    if (mode === "auto" && !live.detections.length) {
      return {
        mode: "replay",
        data: loadSample(),
        timings,
        reason: "No live VIIRS detections in the area; showing replay sample",
      };
    }
    return { mode: "live", data: live, timings, reason: null };
  } catch (error) {
    timings.ingestMs = Date.now() - t;
    if (mode === "live") {
      throw Object.assign(error, { status: error.code === "NO_KEY" ? 503 : 502 });
    }
    return {
      mode: "replay",
      data: loadSample(),
      timings,
      reason:
        error.code === "NO_KEY"
          ? "FIRMS_MAP_KEY not set; showing replay sample"
          : `Live feed unavailable (${error.message}); showing replay sample`,
    };
  }
}

async function runPipeline(options = {}, cities = {}) {
  const started = Date.now();
  const mode = ["live", "replay", "auto"].includes(options.mode)
    ? options.mode
    : "auto";
  const bbox = parseBbox(options.bbox);
  const days = Math.min(5, Math.max(1, Number(options.days) || 1));
  const minConfidence = ["l", "n", "h"].includes(options.minConfidence)
    ? options.minConfidence
    : "n";

  const ingested = await ingest({ mode, bbox, days });
  const { data, timings } = ingested;

  // Filter by confidence (and bbox for live data).
  let t = Date.now();
  const detections = data.detections.filter(
    d =>
      CONFIDENCE_RANK[d.confidence] >= CONFIDENCE_RANK[minConfidence] &&
      (ingested.mode === "replay" ||
        (d.lon >= bbox[0] && d.lon <= bbox[2] && d.lat >= bbox[1] && d.lat <= bbox[3]))
  );

  const clusters = clusterDetections(detections);
  timings.clusterMs = Date.now() - t;

  t = Date.now();
  const incidents = clusters.map(cluster => {
    const perimeter = extractPerimeter(cluster);
    const frpSum = cluster.reduce((s, d) => s + d.frp, 0);
    const [lon, lat] = turf.centroid(perimeter.polygon).geometry.coordinates;
    return { cluster, perimeter, frpSum, frpMean: frpSum / cluster.length, lat, lon };
  });
  incidents.sort((a, b) => b.frpSum - a.frpSum);
  timings.perimeterMs = Date.now() - t;

  // Forecast start: the hour after the latest detection (replay) or now (live).
  const startIso =
    ingested.mode === "replay" && detections.length
      ? nextHourIso(detections.map(d => d.acquired))
      : new Date(Math.floor(Date.now() / 3600e3) * 3600e3).toISOString();

  const forecastable = incidents.slice(0, MAX_FORECAST_INCIDENTS);
  t = Date.now();
  let inputs;
  let weatherCache = "bundled";
  const warnings = [...(data.warnings || [])];
  if (ingested.mode === "replay") {
    inputs = forecastable.map(inc =>
      sampleInputs([inc.lat, inc.lon], data.context, startIso)
    );
  } else if (forecastable.length) {
    try {
      const live = await fetchLiveInputs(
        forecastable.map(inc => [inc.lat, inc.lon]),
        startIso
      );
      inputs = live.inputs;
      weatherCache = live.cache;
    } catch (error) {
      warnings.push(`Weather unavailable: ${error.message}`);
      inputs = forecastable.map(() => defaultInputs(startIso));
      weatherCache = "fallback";
    }
  } else {
    inputs = [];
  }
  timings.weatherMs = Date.now() - t;

  t = Date.now();
  const out = incidents.map((inc, k) => {
    const id = `DG-${startIso.slice(0, 10).replace(/-/g, "")}-${String(k + 1).padStart(2, "0")}`;
    const acquired = inc.cluster.map(d => d.acquired).sort();
    const base = {
      id,
      centroid: [round(inc.lon), round(inc.lat)],
      nearestCity: nearestCity(inc.lat, inc.lon, cities),
      detections: inc.cluster.length,
      frpSumMw: round2(inc.frpSum),
      firstSeen: acquired[0],
      lastSeen: acquired[acquired.length - 1],
      areaKm2: round2(inc.perimeter.areaKm2),
      hullMethod: inc.perimeter.method,
      pixelKm: round2(inc.perimeter.pixelKm),
      coverage: round2(inc.perimeter.coverage),
      perimeter: quantizeGeometry(inc.perimeter.polygon.geometry),
      rawVertices: inc.perimeter.rawVertices,
      vertices: inc.perimeter.vertices,
      forecast: null,
      _raw: { perimeter: inc.perimeter.rawPolygon.geometry, isochrones: [] },
    };
    if (k >= forecastable.length) return base;

    const input = inputs[k];
    const fc = forecastSpread(inc.perimeter.polygon, input, inc.frpMean);
    const first = fc.hourly[0];
    base.forecast = {
      start: startIso,
      inputsSource: input.source,
      degraded: Boolean(input.degraded),
      terrain: {
        elevationM: input.terrain.elevationM,
        slopeDeg: round2(input.terrain.slopeDeg),
        upslopeAzimuth: Math.round(input.terrain.upslopeAzimuth),
      },
      now: {
        windKmh: first.windKmh,
        windFromDeg: first.windFromDeg,
        rh: first.rh,
        tempC: first.tempC,
        headingDeg: Math.round(first.headingDeg),
        heading: compass(first.headingDeg),
        headRosMh: Math.round(first.headRos),
        lengthToBreadth: round2(first.lb),
      },
      hourly: fc.hourly.map(h => ({
        hour: h.hour,
        time: h.time,
        windKmh: h.windKmh,
        windFromDeg: h.windFromDeg,
        rh: h.rh,
        headingDeg: Math.round(h.headingDeg),
        headRosMh: Math.round(h.headRos),
      })),
      isochrones: fc.isochrones.map(iso => {
        const simple = turf.simplify(iso.polygon, {
          tolerance: OUTPUT_TOLERANCE_DEG,
          highQuality: true,
        });
        base._raw.isochrones.push(iso.polygon.geometry);
        return {
          hours: iso.hours,
          validAt: iso.validAt,
          areaKm2: round2(iso.areaKm2),
          rawVertices: iso.vertices,
          vertices: countVertices(simple.geometry),
          geometry: quantizeGeometry(simple.geometry),
        };
      }),
    };
    return base;
  });
  timings.forecastMs = Date.now() - t;

  const detectionPoints = detections.slice(0, MAX_DETECTIONS_OUT).map(d => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [round(d.lon), round(d.lat)] },
    properties: {
      frp: d.frp,
      confidence: d.confidence,
      satellite: d.satellite,
      acquired: d.acquired,
    },
  }));

  const result = {
    mode: ingested.mode,
    requestedMode: mode,
    reason: ingested.reason,
    source: data.source,
    sources: data.sources,
    warnings,
    bbox,
    days,
    minConfidence,
    generatedAt: new Date().toISOString(),
    forecastStart: startIso,
    horizons: HORIZONS_H,
    model: {
      clustering: "DBSCAN eps 1.5 km, minPoints 1",
      perimeter:
        "Concave hull (max edge 1.5 km) buffered by half the mean VIIRS pixel size",
      spread:
        "Hourly elliptical Huygens wavelets (Richards envelope); ROS = base x wind(FBP) x humidity x slope x FRP",
      baseRosMh: BASE_ROS_M_PER_H,
      precisionDecimals: 5,
    },
    incidents: out,
    detections: { type: "FeatureCollection", features: detectionPoints },
  };

  // Payload efficiency: the field product (perimeters + forecast bands) as
  // shipped vs. the same product at full precision without simplification.
  const unoptimized = toGeoJSON({
    ...result,
    incidents: out.map(inc => ({
      ...inc,
      perimeter: inc._raw.perimeter,
      forecast: inc.forecast && {
        ...inc.forecast,
        isochrones: inc.forecast.isochrones.map((iso, j) => ({
          ...iso,
          geometry: inc._raw.isochrones[j],
        })),
      },
    })),
  });
  out.forEach(inc => delete inc._raw);
  const productJson = JSON.stringify(toGeoJSON(result));
  const outputBytes = Buffer.byteLength(productJson);
  const unoptimizedBytes = Buffer.byteLength(JSON.stringify(unoptimized));
  const sumVertices = key =>
    out.reduce(
      (s, inc) =>
        s +
        inc[key] +
        (inc.forecast?.isochrones || []).reduce((t, iso) => t + iso[key], 0),
      0
    );

  timings.totalMs = Date.now() - started;
  result.stats = {
    detectionsRaw: data.detections.length,
    detectionsUsed: detections.length,
    incidents: out.length,
    forecasted: forecastable.length,
    areaKm2: round2(out.reduce((s, i) => s + i.areaKm2, 0)),
    area12hKm2: round2(
      out.reduce(
        (s, i) => s + (i.forecast?.isochrones.at(-1)?.areaKm2 ?? i.areaKm2),
        0
      )
    ),
    meanCoverage: out.length
      ? round2(out.reduce((s, i) => s + i.coverage, 0) / out.length)
      : null,
    rawBytes: data.rawBytes,
    unoptimizedBytes,
    outputBytes,
    outputGzipBytes: zlib.gzipSync(productJson).length,
    reductionPct: unoptimizedBytes
      ? Math.round((1 - outputBytes / unoptimizedBytes) * 1000) / 10
      : null,
    verticesRaw: sumVertices("rawVertices"),
    vertices: sumVertices("vertices"),
    cache: { firms: data.cache, weather: weatherCache },
    timings,
  };
  return result;
}

// ---------- Exports ----------

function toGeoJSON(result) {
  const features = [];
  for (const inc of result.incidents) {
    const common = {
      incident: inc.id,
      nearest: inc.nearestCity
        ? `${inc.nearestCity.km} km ${inc.nearestCity.direction} of ${inc.nearestCity.name}`
        : null,
    };
    for (const iso of [...(inc.forecast?.isochrones || [])].reverse()) {
      features.push({
        type: "Feature",
        geometry: iso.geometry,
        properties: {
          ...common,
          kind: "forecast",
          hours: iso.hours,
          validAt: iso.validAt,
          areaKm2: iso.areaKm2,
        },
      });
    }
    features.push({
      type: "Feature",
      geometry: inc.perimeter,
      properties: {
        ...common,
        kind: "perimeter",
        detections: inc.detections,
        areaKm2: inc.areaKm2,
        frpSumMw: inc.frpSumMw,
        lastSeen: inc.lastSeen,
        heading: inc.forecast?.now.heading ?? null,
        headRosMh: inc.forecast?.now.headRosMh ?? null,
      },
    });
  }
  return {
    type: "FeatureCollection",
    properties: {
      generatedAt: result.generatedAt,
      mode: result.mode,
      source: result.source,
      forecastStart: result.forecastStart,
      disclaimer:
        "Satellite-derived estimate; not an official incident perimeter.",
    },
    features,
  };
}

const xmlEscape = s =>
  String(s).replace(/[<>&'"]/g, c =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]
  );

function kmlPolygons(geometry) {
  const polys =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const ring = r => r.map(([x, y]) => `${x},${y}`).join(" ");
  const parts = polys.map(
    p =>
      `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring(p[0])}</coordinates></LinearRing></outerBoundaryIs></Polygon>`
  );
  return parts.length === 1 ? parts[0] : `<MultiGeometry>${parts.join("")}</MultiGeometry>`;
}

// KML colours are aabbggrr.
const KML_STYLES = {
  perimeter: "ff675dff",
  h1: "ff4f7bff",
  h3: "ff439fff",
  h6: "ff4bc2ff",
  h12: "ff8ae0ff",
};

function toKML(result) {
  const styles = Object.entries(KML_STYLES)
    .map(
      ([id, color]) =>
        `<Style id="${id}"><LineStyle><color>${color}</color><width>2</width></LineStyle><PolyStyle><color>${
          id === "perimeter" ? "88" : "40"
        }${color.slice(2)}</color></PolyStyle></Style>`
    )
    .join("");

  const folders = result.incidents
    .map(inc => {
      const near = inc.nearestCity
        ? `${inc.nearestCity.km} km ${inc.nearestCity.direction} of ${inc.nearestCity.name}`
        : "";
      const bands = [...(inc.forecast?.isochrones || [])]
        .reverse()
        .map(
          iso =>
            `<Placemark><name>${xmlEscape(`${inc.id} +${iso.hours} h`)}</name><description>${xmlEscape(
              `Forecast valid ${iso.validAt}. Area ${iso.areaKm2} km2.`
            )}</description><styleUrl>#h${iso.hours}</styleUrl>${kmlPolygons(iso.geometry)}</Placemark>`
        )
        .join("");
      return `<Folder><name>${xmlEscape(inc.id)}</name><description>${xmlEscape(
        `${near}. ${inc.detections} detections, ${inc.areaKm2} km2, last seen ${inc.lastSeen}.`
      )}</description><Placemark><name>${xmlEscape(`${inc.id} perimeter`)}</name><styleUrl>#perimeter</styleUrl>${kmlPolygons(
        inc.perimeter
      )}</Placemark><Placemark><name>${xmlEscape(`${inc.id} centroid`)}</name><Point><coordinates>${inc.centroid.join(
        ","
      )}</coordinates></Point></Placemark>${bands}</Folder>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>DisasterGuardian fire perimeters ${xmlEscape(
    result.generatedAt
  )}</name><description>${xmlEscape(
    `${result.source}. Mode: ${result.mode}. Satellite-derived estimate; not an official incident perimeter.`
  )}</description>${styles}${folders}</Document></kml>
`;
}

module.exports = {
  runPipeline,
  toGeoJSON,
  toKML,
  parseBbox,
  quantizeGeometry,
  nearestCity,
};
