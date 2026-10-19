// Flood intelligence: NASA VIIRS Combined Flood product (via GIBS WMS) ->
// flood pixel mask -> connected flood zones -> perimeter polygons ->
// 12-hour outlook from forecast rainfall and GloFAS river discharge.
//
// The VIIRS flood product classifies each ~375 m pixel; GIBS renders it with
// a fixed colour map, so the classes can be read back from the PNG exactly:
//   surface water (50,210,245)  recurring flood (255,255,0)
//   flood (250,30,36)           insufficient data / cloud (175,175,175)

const zlib = require("zlib");
const turf = require("@turf/turf");
const { PNG } = require("pngjs");
const { parseBbox, quantizeGeometry, nearestCity } = require("./fire-engine");
const { countVertices } = require("./perimeter");

const GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const LAYER = "VIIRS_Combined_Flood_2-Day";
const LAYER_FIRST_DATE = "2025-06-24";
const TARGET_DEG_PER_PX = 0.0045; // ~500 m
const MAX_PX = 2048;
const DILATE_PX = 2; // join flood fragments separated by <= 2 pixels
const MIN_FLOOD_PIXELS = 3; // smaller zones are treated as noise
const MAX_INCIDENTS = 30;
const MAX_HULL_POINTS = 4000;
const CACHE_MS = 30 * 60 * 1000;

const CLASS = { NONE: 0, WATER: 1, RECURRING: 2, FLOOD: 3, NODATA: 4 };
const COLOURS = [
  { cls: CLASS.WATER, rgb: [50, 210, 245] },
  { cls: CLASS.RECURRING, rgb: [255, 255, 0] },
  { cls: CLASS.FLOOD, rgb: [250, 30, 36] },
  { cls: CLASS.NODATA, rgb: [175, 175, 175] },
];

const cache = new Map();
const round2 = v => Math.round(v * 100) / 100;

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

// Yesterday (UTC) by default: today's 2-day composite is still filling in.
function parseDate(value) {
  const today = isoDate(new Date());
  if (!value) return isoDate(new Date(Date.now() - 864e5));
  const date = String(value);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date)) ||
    date < LAYER_FIRST_DATE ||
    date > today
  ) {
    throw Object.assign(
      new Error(`date must be YYYY-MM-DD between ${LAYER_FIRST_DATE} and ${today}`),
      { status: 400 }
    );
  }
  return date;
}

