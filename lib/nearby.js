// Nearest emergency services (fire stations and hospitals) for an incident,
// from OpenStreetMap via the Photon geocoder, with phone numbers read from
// the OSM element tags where mappers have recorded them.

const turf = require("@turf/turf");

const PHOTON = "https://photon.komoot.io/api/";
const OSM_API = "https://api.openstreetmap.org/api/0.6";
const USER_AGENT = "DisasterGuardian/1.0 (disaster preparedness prototype)";
const CACHE_MS = 24 * 60 * 60 * 1000;
const RESULTS_PER_TYPE = 3;

const EMERGENCY_NUMBERS = [
  { label: "National emergency", number: "112" },
  { label: "Fire", number: "101" },
  { label: "Ambulance", number: "108" },
];

const cache = new Map();

function parseCoordinate(value, min, max, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw Object.assign(new Error(`${name} must be a number between ${min} and ${max}`), {
      status: 400,
    });
  }
  return n;
}

// Normalise Indian phone numbers for tel: links.
function telNumber(raw) {
  const first = String(raw).split(/[;,/]/)[0].trim();
  if (first.startsWith("+")) return "+" + first.replace(/\D/g, "");
  const digits = first.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.startsWith("0")) return digits;
  if (digits.length >= 8 && digits.length <= 10) return `0${digits}`;
  return digits;
}

async function osmTags(osmType, osmId) {
  const type = { N: "node", W: "way", R: "relation" }[osmType];
  if (!type) return {};
  try {
    const res = await fetch(`${OSM_API}/${type}/${osmId}.json`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return {};
    const json = await res.json();
    return json.elements?.[0]?.tags || {};
  } catch {
    return {};
  }
}

// District / state / country of the incident (Nominatim reverse geocoding).
async function describeLocation(lat, lon) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "jsonv2",
    zoom: "10",
    "accept-language": "en",
  }).toString();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const a = (await res.json()).address || {};
    return {
      locality: a.county || a.city || a.town || a.village || null,
      district: a.state_district || null,
      state: a.state || null,
      country: a.country || null,
      countryCode: (a.country_code || "").toUpperCase() || null,
    };
  } catch {
    return null;
  }
}

async function searchPlaces(amenity, query, lat, lon, countryCode) {
  const url = new URL(PHOTON);
  url.search = new URLSearchParams({
    q: query,
    lat: String(lat),
    lon: String(lon),
    osm_tag: `amenity:${amenity}`,
    limit: "15",
  }).toString();

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);
  const json = await res.json();

  // Prefer services in the incident's own country when any are found.
  let features = json.features || [];
  if (countryCode && features.some(f => f.properties?.countrycode === countryCode)) {
    features = features.filter(f => f.properties?.countrycode === countryCode);
  }

  const places = features
    .map(f => {
      const [plon, plat] = f.geometry.coordinates;
      const p = f.properties || {};
      return {
        name: p.name || (amenity === "hospital" ? "Hospital" : "Fire station"),
        lat: plat,
        lon: plon,
        distanceKm: Math.round(turf.distance([lon, lat], [plon, plat]) * 10) / 10,
        address: [p.street, p.district, p.city, p.state].filter(Boolean).join(", "),
        osmType: p.osm_type,
        osmId: p.osm_id,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, RESULTS_PER_TYPE);

  // Phone numbers are not in the geocoder index; read them from OSM.
  const tags = await Promise.all(places.map(p => osmTags(p.osmType, p.osmId)));
  return places.map((p, i) => {
    const t = tags[i];
    const phone = t["emergency:phone"] || t.phone || t["contact:phone"] || t["contact:mobile"] || null;
    const { osmType, osmId, ...rest } = p;
    return {
      ...rest,
      phone,
      tel: phone ? telNumber(phone) : null,
      website: t.website || t["contact:website"] || null,
      osmUrl: osmType && osmId
        ? `https://www.openstreetmap.org/${{ N: "node", W: "way", R: "relation" }[osmType]}/${osmId}`
        : null,
      directionsUrl:
        `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`,
    };
  });
}

async function findNearbyServices(query) {
  const lat = parseCoordinate(query.lat, -90, 90, "lat");
  const lon = parseCoordinate(query.lon, -180, 180, "lon");
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_MS) return cached.value;

  const warnings = [];
  const place = await describeLocation(lat, lon);
  const country = place?.countryCode || "IN";
  const [fireStations, hospitals] = await Promise.all([
    searchPlaces("fire_station", "fire station", lat, lon, country).catch(error => {
      warnings.push(`Fire station search failed: ${error.message}`);
      return [];
    }),
    searchPlaces("hospital", "hospital", lat, lon, country).catch(error => {
      warnings.push(`Hospital search failed: ${error.message}`);
      return [];
    }),
  ]);

  const value = {
    location: { lat, lon },
    place,
    fireStations,
    hospitals,
    emergencyNumbers: EMERGENCY_NUMBERS,
    searchLinks: {
      fireStations: `https://www.google.com/maps/search/fire+station/@${lat},${lon},11z`,
      hospitals: `https://www.google.com/maps/search/hospital/@${lat},${lon},11z`,
    },
    source: "OpenStreetMap contributors (Photon geocoder, OSM API)",
    warnings,
  };

  // Do not cache failures, so a retry can succeed.
  if (!warnings.length) cache.set(key, { time: Date.now(), value });
  return value;
}

module.exports = { findNearbyServices };
