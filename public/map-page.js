
// Base map, state selection and state-capital weather for the Disaster Map.
// Fires a "statechange" event that fire-intel.js listens to.

const INDIA_BOUNDS = [[6.5, 68], [35.7, 97.5]];
const STATE_STORAGE_KEY = "dg-state";

const map = L.map("disasterMap").fitBounds(INDIA_BOUNDS);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const stateSelect = document.getElementById("stateSelect");
const capitalLayer = L.layerGroup().addTo(map);
let statesList = [];
let selectedMarker = null;

function currentState() {
  return statesList.find(s => s.name === stateSelect.value) || null;
}

function stateBounds(state) {
  const [w, s, e, n] = state.bbox;
  return L.latLngBounds([s, w], [n, e]);
}

function rememberState(name) {
  try {
    localStorage.setItem(STATE_STORAGE_KEY, name);
  } catch {
    // Storage can be unavailable (private mode); the default state is used.
  }
}

function savedState() {
  try {
    return localStorage.getItem(STATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function drawCapitals() {
  capitalLayer.clearLayers();
  for (const s of statesList) {
    L.circleMarker([s.lat, s.lon], {
      radius: 5,
      color: "#ffffff",
      weight: 1.5,
      fillColor: "#3984c5",
      fillOpacity: 1
    })
      .bindPopup(`<strong>${s.capital}</strong><br>Capital of ${s.name}`)
      .on("click", () => {
        stateSelect.value = s.name;
        selectState();
      })
      .addTo(capitalLayer);
  }
}

function updateAuthorityLink(state) {
  const link = document.getElementById("authorityLink");
  if (state.name === "Assam") {
    link.href = "https://asdma.assam.gov.in/";
    link.textContent = "Assam State Disaster Management Authority ↗";
  } else {
    link.href = "https://ndma.gov.in/";
    link.textContent = "National Disaster Management Authority ↗";
  }
}

async function loadStateWeather() {
  const state = currentState();
  if (!state) return;

  document.getElementById("selectedCity").textContent = state.name;
  document.getElementById("selectedPlace").textContent =
    `Weather at ${state.capital}, the ${state.type === "ut" ? "UT" : "state"} capital`;
  document.getElementById("mapUpdated").textContent = "Loading weather data…";

  if (selectedMarker) {
    map.removeLayer(selectedMarker);
  }

  selectedMarker = L.circleMarker([state.lat, state.lon], {
    radius: 11,
    color: "#ffffff",
    weight: 3,
    fillColor: "#e69a42",
    fillOpacity: 1
  }).addTo(map);

  selectedMarker.bindPopup(
    `<strong>${state.capital}</strong><br>Selected: ${state.name}`
  );

  try {
    const response = await fetch(
      `/api/weather?state=${encodeURIComponent(state.name)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Weather request failed");
    }

    const times = data.hourly.time || [];
    const now = new Date();

    // Forecast times are IST without an offset; parse them as IST.
    let index = times.findIndex(
      time => new Date(`${time}:00+05:30`) > now - 60 * 60 * 1000
    );
    if (index < 0) index = 0;

    const temperature = data.hourly.temperature_2m?.[index];
    const rain = data.hourly.precipitation_probability?.[index];
    const wind = data.hourly.wind_speed_10m?.[index];

    document.getElementById("mapTemp").textContent =
      temperature == null ? "Unavailable" : `${temperature} °C`;

    document.getElementById("mapRain").textContent =
      rain == null ? "Unavailable" : `${rain}%`;

    document.getElementById("mapWind").textContent =
      wind == null ? "Unavailable" : `${wind} km/h`;

    document.getElementById("mapUpdated").textContent =
      `Forecast for ${data.place} from ${data.source}. Retrieved ${new Date(
        data.fetchedAt
      ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`;
  } catch (error) {
    document.getElementById("mapTemp").textContent = "Unavailable";
    document.getElementById("mapRain").textContent = "Unavailable";
    document.getElementById("mapWind").textContent = "Unavailable";
    document.getElementById("mapUpdated").textContent =
      "Weather could not load. Check your connection and try again.";

    console.error("Map weather error:", error);
  }
}

function selectState() {
  const state = currentState();
  if (!state) return;

  rememberState(state.name);
  updateAuthorityLink(state);
  map.flyToBounds(stateBounds(state), { padding: [20, 20], duration: 0.8 });
  loadStateWeather();
  document.dispatchEvent(new CustomEvent("statechange", { detail: state }));
}

async function initStates() {
  try {
    statesList = await loadStateOptions(stateSelect, savedState());
    drawCapitals();
    selectState();
  } catch (error) {
    console.error("States error:", error);
    document.getElementById("mapUpdated").textContent =
      "The list of states could not load. Refresh the page to try again.";
  }
}

stateSelect.addEventListener("change", selectState);

document.getElementById("refreshMap").addEventListener(
  "click",
  () => loadStateWeather()
);

initStates();
