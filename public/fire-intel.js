// Wildfire + flood intelligence layers for the disaster map (uses `map` and
// the "statechange" event from map-page.js), and the incident report dialog.

const HORIZONS = [0, 1, 3, 6, 12];
const BAND_STYLE = {
  1: { color: "#e8633a", fillColor: "#ff7b4f" },
  3: { color: "#e88a2e", fillColor: "#ff9f43" },
  6: { color: "#e0a635", fillColor: "#ffc24b" },
  12: { color: "#d8b75a", fillColor: "#ffe08a" },
};
const FLOOD_STYLE = { color: "#1d4ed8", fillColor: "#3b82f6", weight: 1.5, fillOpacity: 0.45 };
const OUTLOOK_PILL = { Rising: "danger", Stable: "warning", Receding: "", Unknown: "" };

const fireState = {
  state: null,
  fires: null,
  floods: null,
  fireError: null,
  floodError: null,
  selectedId: null,
  filter: "all",
  playTimer: null,
  loadToken: 0,
};

const fireLayers = {
  bands: L.layerGroup().addTo(map),
  perimeters: L.layerGroup().addTo(map),
  detections: L.layerGroup().addTo(map),
};
const floodLayers = {
  zones: L.layerGroup().addTo(map),
  markers: L.layerGroup().addTo(map),
};
const serviceLayer = L.layerGroup().addTo(map);

const el = id => document.getElementById(id);

const escapeHtml = value =>
  String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

const formatBytes = bytes =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

const formatTime = iso =>
  new Date(iso).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

const formatDate = iso =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const compass = deg =>
  ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];

const coordText = inc =>
  `${inc.centroid[1].toFixed(5)}, ${inc.centroid[0].toFixed(5)}`;

function nearestText(inc) {
  const c = inc.nearestCity;
  return c ? `${c.km} km ${c.direction} of ${c.name}` : "Location unknown";
}

function selectedHours() {
  return HORIZONS[Number(el("forecastSlider").value)];
}

function fireQuery() {
  return new URLSearchParams({
    state: fireState.state?.name || "",
    mode: el("fireMode").value,
  }).toString();
}

function floodQuery() {
  return new URLSearchParams({
    state: fireState.state?.name || "",
    date: el("floodDate").value,
  }).toString();
}

function allIncidents() {
  const fires = (fireState.fires?.incidents || []).map(inc => ({ ...inc, kind: "fire" }));
  const floods = (fireState.floods?.incidents || []).map(inc => ({ ...inc, kind: "flood" }));
  return [...fires, ...floods];
}

function findIncident(id) {
  return allIncidents().find(inc => inc.id === id) || null;
}

// ---------- Map layers ----------

function drawBands() {
  const hours = selectedHours();
  fireLayers.bands.clearLayers();

  el("forecastLabel").textContent = hours ? `+${hours} h` : "Now";
  const start = fireState.fires?.forecastStart;
  el("forecastValid").textContent = start
    ? `Valid ${formatTime(new Date(Date.parse(start) + hours * 3600e3))}`
    : "";

  if (!fireState.fires || !hours) return;

  // Outermost band first so inner bands draw on top.
  const visible = HORIZONS.filter(h => h && h <= hours).reverse();
  for (const inc of fireState.fires.incidents) {
    for (const h of visible) {
      const iso = inc.forecast?.isochrones.find(i => i.hours === h);
      if (!iso) continue;
      L.geoJSON(iso.geometry, {
        style: {
          ...BAND_STYLE[h],
          weight: 1.5,
          dashArray: "4 4",
          fillOpacity: 0.28,
        },
      })
        .bindPopup(
          `<strong>${escapeHtml(inc.id)} · +${h} h</strong><br>` +
            `Forecast area ${iso.areaKm2} km²<br>` +
            `Valid ${escapeHtml(formatTime(iso.validAt))}`
        )
        .addTo(fireLayers.bands);
    }
  }
}

function reportButtonHtml(inc) {
  return `<br><button type="button" class="popup-report" data-report="${escapeHtml(inc.id)}">Report to nearest services</button>`;
}

