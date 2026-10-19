// Builds the bundled replay dataset in data/sample/.
//
// viirs_sample.csv  Synthetic VIIRS 375 m detections in the exact FIRMS area-CSV
//                   format, modelled on dry-season (March) hill-forest fires in
//                   south Assam. Positions/FRP are generated, not observed.
// context.json      Real ERA5 hourly weather (Open-Meteo archive) and Copernicus
//                   DEM elevations for each incident, so replay runs offline.
//
// Usage: node scripts/build-sample.js

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "data", "sample");
const DATE = "2025-03-18";
const PIXEL_KM = 0.375;

// Deterministic PRNG so the sample is reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20250318);
const gauss = () => {
  const u = rand() || 1e-9;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};

const incidents = [
  { id: "dima-hasao", name: "Dima Hasao ridge", lat: 25.48, lon: 93.08, alongKm: 4.6, acrossKm: 1.7, azimuth: 55, fill: 0.78, frp: 14 },
  { id: "karbi-anglong", name: "Karbi Anglong slope", lat: 26.02, lon: 93.42, alongKm: 2.5, acrossKm: 1.2, azimuth: 115, fill: 0.72, frp: 9 },
  { id: "barail", name: "Barail range", lat: 25.02, lon: 92.93, alongKm: 1.3, acrossKm: 0.8, azimuth: 20, fill: 0.85, frp: 6 },
  { id: "umrangso", name: "Umrangso spot fire", lat: 25.52, lon: 92.73, alongKm: 0.2, acrossKm: 0.2, azimuth: 0, fill: 1, frp: 4 },
];

// Passes: Suomi-NPP and NOAA-20 afternoon overpasses (UTC).
const passes = [
  { satellite: "N", time: "0742", gridShift: 0 },
  { satellite: "N20", time: "0651", gridShift: 0.5 },
];

function insideShape(inc, along, across) {
  // Ellipse with a forward lobe so the shape is not a perfect ellipse.
  const a = inc.alongKm / 2;
  const b = inc.acrossKm / 2;
  const main = (along / a) ** 2 + (across / b) ** 2 <= 1;
  const lobe =
    ((along - a * 0.55) / (a * 0.45)) ** 2 +
      ((across - b * 0.9) / (b * 0.6)) ** 2 <=
    1;
  return main || lobe;
}

const rows = [];

for (const inc of incidents) {
  const kmPerDegLat = 110.574;
  const kmPerDegLon = 111.32 * Math.cos((inc.lat * Math.PI) / 180);
  const az = (inc.azimuth * Math.PI) / 180;
  const extent = Math.max(inc.alongKm, inc.acrossKm);
  const steps = Math.ceil(extent / PIXEL_KM) + 2;

  for (const pass of passes) {
    for (let i = -steps; i <= steps; i++) {
      for (let j = -steps; j <= steps; j++) {
        const x = (i + pass.gridShift) * PIXEL_KM; // east
        const y = (j + pass.gridShift) * PIXEL_KM; // north
        const along = x * Math.sin(az) + y * Math.cos(az);
        const across = x * Math.cos(az) - y * Math.sin(az);
        if (!insideShape(inc, along, across)) continue;
        if (inc.alongKm > 0.5 && rand() > inc.fill) continue;

        const jitterX = x + gauss() * 0.06;
        const jitterY = y + gauss() * 0.06;
        // Hotter toward the head of the fire.
        const headness = 0.5 + along / Math.max(inc.alongKm, 0.4);
        const frp = Math.max(
          0.8,
          inc.frp * headness * Math.exp(gauss() * 0.45)
        );
        const ti4 = Math.min(367, 318 + frp * 2.1 + gauss() * 4);
        const scan = 0.39 + rand() * 0.12;
        const track = 0.36 + rand() * 0.1;

        rows.push({
          latitude: (inc.lat + jitterY / kmPerDegLat).toFixed(5),
          longitude: (inc.lon + jitterX / kmPerDegLon).toFixed(5),
          bright_ti4: ti4.toFixed(2),
          scan: scan.toFixed(2),
          track: track.toFixed(2),
          acq_date: DATE,
          acq_time: pass.time,
          satellite: pass.satellite,
          instrument: "VIIRS",
          confidence: ti4 > 345 ? "h" : "n",
          version: "2.0NRT",
          bright_ti5: (291 + rand() * 8).toFixed(2),
          frp: frp.toFixed(2),
          daynight: "D",
        });
      }
    }
  }
}

// A few low-confidence hot pixels (e.g. sun glint) that should be filtered.
for (const [lat, lon] of [
  [25.91, 92.41],
  [24.71, 93.62],
]) {
  rows.push({
    latitude: lat.toFixed(5), longitude: lon.toFixed(5), bright_ti4: "309.84",
    scan: "0.44", track: "0.38", acq_date: DATE, acq_time: "0742",
    satellite: "N", instrument: "VIIRS", confidence: "l", version: "2.0NRT",
    bright_ti5: "290.11", frp: "1.12", daynight: "D",
  });
}

const header = Object.keys(rows[0]);
const csv =
  header.join(",") +
  "\n" +
  rows.map(r => header.map(h => r[h]).join(",")).join("\n") +
  "\n";

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function buildContext() {
  const STENCIL_KM = 1;
  const lats = [];
  const lons = [];
  for (const inc of incidents) {
    const dLat = STENCIL_KM / 110.574;
    const dLon = STENCIL_KM / (111.32 * Math.cos((inc.lat * Math.PI) / 180));
    // centre, N, E, S, W
    for (const [la, lo] of [
      [0, 0], [dLat, 0], [0, dLon], [-dLat, 0], [0, -dLon],
    ]) {
      lats.push((inc.lat + la).toFixed(5));
      lons.push((inc.lon + lo).toFixed(5));
    }
  }

  const elev = await fetchJson(
    `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(",")}&longitude=${lons.join(",")}`
  );

  const wx = await fetchJson(
    "https://archive-api.open-meteo.com/v1/archive?" +
      new URLSearchParams({
        latitude: incidents.map(i => i.lat).join(","),
        longitude: incidents.map(i => i.lon).join(","),
        start_date: DATE,
        end_date: "2025-03-19",
        hourly:
          "wind_speed_10m,wind_direction_10m,relative_humidity_2m,temperature_2m",
        timezone: "GMT",
      })
  );
  const wxList = Array.isArray(wx) ? wx : [wx];

  return {
    description:
      "Bundled replay context: ERA5 reanalysis weather (Open-Meteo archive API) and Copernicus 90 m DEM elevations sampled on a 1 km N/E/S/W stencil around each sample incident.",
    date: DATE,
    stencilKm: STENCIL_KM,
    points: incidents.map((inc, k) => ({
      id: inc.id,
      name: inc.name,
      lat: inc.lat,
      lon: inc.lon,
      elevation: elev.elevation.slice(k * 5, k * 5 + 5),
      hourly: wxList[k].hourly,
    })),
  };
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "viirs_sample.csv"), csv);
  const context = await buildContext();
  fs.writeFileSync(
    path.join(OUT_DIR, "context.json"),
    JSON.stringify(context, null, 1)
  );
  console.log(
    `Wrote ${rows.length} detections and context for ${incidents.length} incidents to ${OUT_DIR}`
  );
})().catch(err => {
  console.error(err);
  process.exit(1);
});
