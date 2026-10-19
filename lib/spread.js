// Wind/humidity/slope-driven fire spread forecast.
//
// Each hour, every perimeter vertex emits an elliptical Huygens wavelet whose
// shape comes from that hour's weather; the new front is the envelope of those
// wavelets (Richards' support-point form, as in FARSITE), unioned with the
// previous perimeter. Rate-of-spread terms:
//   wind      exp(0.05039 * U)            (Canadian FBP ISI wind function)
//   slope     equivalent wind 1.37 km/h per degree upslope (ROS doubles per
//             ~10 deg, McArthur), added to the wind vector (Rothermel-style)
//   humidity  exp(-0.03 * (RH - 40)), clamped 0.25-2.5
//   intensity sqrt(meanFRP / 10), clamped 0.6-2.0
//   shape     L/B = 1 + 8.729 (1 - exp(-0.030 U))^2.155 (FBP)

const turf = require("@turf/turf");
const { outerPolygon, countVertices } = require("./perimeter");
const { cacheGet, cacheSet } = require("./firms");

const BASE_ROS_M_PER_H = 45;
const HORIZONS_H = [1, 3, 6, 12];
const MAX_FRONT_VERTICES = 400;
const STENCIL_KM = 1;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const toRad = d => (d * Math.PI) / 180;
const toDeg = r => (r * 180) / Math.PI;

// ---------- Weather & terrain inputs ----------

function stencil(lat, lon) {
  const dLat = STENCIL_KM / 110.574;
  const dLon = STENCIL_KM / (111.32 * Math.cos(toRad(lat)));
  return [
    [lat, lon],
    [lat + dLat, lon],
    [lat, lon + dLon],
    [lat - dLat, lon],
    [lat, lon - dLon],
  ];
}

// Elevation stencil [c, N, E, S, W] -> slope angle and upslope azimuth.
function terrainFromStencil(elevation, stencilKm = STENCIL_KM) {
  const [c, n, e, s, w] = elevation.map(Number);
  if ([c, n, e, s, w].some(v => !Number.isFinite(v))) {
    return { elevationM: null, slopeDeg: 0, upslopeAzimuth: 0 };
  }
  const dzdx = (e - w) / (2 * stencilKm * 1000);
  const dzdy = (n - s) / (2 * stencilKm * 1000);
  const grad = Math.hypot(dzdx, dzdy);
  return {
    elevationM: c,
    slopeDeg: toDeg(Math.atan(grad)),
    upslopeAzimuth: (toDeg(Math.atan2(dzdx, dzdy)) + 360) % 360,
  };
}

function hourlyToSeries(hourly, startIso, hours) {
  const start = Date.parse(startIso);
  const times = hourly.time.map(t => Date.parse(t.endsWith("Z") ? t : `${t}Z`));
  let i0 = times.findIndex(t => t >= start);
  if (i0 < 0) i0 = Math.max(0, times.length - hours);

  const series = [];
  for (let h = 0; h < hours; h++) {
    const i = Math.min(times.length - 1, i0 + h);
    series.push({
      time: new Date(times[i]).toISOString(),
      windKmh: Number(hourly.wind_speed_10m[i]) || 0,
      windFromDeg: Number(hourly.wind_direction_10m[i]) || 0,
      rh: Number(hourly.relative_humidity_2m[i] ?? 50),
      tempC:
        hourly.temperature_2m?.[i] == null
          ? null
          : Number(hourly.temperature_2m[i]),
    });
  }
  return series;
}