function drawFires() {
  fireLayers.perimeters.clearLayers();
  fireLayers.detections.clearLayers();
  const result = fireState.fires;
  if (!result) return;

  for (const inc of result.incidents) {
    const now = inc.forecast?.now;
    L.geoJSON(inc.perimeter, {
      style: {
        color: "#d63a45",
        weight: 2,
        fillColor: "#ff5d67",
        fillOpacity: 0.4,
      },
    })
      .bindPopup(
        `<strong>Wildfire ${escapeHtml(inc.id)}</strong><br>` +
          `${escapeHtml(nearestText(inc))}<br>` +
          `${inc.detections} detections · ${inc.areaKm2} km²<br>` +
          (now
            ? `Head fire → ${now.heading} at ${now.headRosMh} m/h<br>`
            : "") +
          `Centre ${coordText(inc)}` +
          reportButtonHtml(inc)
      )
      .on("click", () => selectIncident(inc.id, false))
      .addTo(fireLayers.perimeters);
  }

  for (const f of result.detections.features) {
    const [lon, lat] = f.geometry.coordinates;
    L.circleMarker([lat, lon], {
      radius: Math.min(6, 2.5 + Math.sqrt(f.properties.frp) / 2),
      color: "#ffffff",
      weight: 1,
      fillColor: "#b3122e",
      fillOpacity: 0.9,
    })
      .bindPopup(
        `<strong>VIIRS fire detection</strong><br>` +
          `FRP ${f.properties.frp} MW · confidence ${escapeHtml(f.properties.confidence)}<br>` +
          `${escapeHtml(formatTime(f.properties.acquired))}`
      )
      .addTo(fireLayers.detections);
  }
}

function floodPopup(inc) {
  const o = inc.outlook || {};
  return (
    `<strong>Flood ${escapeHtml(inc.id)}</strong><br>` +
    `${escapeHtml(nearestText(inc))}<br>` +
    `${inc.areaKm2} km² flooded (${inc.pixels} pixels)<br>` +
    `12 h outlook: ${escapeHtml(o.status || "Unknown")}` +
    (o.rain12hMm != null ? ` · rain ${o.rain12hMm} mm` : "") +
    (o.dischargeChangePct != null ? ` · river ${o.dischargeChangePct > 0 ? "+" : ""}${o.dischargeChangePct}%` : "") +
    `<br>Centre ${coordText(inc)}` +
    reportButtonHtml(inc)
  );
}

function drawFloods() {
  floodLayers.zones.clearLayers();
  floodLayers.markers.clearLayers();
  const result = fireState.floods;
  if (!result) return;

  for (const inc of result.incidents) {
    L.geoJSON(inc.perimeter, { style: FLOOD_STYLE })
      .bindPopup(floodPopup(inc))
      .on("click", () => selectIncident(inc.id, false))
      .addTo(floodLayers.zones);

    // Zones are small at state zoom; a marker keeps every flood visible.
    L.circleMarker([inc.centroid[1], inc.centroid[0]], {
      radius: Math.min(9, 4 + Math.sqrt(inc.areaKm2)),
      color: "#ffffff",
      weight: 1.5,
      fillColor: "#1d4ed8",
      fillOpacity: 0.85,
    })
      .bindPopup(floodPopup(inc))
      .on("click", () => selectIncident(inc.id, false))
      .addTo(floodLayers.markers);
  }
}

function applyLayerToggles() {
  const showFires = el("toggleFires").checked;
  const showFloods = el("toggleFloods").checked;
  for (const layer of Object.values(fireLayers)) {
    showFires ? layer.addTo(map) : map.removeLayer(layer);
  }
  for (const layer of Object.values(floodLayers)) {
    showFloods ? layer.addTo(map) : map.removeLayer(layer);
  }
}

function incidentBounds(inc) {
  const geometry =
    inc.kind === "fire"
      ? inc.forecast?.isochrones.at(-1)?.geometry || inc.perimeter
      : inc.perimeter;
  return L.geoJSON(geometry).getBounds();
}

// ---------- Panels ----------