async function fetchFloodRaster(bbox, date) {
  const [w, s, e, n] = bbox;
  const degPerPx = Math.max(
    TARGET_DEG_PER_PX,
    (e - w) / MAX_PX,
    (n - s) / MAX_PX
  );
  const width = Math.max(1, Math.round((e - w) / degPerPx));
  const height = Math.max(1, Math.round((n - s) / degPerPx));

  const url = new URL(GIBS_WMS);
  url.search = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: LAYER,
    STYLES: "",
    SRS: "EPSG:4326",
    BBOX: bbox.join(","),
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: "image/png",
    TRANSPARENT: "true",
    TIME: date,
  }).toString();

  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  const type = response.headers.get("content-type") || "";
  if (!response.ok || !type.includes("image/png")) {
    throw new Error(`NASA GIBS flood imagery unavailable (HTTP ${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const png = PNG.sync.read(buffer);
  return {
    png,
    bytes: buffer.length,
    dx: (e - w) / png.width,
    dy: (n - s) / png.height,
  };
}

function classify(png) {
  const { width, height, data } = png;
  const classes = new Uint8Array(width * height);
  const counts = { flood: 0, recurring: 0, water: 0, nodata: 0, total: width * height };

  for (let p = 0, i = 0; p < classes.length; p++, i += 4) {
    if (data[i + 3] === 0) continue;
    for (const { cls, rgb } of COLOURS) {
      if (
        Math.abs(data[i] - rgb[0]) < 8 &&
        Math.abs(data[i + 1] - rgb[1]) < 8 &&
        Math.abs(data[i + 2] - rgb[2]) < 8
      ) {
        classes[p] = cls;
        break;
      }
    }
    if (classes[p] === CLASS.FLOOD) counts.flood++;
    else if (classes[p] === CLASS.RECURRING) counts.recurring++;
    else if (classes[p] === CLASS.WATER) counts.water++;
    else if (classes[p] === CLASS.NODATA) counts.nodata++;
  }
  return { classes, counts };
}

// Labels flood zones. Fragments within DILATE_PX pixels belong to the same
// zone (a flooded plain is often broken up by roads, trees and cloud edges).
function labelZones(classes, width, height) {
  const flood = new Uint8Array(classes.length);
  for (let p = 0; p < classes.length; p++) flood[p] = classes[p] === CLASS.FLOOD ? 1 : 0;

  const grown = new Uint8Array(flood.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!flood[y * width + x]) continue;
      for (let yy = Math.max(0, y - DILATE_PX); yy <= Math.min(height - 1, y + DILATE_PX); yy++) {
        for (let xx = Math.max(0, x - DILATE_PX); xx <= Math.min(width - 1, x + DILATE_PX); xx++) {
          grown[yy * width + xx] = 1;
        }
      }
    }
  }

  const labels = new Int32Array(flood.length);
  const zones = [];
  const stack = [];
  for (let start = 0; start < grown.length; start++) {
    if (!grown[start] || labels[start]) continue;
    const id = zones.length + 1;
    const pixels = [];
    labels[start] = id;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop();
      if (flood[p]) pixels.push(p);
      const x = p % width;
      const y = (p - x) / width;
      for (let ny = y - 1; ny <= y + 1; ny++) {
        if (ny < 0 || ny >= height) continue;
        for (let nx = x - 1; nx <= x + 1; nx++) {
          if (nx < 0 || nx >= width) continue;
          const q = ny * width + nx;
          if (grown[q] && !labels[q]) {
            labels[q] = id;
            stack.push(q);
          }
        }
      }
    }
    if (pixels.length >= MIN_FLOOD_PIXELS) zones.push(pixels);
    else zones.push(null);
  }
  return { zones: zones.filter(Boolean), flood };
}

function zonePerimeter(pixels, flood, width, height, raster, bbox) {
  const [w, , , n] = bbox;
  const { dx, dy } = raster;
  const lonOf = x => w + (x + 0.5) * dx;
  const latOf = y => n - (y + 0.5) * dy;

  let sumLon = 0;
  let sumLat = 0;
  const edge = [];
  for (const p of pixels) {
    const x = p % width;
    const y = (p - x) / width;
    sumLon += lonOf(x);
    sumLat += latOf(y);
    const isEdge =
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ||
      !flood[p - 1] || !flood[p + 1] || !flood[p - width] || !flood[p + width];
    if (isEdge) edge.push([lonOf(x), latOf(y)]);
  }

  const lat = sumLat / pixels.length;
  const lon = sumLon / pixels.length;
  const pixelKmX = dx * 111.32 * Math.cos((lat * Math.PI) / 180);
  const pixelKmY = dy * 110.57;
  const pixelKm = Math.sqrt(pixelKmX * pixelKmY);

  const stride = Math.ceil(edge.length / MAX_HULL_POINTS);
  const points = turf.featureCollection(
    edge.filter((_, i) => i % stride === 0).map(c => turf.point(c))
  );

  let hull = null;
  if (points.features.length >= 3) {
    try {
      hull = turf.concave(points, { maxEdge: pixelKm * (DILATE_PX + 2), units: "kilometers" });
    } catch {
      hull = null;
    }
    if (!hull) hull = turf.convex(points);
  }
  if (!hull) hull = points.features[0];

  const buffered = turf.buffer(hull, pixelKm / 2, { units: "kilometers", steps: 4 });
  let polygon = buffered;
  if (buffered.geometry.type === "MultiPolygon") {
    // Keep outer rings only.
    polygon = turf.multiPolygon(buffered.geometry.coordinates.map(p => [p[0]]));
  } else {
    polygon = turf.polygon([buffered.geometry.coordinates[0]]);
  }
  const rawVertices = countVertices(polygon.geometry);
  const simplified = turf.simplify(polygon, { tolerance: dx / 2, highQuality: true });

  return {
    lon,
    lat,
    polygon: simplified,
    rawVertices,
    vertices: countVertices(simplified.geometry),
    // Area from the pixel count (exact for the classified raster), not the hull.
    areaKm2: pixels.length * pixelKmX * pixelKmY,
    perimeterAreaKm2: turf.area(simplified) / 1e6,
    pixelKm,
  };
}

// 12-hour outlook per zone: forecast rain + GloFAS river discharge trend.
async function fetchOutlook(zones) {
  if (!zones.length) return [];
  const lats = zones.map(z => z.lat.toFixed(4)).join(",");
  const lons = zones.map(z => z.lon.toFixed(4)).join(",");
  const asArray = json => (Array.isArray(json) ? json : [json]);

  const [rain, river] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
        "&hourly=precipitation&forecast_hours=12&timezone=UTC",
      { signal: AbortSignal.timeout(20000) }
    ).then(r => (r.ok ? r.json() : null)).catch(() => null),
    fetch(
      `https://flood-api.open-meteo.com/v1/flood?latitude=${lats}&longitude=${lons}` +
        "&daily=river_discharge&past_days=1&forecast_days=2",
      { signal: AbortSignal.timeout(20000) }
    ).then(r => (r.ok ? r.json() : null)).catch(() => null),
  ]);

  const rainList = rain ? asArray(rain) : [];
  const riverList = river ? asArray(river) : [];

  return zones.map((_, i) => {
    const hourly = rainList[i]?.hourly?.precipitation || [];
    const rain12hMm = hourly.length
      ? round2(hourly.reduce((s, v) => s + (v || 0), 0))
      : null;

    // daily: [yesterday, today, tomorrow]
    const q = riverList[i]?.daily?.river_discharge || [];
    const today = q[1];
    const tomorrow = q[2];
    const hasRiver = Number.isFinite(today) && Number.isFinite(tomorrow) && today >= 1;
    const dischargeChangePct = hasRiver
      ? Math.round(((tomorrow - today) / today) * 100)
      : null;

    let status = "Stable";
    if ((dischargeChangePct ?? 0) > 5 || (rain12hMm ?? 0) >= 20) status = "Rising";
    else if ((dischargeChangePct ?? 0) < -5 && (rain12hMm ?? 0) < 5) status = "Receding";
    if (rain12hMm == null && dischargeChangePct == null) status = "Unknown";

    return {
      status,
      rain12hMm,
      dischargeM3s: hasRiver ? round2(today) : null,
      dischargeChangePct,
    };
  });
}

