// NASA FIRMS VIIRS active-fire ingestion (area CSV API) with a TTL cache,
// plus the bundled replay sample used when there is no key or no live fires.

const fs = require("fs");
const path = require("path");

const FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const VIIRS_SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"];
const CACHE_TTL_MS = 10 * 60 * 1000;
const SAMPLE_DIR = path.join(__dirname, "..", "data", "sample");

const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  cache.delete(key);
  return null;
}

function cacheSet(key, value) {
  cache.set(key, { at: Date.now(), value });
}

// FIRMS CSV -> detection objects. Unknown columns are ignored.
function parseFirmsCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (!lines.length || !lines[0].startsWith("latitude")) {
    throw new Error(
      `Unexpected FIRMS response: ${lines[0]?.slice(0, 120) || "empty"}`
    );
  }

  const header = lines[0].split(",");
  const col = name => header.indexOf(name);
  const idx = {
    lat: col("latitude"),
    lon: col("longitude"),
    ti4: col("bright_ti4"),
    scan: col("scan"),
    track: col("track"),
    date: col("acq_date"),
    time: col("acq_time"),
    sat: col("satellite"),
    conf: col("confidence"),
    frp: col("frp"),
    dn: col("daynight"),
  };

  const detections = [];
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(",");
    const lat = Number(f[idx.lat]);
    const lon = Number(f[idx.lon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const time = String(f[idx.time] || "0").padStart(4, "0");
    detections.push({
      lat,
      lon,
      brightTi4: Number(f[idx.ti4]) || null,
      scan: Number(f[idx.scan]) || 0.375,
      track: Number(f[idx.track]) || 0.375,
      acquired: `${f[idx.date]}T${time.slice(0, 2)}:${time.slice(2)}:00Z`,
      satellite: f[idx.sat] || null,
      confidence: normalizeConfidence(f[idx.conf]),
      frp: Number(f[idx.frp]) || 0,
      daynight: f[idx.dn] || null,
    });
  }
  return detections;
}

// VIIRS uses l/n/h; MODIS uses 0-100. Map both onto l/n/h.
function normalizeConfidence(value) {
  const v = String(value || "").trim().toLowerCase();
  if (["l", "low"].includes(v)) return "l";
  if (["h", "high"].includes(v)) return "h";
  if (["n", "nominal"].includes(v)) return "n";
  const pct = Number(v);
  if (Number.isFinite(pct)) return pct >= 80 ? "h" : pct >= 30 ? "n" : "l";
  return "n";
}

async function fetchSource(mapKey, source, bbox, days) {
  const url = `${FIRMS_BASE}/${encodeURIComponent(mapKey)}/${source}/${bbox.join(",")}/${days}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`FIRMS ${source} returned HTTP ${response.status}`);
  }
  // FIRMS reports bad keys / limits as plain text with HTTP 200.
  if (!text.startsWith("latitude")) {
    throw new Error(`FIRMS ${source}: ${text.trim().slice(0, 120)}`);
  }
  return text;
}

// Pull all VIIRS satellites for the bbox. Returns raw CSV bytes + detections.
async function fetchLiveDetections({ bbox, days }) {
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) {
    const err = new Error("FIRMS_MAP_KEY is not set in .env");
    err.code = "NO_KEY";
    throw err;
  }

  const key = `${bbox.join(",")}|${days}`;
  const cached = cacheGet(key);
  if (cached) return { ...cached, cache: "hit" };

  const results = await Promise.allSettled(
    VIIRS_SOURCES.map(source => fetchSource(mapKey, source, bbox, days))
  );
  const ok = results.filter(r => r.status === "fulfilled");
  if (!ok.length) throw results[0].reason;

  let rawBytes = 0;
  const detections = [];
  for (const r of ok) {
    rawBytes += Buffer.byteLength(r.value);
    detections.push(...parseFirmsCsv(r.value));
  }

  const value = {
    source: "NASA FIRMS VIIRS NRT",
    sources: VIIRS_SOURCES.filter((_, i) => results[i].status === "fulfilled"),
    warnings: results
      .filter(r => r.status === "rejected")
      .map(r => r.reason.message),
    rawBytes,
    detections,
  };
  cacheSet(key, value);
  return { ...value, cache: "miss" };
}

let sampleCache = null;

function loadSample() {
  if (!sampleCache) {
    const csv = fs.readFileSync(path.join(SAMPLE_DIR, "viirs_sample.csv"), "utf8");
    const context = JSON.parse(
      fs.readFileSync(path.join(SAMPLE_DIR, "context.json"), "utf8")
    );
    sampleCache = {
      source: "Bundled replay sample (synthetic VIIRS detections, ERA5 weather)",
      sources: ["sample:viirs_sample.csv"],
      warnings: [],
      rawBytes: Buffer.byteLength(csv),
      detections: parseFirmsCsv(csv),
      context,
    };
  }
  return { ...sampleCache, cache: "bundled" };
}

module.exports = {
  fetchLiveDetections,
  loadSample,
  parseFirmsCsv,
  cacheGet,
  cacheSet,
};