function fireItemHtml(inc) {
  const fc = inc.forecast;
  const now = fc?.now;
  const pill = !now
    ? '<span class="status-pill">Perimeter only</span>'
    : `<span class="status-pill ${
        now.headRosMh >= 150 ? "danger" : now.headRosMh >= 60 ? "warning" : ""
      }">Head → ${now.heading} · ${now.headRosMh} m/h</span>`;
  const area12 = fc?.isochrones.at(-1)?.areaKm2;
  const weather = now
    ? `Wind ${Math.round(now.windKmh)} km/h from ${compass(now.windFromDeg)} · ` +
      `RH ${Math.round(now.rh)}% · slope ${fc.terrain.slopeDeg}°`
    : "Outside forecast limit";

  return `
    <span class="incident-top">
      <span><span class="type-badge fire">Wildfire</span><strong>${escapeHtml(inc.id)}</strong></span>${pill}
    </span>
    <span class="incident-meta">${escapeHtml(nearestText(inc))} ·
      ${inc.detections} detection${inc.detections === 1 ? "" : "s"} ·
      ${inc.areaKm2} km²${area12 != null ? ` → ${area12} km² at +12 h` : ""}</span>
    <span class="incident-meta">${escapeHtml(weather)}</span>
    <span class="incident-coords">${coordText(inc)}</span>`;
}

function floodItemHtml(inc) {
  const o = inc.outlook || {};
  const pill = `<span class="status-pill ${OUTLOOK_PILL[o.status] ?? ""}">12 h outlook: ${escapeHtml(o.status || "Unknown")}</span>`;
  const drivers = [
    o.rain12hMm != null ? `Rain next 12 h ${o.rain12hMm} mm` : null,
    o.dischargeChangePct != null
      ? `river flow ${o.dischargeChangePct > 0 ? "+" : ""}${o.dischargeChangePct}% in 24 h`
      : "no major river nearby",
  ].filter(Boolean).join(" · ");

  return `
    <span class="incident-top">
      <span><span class="type-badge flood">Flood</span><strong>${escapeHtml(inc.id)}</strong></span>${pill}
    </span>
    <span class="incident-meta">${escapeHtml(nearestText(inc))} ·
      ${inc.areaKm2} km² flooded</span>
    <span class="incident-meta">${escapeHtml(drivers)}</span>
    <span class="incident-coords">${coordText(inc)}</span>`;
}

function renderIncidents() {
  const list = el("incidentList");
  const incidents = allIncidents();
  const fireCount = incidents.filter(i => i.kind === "fire").length;
  const floodCount = incidents.length - fireCount;

  el("incidentCount").textContent =
    `${incidents.length} INCIDENT${incidents.length === 1 ? "" : "S"}`;
  el("countFire").textContent = fireCount;
  el("countFlood").textContent = floodCount;

  const shown = incidents.filter(
    inc => fireState.filter === "all" || inc.kind === fireState.filter
  );

  const errors = [
    fireState.fireError && fireState.filter !== "flood"
      ? `Wildfire data could not load: ${fireState.fireError}`
      : null,
    fireState.floodError && fireState.filter !== "fire"
      ? `Flood data could not load: ${fireState.floodError}`
      : null,
  ].filter(Boolean);

  const errorHtml = errors
    .map(e => `<li class="incident-empty incident-error">${escapeHtml(e)}</li>`)
    .join("");

  if (!shown.length) {
    const what = { all: "wildfire or flood", fire: "wildfire", flood: "flood" }[fireState.filter];
    list.innerHTML =
      errorHtml ||
      `<li class="incident-empty">No ${what} detections in ${escapeHtml(fireState.state?.name || "this area")}.</li>`;
    return;
  }

  list.innerHTML =
    errorHtml +
    shown
      .map(
        inc => `<li class="incident-row">
          <button type="button" class="incident-item${
            inc.id === fireState.selectedId ? " active" : ""
          }" data-id="${escapeHtml(inc.id)}">
            ${inc.kind === "fire" ? fireItemHtml(inc) : floodItemHtml(inc)}
          </button>
          <button type="button" class="report-button" data-report="${escapeHtml(inc.id)}">
            Report
          </button>
        </li>`
      )
      .join("");
}