async function runFloodPipeline(options = {}, places = {}) {
  const t0 = Date.now();
  const bbox = parseBbox(options.bbox);
  const date = parseDate(options.date);
  const key = `${bbox.join(",")}|${date}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_MS) {
    return { ...cached.value, stats: { ...cached.value.stats, cache: "hit" } };
  }

  const raster = await fetchFloodRaster(bbox, date);
  const tFetch = Date.now();
  const { width, height } = raster.png;
  const { classes, counts } = classify(raster.png);
  const { zones, flood } = labelZones(classes, width, height);
  const tLabel = Date.now();

  const ranked = zones.sort((a, b) => b.length - a.length).slice(0, MAX_INCIDENTS);
  const shapes = ranked.map(pixels =>
    zonePerimeter(pixels, flood, width, height, raster, bbox)
  );
  const tPerimeter = Date.now();

  const outlooks = await fetchOutlook(shapes);
  const tOutlook = Date.now();

  const stamp = date.replace(/-/g, "");
  const incidents = shapes.map((z, i) => ({
    id: `FL-${stamp}-${String(i + 1).padStart(2, "0")}`,
    type: "flood",
    centroid: [Math.round(z.lon * 1e5) / 1e5, Math.round(z.lat * 1e5) / 1e5],
    pixels: ranked[i].length,
    areaKm2: round2(z.areaKm2),
    perimeterAreaKm2: round2(z.perimeterAreaKm2),
    perimeter: quantizeGeometry(z.polygon.geometry),
    nearestCity: nearestCity(z.lat, z.lon, places),
    outlook: outlooks[i],
  }));

  const pixelAreaKm2 =
    (raster.dx * 111.32 * Math.cos((((bbox[1] + bbox[3]) / 2) * Math.PI) / 180)) *
    (raster.dy * 110.57);

  const payload = JSON.stringify(incidents);
  const value = {
    type: "flood",
    mode: "live",
    source: "NASA VIIRS Combined Flood (2-day composite) via GIBS",
    layer: LAYER,
    date,
    bbox,
    generatedAt: new Date().toISOString(),
    resolutionKm: round2(Math.sqrt(pixelAreaKm2)),
    model: {
      classification: "VIIRS flood class read from the GIBS colour map",
      zones: `8-connected flood pixels, fragments within ${DILATE_PX} px joined, zones < ${MIN_FLOOD_PIXELS} px dropped`,
      perimeter: "Concave hull of zone edge pixels, buffered by half a pixel",
      outlook: "12 h rainfall (Open-Meteo) + 24 h GloFAS river discharge trend",
    },
    incidents,
    stats: {
      pixels: counts,
      raster: { width, height },
      insufficientDataPct: Math.round((counts.nodata / counts.total) * 100),
      floodAreaKm2: round2(counts.flood * pixelAreaKm2),
      recurringAreaKm2: round2(counts.recurring * pixelAreaKm2),
      zones: zones.length,
      incidents: incidents.length,
      rawBytes: raster.bytes,
      outputBytes: Buffer.byteLength(payload),
      outputGzipBytes: zlib.gzipSync(payload).length,
      verticesRaw: shapes.reduce((s, z) => s + z.rawVertices, 0),
      vertices: shapes.reduce((s, z) => s + z.vertices, 0),
      cache: "miss",
      timings: {
        fetchMs: tFetch - t0,
        labelMs: tLabel - tFetch,
        perimeterMs: tPerimeter - tLabel,
        outlookMs: tOutlook - tPerimeter,
        totalMs: Date.now() - t0,
      },
    },
  };

  cache.set(key, { time: Date.now(), value });
  return value;
}

function floodsToGeoJSON(result) {
  return {
    type: "FeatureCollection",
    properties: {
      source: result.source,
      date: result.date,
      generatedAt: result.generatedAt,
    },
    features: result.incidents.map(inc => ({
      type: "Feature",
      geometry: inc.perimeter,
      properties: {
        id: inc.id,
        type: "flood",
        areaKm2: inc.areaKm2,
        outlook: inc.outlook.status,
        rain12hMm: inc.outlook.rain12hMm,
        dischargeChangePct: inc.outlook.dischargeChangePct,
        centroid: inc.centroid,
      },
    })),
  };
}

module.exports = { runFloodPipeline, floodsToGeoJSON, parseDate };