// Live inputs for many incidents in two batched Open-Meteo calls.
async function fetchLiveInputs(centroids, startIso) {
  const out = centroids.map(() => null);
  const missing = [];
  centroids.forEach(([lat, lon], k) => {
    const hit = cacheGet(`wx|${lat.toFixed(2)},${lon.toFixed(2)}|${startIso.slice(0, 13)}`);
    if (hit) out[k] = hit;
    else missing.push(k);
  });
  if (!missing.length) return { inputs: out, cache: "hit" };

  const lats = missing.map(k => centroids[k][0].toFixed(4));
  const lons = missing.map(k => centroids[k][1].toFixed(4));

  const wxUrl =
    "https://api.open-meteo.com/v1/forecast?" +
    new URLSearchParams({
      latitude: lats.join(","),
      longitude: lons.join(","),
      hourly:
        "wind_speed_10m,wind_direction_10m,relative_humidity_2m,temperature_2m",
      past_hours: "2",
      forecast_hours: "16",
      timezone: "GMT",
    });

  // The elevation API accepts at most 100 coordinates per request.
  const stencilPts = missing.flatMap(k => stencil(...centroids[k]));
  const elevChunks = [];
  for (let i = 0; i < stencilPts.length; i += 100) {
    const chunk = stencilPts.slice(i, i + 100);
    elevChunks.push(
      "https://api.open-meteo.com/v1/elevation?" +
        new URLSearchParams({
          latitude: chunk.map(p => p[0].toFixed(5)).join(","),
          longitude: chunk.map(p => p[1].toFixed(5)).join(","),
        })
    );
  }

  const getJson = async url => {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) {
      throw new Error(`Open-Meteo returned HTTP ${res.status}`);
    }
    return res.json();
  };
  const [wx, ...elevParts] = await Promise.all([
    getJson(wxUrl),
    ...elevChunks.map(getJson),
  ]);
  const elev = { elevation: elevParts.flatMap(p => p.elevation) };
  const wxList = Array.isArray(wx) ? wx : [wx];

  missing.forEach((k, j) => {
    const [lat, lon] = centroids[k];
    const value = {
      source: "Open-Meteo forecast + Copernicus DEM",
      series: hourlyToSeries(wxList[j].hourly, startIso, 12),
      terrain: terrainFromStencil(elev.elevation.slice(j * 5, j * 5 + 5)),
    };
    cacheSet(`wx|${lat.toFixed(2)},${lon.toFixed(2)}|${startIso.slice(0, 13)}`, value);
    out[k] = value;
  });
  return { inputs: out, cache: "miss" };
}

// Replay inputs: nearest bundled context point (within 25 km).
function sampleInputs(centroid, context, startIso) {
  let best = null;
  let bestKm = Infinity;
  for (const p of context.points) {
    const km = turf.distance([centroid[1], centroid[0]], [p.lon, p.lat]);
    if (km < bestKm) {
      best = p;
      bestKm = km;
    }
  }
  if (!best || bestKm > 25) return defaultInputs(startIso);
  return {
    source: "ERA5 reanalysis (bundled) + Copernicus DEM",
    series: hourlyToSeries(best.hourly, startIso, 12),
    terrain: terrainFromStencil(best.elevation, context.stencilKm),
  };
}

// Used only when weather cannot be fetched; flagged in the response.
function defaultInputs(startIso) {
  const start = Date.parse(startIso);
  return {
    source: "Fallback climatology (weather unavailable)",
    degraded: true,
    series: Array.from({ length: 12 }, (_, h) => ({
      time: new Date(start + h * 3600e3).toISOString(),
      windKmh: 10,
      windFromDeg: 225,
      rh: 55,
      tempC: null,
    })),
    terrain: { elevationM: null, slopeDeg: 0, upslopeAzimuth: 0 },
  };
}

// ---------- Spread model ----------

function spreadRates(wx, terrain, frpMean) {
  const heading = toRad((wx.windFromDeg + 180) % 360);
  const slope = Math.min(terrain.slopeDeg, 40);
  const slopeEq = 1.37 * slope;
  const up = toRad(terrain.upslopeAzimuth);

  const ve = wx.windKmh * Math.sin(heading) + slopeEq * Math.sin(up);
  const vn = wx.windKmh * Math.cos(heading) + slopeEq * Math.cos(up);
  const effWind = Math.hypot(ve, vn);

  const fWind = Math.exp(0.05039 * effWind);
  const fHumidity = clamp(Math.exp(-0.03 * (wx.rh - 40)), 0.25, 2.5);
  const fIntensity = clamp(Math.sqrt(frpMean / 10), 0.6, 2.0);

  const head = BASE_ROS_M_PER_H * fWind * fHumidity * fIntensity;
  const lb = 1 + 8.729 * (1 - Math.exp(-0.03 * effWind)) ** 2.155;
  const root = Math.sqrt(Math.max(lb * lb - 1, 0));
  const back = head * ((lb - root) / (lb + root));

  return {
    headRos: head,
    backRos: back,
    flankRos: (head + back) / (2 * lb),
    lb,
    headingDeg: (toDeg(Math.atan2(ve, vn)) + 360) % 360,
    effWindKmh: effWind,
  };
}

function ringsOf(geometry) {
  return geometry.type === "Polygon"
    ? [geometry.coordinates[0]]
    : geometry.coordinates.map(p => p[0]);
}