function renderStats() {
  const fires = fireState.fires;
  const floods = fireState.floods;
  const fs = fires?.stats;
  const ls = floods?.stats;
  const state = fireState.state?.name || "";

  const tags = [];
  if (fires) tags.push(fires.mode === "live" ? "LIVE FIRMS" : "FIRE REPLAY");
  if (floods) tags.push("VIIRS FLOOD");
  el("fireModeTag").textContent = tags.length ? tags.join(" · ") : "UNAVAILABLE";

  // A state's map rectangle also covers border areas of its neighbours.
  const parts = [state ? `${state} and nearby areas` : ""];
  if (fires) {
    parts.push(
      fires.mode === "live"
        ? `fires from the last ${fires.days} day${fires.days === 1 ? "" : "s"}, forecast from ${formatTime(fires.forecastStart)}`
        : "fires: replayed North-east India sample"
    );
  }
  if (floods) parts.push(`flood map of ${formatDate(floods.date)}`);
  el("fireSubtitle").textContent = parts.join(" · ");

  el("fireSource").textContent = [fires?.source, floods?.source]
    .filter(Boolean)
    .join(" + ") || "No data sources responded";

  el("statDetections").textContent = fs ? `${fs.detectionsUsed} of ${fs.detectionsRaw}` : "–";
  el("statArea").textContent = fs ? `${fs.areaKm2} → ${fs.area12hKm2} km²` : "–";
  el("statFloodArea").textContent = ls ? `${ls.floodAreaKm2} km²` : "–";
  el("statCloud").textContent = ls ? `${ls.insufficientDataPct}% of area` : "–";
  el("statCloud").title = ls
    ? "Share of the area the satellite could not see (cloud or missing data); floods there cannot be detected."
    : "";

  const outBytes = (fs?.outputBytes || 0) + (ls?.outputBytes || 0);
  const rawBytes = (fs?.rawBytes || 0) + (ls?.rawBytes || 0);
  el("statPayload").textContent = outBytes ? formatBytes(outBytes) : "–";
  el("statPayload").title =
    `Raw satellite input ${formatBytes(rawBytes)}` +
    (fs ? ` · fires gzip ${formatBytes(fs.outputGzipBytes)}` : "") +
    (ls ? ` · floods gzip ${formatBytes(ls.outputGzipBytes)}` : "");

  el("statLatency").textContent = [
    fs ? `fires ${fs.timings.totalMs} ms` : null,
    ls ? `floods ${ls.timings.totalMs} ms` : null,
  ].filter(Boolean).join(" · ") || "–";

  const notes = [];
  if (fs) {
    notes.push(
      `Wildfires: raw feed ${formatBytes(fs.rawBytes)} → ${formatBytes(fs.outputBytes)} ` +
        `(${formatBytes(fs.outputGzipBytes)} gzip), ${fs.vertices}/${fs.verticesRaw} vertices kept.`
    );
    if (fires.reason && fires.requestedMode !== "replay") notes.push(fires.reason + ".");
    if (fires.warnings.length) notes.push(fires.warnings.join(" "));
  }
  if (ls) {
    notes.push(
      `Floods: ${formatBytes(ls.rawBytes)} satellite image (${ls.raster.width}×${ls.raster.height} px, ` +
        `~${floods.resolutionKm} km/px) → ${formatBytes(ls.outputBytes)} of perimeters ` +
        `(${formatBytes(ls.outputGzipBytes)} gzip); ${ls.zones} flood zones found.`
    );
  }
  if (fireState.fireError) notes.push(`Wildfires unavailable: ${fireState.fireError}`);
  if (fireState.floodError) notes.push(`Floods unavailable: ${fireState.floodError}`);
  el("fireUpdated").textContent = notes.join(" ");

  el("downloadGeojson").href = `/api/fires.geojson?${fireQuery()}`;
  el("downloadKml").href = `/api/fires.kml?${fireQuery()}`;
  el("downloadFloods").href = `/api/floods.geojson?${floodQuery()}`;
}

function selectIncident(id, zoom = true) {
  fireState.selectedId = id;
  document.querySelectorAll(".incident-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.id === id);
  });
  const inc = findIncident(id);
  if (inc && zoom) {
    map.flyToBounds(incidentBounds(inc), { padding: [40, 40], maxZoom: 13 });
  }
}

// ---------- Data ----------

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

async function loadIncidents() {
  if (!fireState.state) return;
  const token = ++fireState.loadToken;
  const button = el("runFires");
  button.disabled = true;
  el("fireUpdated").textContent = `Running detection pipeline for ${fireState.state.name}…`;
  el("incidentList").innerHTML =
    `<li class="incident-empty">Loading satellite detections for ${escapeHtml(fireState.state.name)}…</li>`;

  const [fires, floods] = await Promise.allSettled([
    fetchJson(`/api/fires?${fireQuery()}`),
    fetchJson(`/api/floods?${floodQuery()}`),
  ]);

  // Ignore results from an older request if the user switched state meanwhile.
  if (token !== fireState.loadToken) return;

  fireState.fires = fires.status === "fulfilled" ? fires.value : null;
  fireState.fireError = fires.status === "rejected" ? fires.reason.message : null;
  fireState.floods = floods.status === "fulfilled" ? floods.value : null;
  fireState.floodError = floods.status === "rejected" ? floods.reason.message : null;
  if (fireState.fireError) console.error("Fire pipeline error:", fireState.fireError);
  if (fireState.floodError) console.error("Flood pipeline error:", fireState.floodError);

  fireState.selectedId = null;
  serviceLayer.clearLayers();
  drawFires();
  drawBands();
  drawFloods();
  renderIncidents();
  renderStats();
  button.disabled = false;
}

function togglePlay() {
  const slider = el("forecastSlider");
  const button = el("forecastPlay");
  if (fireState.playTimer) {
    clearInterval(fireState.playTimer);
    fireState.playTimer = null;
    button.textContent = "Play ▶";
    return;
  }
  slider.value = 0;
  drawBands();
  button.textContent = "Pause ❚❚";
  fireState.playTimer = setInterval(() => {
    if (Number(slider.value) >= HORIZONS.length - 1) {
      togglePlay();
      return;
    }
    slider.value = Number(slider.value) + 1;
    drawBands();
  }, 900);
}

// Last 7 days of flood imagery; yesterday is the latest complete composite.
function fillFloodDates() {
  const select = el("floodDate");
  const options = [];
  for (let back = 1; back <= 7; back++) {
    const iso = new Date(Date.now() - back * 864e5).toISOString().slice(0, 10);
    const option = document.createElement("option");
    option.value = iso;
    option.textContent = formatDate(iso) + (back === 1 ? " (latest)" : "");
    options.push(option);
  }
  select.replaceChildren(...options);
}

// ---------- Report dialog ----------

const reportState = { incident: null, services: null };

const REPORT_NOTICE =
  "DisasterGuardian does not alert services automatically. Use the buttons " +
  "below to call or message them yourself. Satellite detections can be false " +
  "alarms, so say only what you can confirm.";

function placeText(place) {
  if (!place) return "";
  return [place.locality, place.district, place.state, place.country]
    .filter((part, i, all) => part && all.indexOf(part) === i)
    .join(", ");
}

function reportSummaryText(inc, services) {
  const place = placeText(services?.place);
  return [place || nearestText(inc), coordText(inc), `${inc.areaKm2} km²`].join(" · ");
}