// Huygens envelope via Richards (1990): a vertex with outward normal n moves
// to the point of its wavelet ellipse furthest along n (the support point).
function makeSupport(rates) {
  const a = (rates.headRos + rates.backRos) / 2; // semi-major (m per hour)
  const b = a / rates.lb; // semi-minor
  const c = a - rates.backRos; // ellipse centre ahead of the ignition point
  const h = toRad(rates.headingDeg);
  const u = [Math.sin(h), Math.cos(h)]; // heading (east, north)
  const p = [Math.cos(h), -Math.sin(h)]; // perpendicular

  return ([nx, ny]) => {
    const nu = nx * u[0] + ny * u[1];
    const np = nx * p[0] + ny * p[1];
    const d = Math.sqrt(a * a * nu * nu + b * b * np * np) || 1;
    const along = c + (a * a * nu) / d;
    const across = (b * b * np) / d;
    return [along * u[0] + across * p[0], along * u[1] + across * p[1]];
  };
}

function stepFront(front, rates, lat0) {
  const mPerDegLat = 110574;
  const mPerDegLon = 111320 * Math.cos(toRad(lat0));
  const support = makeSupport(rates);
  const pieces = [front];

  for (const ring of ringsOf(front.geometry)) {
    // Work in local metres, counter-clockwise, without the closing vertex.
    let pts = ring
      .slice(0, -1)
      .map(([lon, lat]) => [lon * mPerDegLon, lat * mPerDegLat]);
    if (pts.length < 3) continue;
    const signedArea = pts.reduce((s, [x1, y1], i) => {
      const [x2, y2] = pts[(i + 1) % pts.length];
      return s + (x1 * y2 - x2 * y1);
    }, 0);
    if (signedArea < 0) pts = pts.reverse();

    const n = pts.length;
    const edgeNormal = i => {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % n];
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      return [(y2 - y1) / len, -(x2 - x1) / len]; // outward for CCW
    };

    const moved = [];
    for (let i = 0; i < n; i++) {
      const n1 = edgeNormal((i - 1 + n) % n);
      const n2 = edgeNormal(i);
      const a1 = Math.atan2(n1[1], n1[0]);
      let turn = Math.atan2(n2[1], n2[0]) - a1;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      // Convex corners fan the normal round so the corner rounds out.
      const steps = turn > 0 ? Math.min(8, Math.ceil(turn / toRad(20))) : 0;
      const normals = steps
        ? Array.from({ length: steps + 1 }, (_, k) => {
            const ang = a1 + (turn * k) / steps;
            return [Math.cos(ang), Math.sin(ang)];
          })
        : [[(n1[0] + n2[0]) / 2, (n1[1] + n2[1]) / 2]].map(([x, y]) => {
            const len = Math.hypot(x, y) || 1;
            return [x / len, y / len];
          });
      for (const nrm of normals) {
        const [dx, dy] = support(nrm);
        moved.push([
          (pts[i][0] + dx) / mPerDegLon,
          (pts[i][1] + dy) / mPerDegLat,
        ]);
      }
    }
    moved.push(moved[0]);

    // Concave regions can fold into swallowtails; split them into simple
    // pieces and let the union resolve the outer front.
    try {
      pieces.push(...turf.unkinkPolygon(turf.polygon([moved])).features);
    } catch {
      pieces.push(turf.convex(turf.multiPoint(moved)));
    }
  }

  const merged = turf.union(turf.featureCollection(pieces)) || front;
  const next = turf.simplify(outerPolygon(merged.geometry), {
    tolerance: 0.00008, // ~8 m, keeps vertex count bounded between steps
    highQuality: false,
  });
  return countVertices(next.geometry) > MAX_FRONT_VERTICES
    ? turf.simplify(next, { tolerance: 0.0003, highQuality: false })
    : next;
}

// Forecast isochrones for one incident.
function forecastSpread(perimeter, inputs, frpMean) {
  const lat0 = turf.centroid(perimeter).geometry.coordinates[1];
  const isochrones = [];
  const hourly = [];
  let front = perimeter;

  for (let hour = 1; hour <= Math.max(...HORIZONS_H); hour++) {
    const wx = inputs.series[hour - 1];
    const rates = spreadRates(wx, inputs.terrain, frpMean);
    hourly.push({ hour, ...wx, ...rates });
    front = stepFront(front, rates, lat0);

    if (HORIZONS_H.includes(hour)) {
      isochrones.push({
        hours: hour,
        validAt: new Date(Date.parse(wx.time) + 3600e3).toISOString(),
        polygon: front,
        areaKm2: turf.area(front) / 1e6,
        vertices: countVertices(front.geometry),
      });
    }
  }
  return { isochrones, hourly };
}

module.exports = {
  fetchLiveInputs,
  sampleInputs,
  defaultInputs,
  forecastSpread,
  spreadRates,
  HORIZONS_H,
  BASE_ROS_M_PER_H,
};