function reportMessage(inc, services) {
  const [lon, lat] = inc.centroid;
  const lines = [
    "DISASTER REPORT",
    `Type: ${inc.kind === "fire" ? "Wildfire" : "Flood"} (satellite detection, please verify)`,
    `Incident ID: ${inc.id}`,
    `Location: ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    `Map: https://maps.google.com/?q=${lat.toFixed(5)},${lon.toFixed(5)}`,
  ];
  const place = placeText(services?.place);
  if (place) lines.push(`Place: ${place}`);
  lines.push(`Near: ${nearestText(inc)}`);
  if (inc.kind === "fire") {
    const now = inc.forecast?.now;
    lines.push(
      `Detected: NASA FIRMS VIIRS, last seen ${formatTime(inc.lastSeen)}`,
      `Burning area: about ${inc.areaKm2} km² (${inc.detections} detections)`
    );
    if (now) {
      lines.push(
        `Spread: heading ${now.heading} at about ${now.headRosMh} m/h; wind ${Math.round(now.windKmh)} km/h from ${compass(now.windFromDeg)}`
      );
    }
  } else {
    const o = inc.outlook || {};
    lines.push(
      `Detected: NASA VIIRS flood map of ${formatDate(fireState.floods?.date)}`,
      `Flooded area: about ${inc.areaKm2} km²`,
      `12-hour outlook: ${o.status || "Unknown"}` +
        (o.rain12hMm != null ? `, rain ${o.rain12hMm} mm expected` : "")
    );
  }
  const station = services?.fireStations?.[0];
  const hospital = services?.hospitals?.[0];
  if (station) lines.push(`Nearest fire station on record: ${station.name} (${station.distanceKm} km)`);
  if (hospital) lines.push(`Nearest hospital on record: ${hospital.name} (${hospital.distanceKm} km)`);
  lines.push("Sent via DisasterGuardian.");
  return lines.join("\n");
}

function serviceHtml(place, kind) {
  const message = encodeURIComponent(el("reportText").value);
  const actions = [
    place.tel
      ? `<a class="service-action" href="tel:${escapeHtml(place.tel)}">Call ${escapeHtml(place.phone)}</a>`
      : `<a class="service-action" href="tel:${kind === "fire" ? "101" : "108"}">No phone listed · call ${kind === "fire" ? "101" : "108"}</a>`,
    place.tel
      ? `<a class="service-action" href="sms:${escapeHtml(place.tel)}?&body=${message}">Send SMS report</a>`
      : "",
    `<a class="service-action" href="${escapeHtml(place.directionsUrl)}" target="_blank" rel="noopener noreferrer">Directions ↗</a>`,
  ].filter(Boolean).join("");

  return `<li>
    <strong>${escapeHtml(place.name)}</strong>
    <span class="service-meta">${place.distanceKm} km away${place.address ? ` · ${escapeHtml(place.address)}` : ""}</span>
    <span class="service-actions">${actions}</span>
  </li>`;
}

function renderServices() {
  const services = reportState.services;
  if (!services) return;
  const fireList = services.fireStations || [];
  const hospitalList = services.hospitals || [];

  el("reportFire").innerHTML = fireList.length
    ? fireList.map(p => serviceHtml(p, "fire")).join("")
    : '<li class="service-empty">No fire stations found in OpenStreetMap nearby. Call 101.</li>';
  el("reportHospital").innerHTML = hospitalList.length
    ? hospitalList.map(p => serviceHtml(p, "hospital")).join("")
    : '<li class="service-empty">No hospitals found in OpenStreetMap nearby. Call 108.</li>';

  el("reportFireSearch").href = services.searchLinks.fireStations;
  el("reportHospitalSearch").href = services.searchLinks.hospitals;
  el("reportSource").textContent =
    `Service locations: ${services.source}. Phone numbers appear only where mappers have recorded them.` +
    (services.warnings.length ? ` ${services.warnings.join(" ")}` : "");

  serviceLayer.clearLayers();
  for (const [list, color, label] of [
    [fireList, "#dc2626", "Fire station"],
    [hospitalList, "#059669", "Hospital"],
  ]) {
    for (const p of list) {
      L.circleMarker([p.lat, p.lon], {
        radius: 7,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindPopup(`<strong>${escapeHtml(p.name)}</strong><br>${label} · ${p.distanceKm} km from incident`)
        .addTo(serviceLayer);
    }
  }
}

async function openReport(id) {
  const inc = findIncident(id);
  if (!inc) return;
  reportState.incident = inc;
  reportState.services = null;

  const isFire = inc.kind === "fire";
  el("reportKicker").textContent = isFire ? "REPORT WILDFIRE" : "REPORT FLOOD";
  el("reportTitle").textContent = `${isFire ? "Wildfire" : "Flood"} ${inc.id}`;
  el("reportSummary").textContent = reportSummaryText(inc, null);
  el("reportNumbers").innerHTML = [
    ["112", "Emergency"],
    ["101", "Fire"],
    ["108", "Ambulance"],
  ]
    .map(([n, label]) => `<a class="number-chip" href="tel:${n}"><strong>${n}</strong> ${label}</a>`)
    .join("");
  el("reportFire").innerHTML = "<li>Searching OpenStreetMap…</li>";
  el("reportHospital").innerHTML = "<li>Searching OpenStreetMap…</li>";
  el("reportText").value = reportMessage(inc, null);
  el("reportStatus").textContent = "";
  el("reportSource").textContent = "";
  el("reportNotice").textContent = REPORT_NOTICE;
  el("reportShare").hidden = !navigator.share;

  const dialog = el("reportDialog");
  if (!dialog.open) dialog.showModal();

  try {
    const [lon, lat] = inc.centroid;
    const services = await fetchJson(`/api/nearby?lat=${lat}&lon=${lon}`);
    if (reportState.incident !== inc) return;
    reportState.services = services;
    el("reportSummary").textContent = reportSummaryText(inc, services);
    const country = services.place?.countryCode;
    if (country && country !== "IN") {
      el("reportNotice").textContent =
        `This incident is outside India (${services.place.country}). Indian emergency ` +
        "numbers will not reach local services there — contact that country's " +
        "authorities. Satellite detections can be false alarms.";
    }
    el("reportText").value = reportMessage(inc, services);
    renderServices();
  } catch (error) {
    if (reportState.incident !== inc) return;
    const [lon, lat] = inc.centroid;
    el("reportFire").innerHTML = `<li class="service-empty">${escapeHtml(error.message)} Call 101.</li>`;
    el("reportHospital").innerHTML = '<li class="service-empty">Call 108 for an ambulance.</li>';
    el("reportFireSearch").href = `https://www.google.com/maps/search/fire+station/@${lat},${lon},11z`;
    el("reportHospitalSearch").href = `https://www.google.com/maps/search/hospital/@${lat},${lon},11z`;
  }
}

async function copyReport() {
  const text = el("reportText").value;
  try {
    await navigator.clipboard.writeText(text);
    el("reportStatus").textContent = "Report copied. Paste it into a message or call notes.";
  } catch {
    el("reportText").select();
    el("reportStatus").textContent = "Select the text and copy it manually (Ctrl+C).";
  }
}

async function shareReport() {
  try {
    await navigator.share({
      title: el("reportTitle").textContent,
      text: el("reportText").value,
    });
  } catch {
    // Cancelled or unsupported; nothing to do.
  }
}

// ---------- Events ----------

el("forecastSlider").addEventListener("input", drawBands);
el("forecastPlay").addEventListener("click", togglePlay);
el("runFires").addEventListener("click", loadIncidents);
el("fireMode").addEventListener("change", loadIncidents);
el("floodDate").addEventListener("change", loadIncidents);
el("toggleFires").addEventListener("change", applyLayerToggles);
el("toggleFloods").addEventListener("change", applyLayerToggles);

el("incidentList").addEventListener("click", event => {
  const report = event.target.closest(".report-button");
  if (report) {
    openReport(report.dataset.report);
    return;
  }
  const btn = event.target.closest(".incident-item");
  if (btn) selectIncident(btn.dataset.id);
});

document.querySelectorAll(".filter-button").forEach(button => {
  button.addEventListener("click", () => {
    fireState.filter = button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach(b => {
      const active = b === button;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
    });
    renderIncidents();
  });
});

// "Report" buttons inside map popups.
map.getContainer().addEventListener("click", event => {
  const button = event.target.closest(".popup-report");
  if (button) openReport(button.dataset.report);
});

// Keep SMS links in sync with an edited report.
el("reportText").addEventListener("input", () => {
  if (reportState.services) renderServices();
});
el("reportCopy").addEventListener("click", copyReport);
el("reportShare").addEventListener("click", shareReport);

document.addEventListener("statechange", event => {
  fireState.state = event.detail;
  loadIncidents();
});

fillFloodDates();
