
const $ = (id) => document.getElementById(id);

const translations = {
  en: {
    brandSubtitle: "Disaster awareness and preparedness",
    languageLabel: "Language",
    heroEyebrow: "ASSAM · DISASTER MONITORING",
    heroTitle: "Prepared today.<br><span>Safer tomorrow.</span>",
    heroText: "Weather insights, a geographic dashboard, and AI-powered disaster-preparedness guidance in one place.",
    heroButton: "Ask the AI assistant →",
    globeCaption: "Assam monitoring overview",
    weatherEyebrow: "LIVE WEATHER DATA",
    weatherTitle: "Weather overview",
    cityLabel: "Location",
    tempLabel: "Temperature",
    tempNote: "Next forecast hour",
    rainLabel: "Rain probability",
    rainNote: "Forecast probability",
    windLabel: "Wind speed",
    windNote: "Forecast value",
    updatedLabel: "Last retrieved",
    mapEyebrow: "GEOGRAPHIC MONITORING",
    mapTitle: "Assam disaster map",
    mapDescription: "Select a marker to view the location. These are monitoring locations, not confirmed active incidents.",
    mapStatus: "Map locations",
    legendLocation: "Monitoring location",
    officialHeading: "Official information",
    floodLink: "Assam flood alerts ↗",
    asdmaLink: "Assam Disaster Management Authority ↗",
    mapAttribution: "Map © OpenStreetMap contributors",
    alertDisclaimer: "Official alert links open the government website. This prototype does not automatically verify active alerts.",
    analyticsEyebrow: "WEATHER ANALYTICS",
    analyticsTitle: "Forecast trends",
    analyticsDescription: "Hourly forecast data for the selected location.",
    refreshWeather: "Refresh data",
    tempChartTitle: "Temperature (°C)",
    rainChartTitle: "Rain probability (%)",
    windChartTitle: "Wind speed (km/h)",
    weatherSource: "Source: Open-Meteo. Weather forecasts are not official disaster alerts.",
    aiEyebrow: "AI-POWERED SUPPORT",
    aiTitle: "Disaster Guardian Assistant",
    aiDescription: "Ask about flood preparedness, emergency kits, and family safety.",
    welcomeMessage: "Hello! Ask me about disaster preparedness in English, Hindi, or Marathi.",
    placeholder: "Type your question...",
    sendButton: "Send",
    aiDisclaimer: "AI may be inaccurate. Follow verified official alerts and local authorities.",
    alertsEyebrow: "ALERT STATUS",
    alertsTitle: "Official disaster alerts",
    alertsText: "Automatic official-alert integration is not enabled yet. Check the linked government sources for current warnings.",
    alertsStatus: "Not connected",
    footerText: "Assam first · Built for expansion across India",
    loading: "Loading real weather data...",
    loaded: "Forecast loaded for",
    weatherError: "Weather data is unavailable. Please try again later.",
    aiThinking: "Thinking...",
    aiError: "The AI request failed. Check the server terminal.",
    networkError: "Cannot reach the server. Check that node server.js is running.",
    noData: "No data available",
    chance: "Rain",
    wind: "Wind"
  },
  hi: {
    brandSubtitle: "आपदा जागरूकता और तैयारी",
    languageLabel: "भाषा",
    heroEyebrow: "असम · आपदा निगरानी",
    heroTitle: "आज तैयार रहें।<br><span>कल अधिक सुरक्षित रहें।</span>",
    heroText: "मौसम की जानकारी, नक्शा और AI आधारित आपदा-तैयारी सहायता एक ही जगह।",
    heroButton: "AI सहायक से पूछें →",
    globeCaption: "असम निगरानी अवलोकन",
    weatherEyebrow: "मौसम का डेटा",
    weatherTitle: "मौसम की जानकारी",
    cityLabel: "स्थान",
    tempLabel: "तापमान",
    tempNote: "अगले घंटे का पूर्वानुमान",
    rainLabel: "बारिश की संभावना",
    rainNote: "पूर्वानुमानित संभावना",
    windLabel: "हवा की गति",
    windNote: "पूर्वानुमानित मान",
    updatedLabel: "अंतिम प्राप्ति",
    mapEyebrow: "भौगोलिक निगरानी",
    mapTitle: "असम आपदा नक्शा",
    mapDescription: "स्थान देखने के लिए मार्कर चुनें। ये निगरानी स्थान हैं, पुष्टि किए गए सक्रिय हादसे नहीं।",
    mapStatus: "नक्शे के स्थान",
    legendLocation: "निगरानी स्थान",
    officialHeading: "आधिकारिक जानकारी",
    floodLink: "असम बाढ़ चेतावनी ↗",
    asdmaLink: "असम आपदा प्रबंधन प्राधिकरण ↗",
    mapAttribution: "मानचित्र © OpenStreetMap योगदानकर्ता",
    alertDisclaimer: "आधिकारिक चेतावनी लिंक सरकारी वेबसाइट खोलते हैं। यह प्रारूप सक्रिय चेतावनियों की स्वचालित पुष्टि नहीं करता।",
    analyticsEyebrow: "मौसम विश्लेषण",
    analyticsTitle: "पूर्वानुमान के रुझान",
    analyticsDescription: "चुने गए स्थान का प्रति घंटे का पूर्वानुमान।",
    refreshWeather: "डेटा रीफ्रेश करें",
    tempChartTitle: "तापमान (°C)",
    rainChartTitle: "बारिश की संभावना (%)",
    windChartTitle: "हवा की गति (km/h)",
    weatherSource: "स्रोत: Open-Meteo। यह मौसम पूर्वानुमान है, आधिकारिक आपदा चेतावनी नहीं।",
    aiEyebrow: "AI सहायता",
    aiTitle: "डिज़ास्टर गार्जियन सहायक",
    aiDescription: "बाढ़ से बचाव, आपातकालीन किट और परिवार की सुरक्षा के बारे में पूछें।",
    welcomeMessage: "नमस्ते! हिंदी, अंग्रेज़ी या मराठी में आपदा तैयारी के बारे में पूछें।",
    placeholder: "अपना प्रश्न लिखें...",
    sendButton: "भेजें",
    aiDisclaimer: "AI के उत्तर गलत हो सकते हैं। आधिकारिक चेतावनियों और स्थानीय प्रशासन के निर्देशों का पालन करें।",
    alertsEyebrow: "चेतावनी स्थिति",
    alertsTitle: "आधिकारिक आपदा चेतावनियाँ",
    alertsText: "स्वचालित आधिकारिक चेतावनी सुविधा अभी जुड़ी नहीं है। वर्तमान चेतावनियों के लिए सरकारी स्रोत देखें।",
    alertsStatus: "कनेक्ट नहीं है",
    footerText: "पहले असम · बाद में पूरे भारत में विस्तार",
    loading: "मौसम का वास्तविक डेटा लोड हो रहा है...",
    loaded: "पूर्वानुमान उपलब्ध:",
    weatherError: "मौसम का डेटा उपलब्ध नहीं है। बाद में प्रयास करें।",
    aiThinking: "उत्तर तैयार हो रहा है...",
    aiError: "AI अनुरोध विफल हुआ। सर्वर टर्मिनल जाँचें।",
    networkError: "सर्वर से संपर्क नहीं हो रहा। जाँचें कि node server.js चल रहा है।",
    noData: "डेटा उपलब्ध नहीं है",
    chance: "बारिश",
    wind: "हवा"
  },
  mr: {
    brandSubtitle: "आपत्ती जागरूकता आणि तयारी",
    languageLabel: "भाषा",
    heroEyebrow: "आसाम · आपत्ती निरीक्षण",
    heroTitle: "आज सज्ज राहा.<br><span>उद्या अधिक सुरक्षित राहा.</span>",
    heroText: "हवामानाची माहिती, नकाशा आणि AI आधारित आपत्ती तयारीची मदत एकाच ठिकाणी.",
    heroButton: "AI सहाय्यकाला विचारा →",
    globeCaption: "आसाम निरीक्षण आढावा",
    weatherEyebrow: "हवामान डेटा",
    weatherTitle: "हवामानाचा आढावा",
    cityLabel: "ठिकाण",
    tempLabel: "तापमान",
    tempNote: "पुढील तासाचा अंदाज",
    rainLabel: "पावसाची शक्यता",
    rainNote: "अंदाजित शक्यता",
    windLabel: "वाऱ्याचा वेग",
    windNote: "अंदाजित मूल्य",
    updatedLabel: "शेवटचा डेटा",
    mapEyebrow: "भौगोलिक निरीक्षण",
    mapTitle: "आसाम आपत्ती नकाशा",
    mapDescription: "ठिकाण पाहण्यासाठी मार्कर निवडा. हे निरीक्षणाचे ठिकाण आहेत, पुष्टी केलेल्या सक्रिय घटना नाहीत.",
    mapStatus: "नकाशावरील ठिकाणे",
    legendLocation: "निरीक्षणाचे ठिकाण",
    officialHeading: "अधिकृत माहिती",
    floodLink: "आसाम पूर सूचना ↗",
    asdmaLink: "आसाम आपत्ती व्यवस्थापन प्राधिकरण ↗",
    mapAttribution: "नकाशा © OpenStreetMap योगदानकर्ते",
    alertDisclaimer: "अधिकृत सूचना लिंक सरकारी वेबसाइट उघडतात. हा नमुना सक्रिय सूचनांची स्वयंचलित पडताळणी करत नाही.",
    analyticsEyebrow: "हवामान विश्लेषण",
    analyticsTitle: "अंदाजातील बदल",
    analyticsDescription: "निवडलेल्या ठिकाणाचा तासानुसार हवामान अंदाज.",
    refreshWeather: "डेटा रिफ्रेश करा",
    tempChartTitle: "तापमान (°C)",
    rainChartTitle: "पावसाची शक्यता (%)",
    windChartTitle: "वाऱ्याचा वेग (km/h)",
    weatherSource: "स्रोत: Open-Meteo. हा हवामान अंदाज आहे, अधिकृत आपत्ती सूचना नाही.",
    aiEyebrow: "AI मदत",
    aiTitle: "डिसास्टर गार्डियन सहाय्यक",
    aiDescription: "पूर प्रतिबंध, आपत्कालीन किट आणि कुटुंबाच्या सुरक्षिततेबद्दल विचारा.",
    welcomeMessage: "नमस्कार! मराठी, हिंदी किंवा इंग्रजीमध्ये आपत्ती तयारीबद्दल विचारा.",
    placeholder: "तुमचा प्रश्न लिहा...",
    sendButton: "पाठवा",
    aiDisclaimer: "AI ची उत्तरे चुकीची असू शकतात. अधिकृत सूचना आणि स्थानिक प्रशासनाच्या निर्देशांचे पालन करा.",
    alertsEyebrow: "सूचना स्थिती",
    alertsTitle: "अधिकृत आपत्ती सूचना",
    alertsText: "स्वयंचलित अधिकृत सूचना सुविधा अद्याप जोडलेली नाही. सध्याच्या सूचनांसाठी सरकारी स्रोत तपासा.",
    alertsStatus: "जोडलेले नाही",
    footerText: "प्रथम आसाम · नंतर संपूर्ण भारतासाठी विस्तार",
    loading: "हवामानाचा प्रत्यक्ष डेटा लोड होत आहे...",
    loaded: "अंदाज उपलब्ध:",
    weatherError: "हवामान डेटा उपलब्ध नाही. नंतर पुन्हा प्रयत्न करा.",
    aiThinking: "उत्तर तयार होत आहे...",
    aiError: "AI विनंती अयशस्वी झाली. सर्व्हर टर्मिनल तपासा.",
    networkError: "सर्व्हरशी संपर्क होत नाही. node server.js सुरू आहे का ते तपासा.",
    noData: "डेटा उपलब्ध नाही",
    chance: "पाऊस",
    wind: "वारा"
  }
};

let language = "en";
let map;
let tempChart;
let rainChart;
let windChart;
let lastWeather = null;

function tr(key) {
  return translations[language][key] ?? translations.en[key] ?? key;
}

function applyLanguage() {
  document.documentElement.lang = language;

  const keys = [
    "brandSubtitle", "languageLabel", "heroEyebrow", "heroText",
    "globeCaption", "weatherEyebrow", "weatherTitle", "cityLabel",
    "tempLabel", "tempNote", "rainLabel", "rainNote", "windLabel",
    "windNote", "updatedLabel", "mapEyebrow", "mapTitle",
    "mapDescription", "mapStatus", "legendLocation", "officialHeading",
    "floodLink", "asdmaLink", "mapAttribution", "alertDisclaimer",
    "analyticsEyebrow", "analyticsTitle", "analyticsDescription",
    "tempChartTitle", "rainChartTitle", "windChartTitle",
    "weatherSource", "aiEyebrow", "aiTitle", "aiDescription",
    "welcomeMessage", "aiDisclaimer", "alertsEyebrow", "alertsTitle",
    "alertsText", "alertsStatus", "footerText"
  ];

  keys.forEach((key) => {
    const element = $(key);
    if (element) element.textContent = tr(key);
  });

  $("heroTitle").innerHTML = tr("heroTitle");
  $("heroButton").textContent = tr("heroButton");
  $("refreshWeather").textContent = tr("refreshWeather");
  $("sendButton").textContent = tr("sendButton");
  $("chatInput").placeholder = tr("placeholder");

  if (lastWeather) renderWeather(lastWeather);
}

function initMap() {
  if (!window.L) {
    $("mapStatus").textContent = "Map library unavailable";
    return;
  }

  map = L.map("map").setView([26.2, 92.8], 7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(map);

  // These are geographic reference locations, NOT live disaster reports.
  const places = [
    { name: "Guwahati", coords: [26.1445, 91.7362] },
    { name: "Dibrugarh", coords: [27.4728, 94.9120] },
    { name: "Silchar", coords: [24.8333, 92.7789] },
    { name: "Tezpur", coords: [26.6528, 92.7926] },
    { name: "Jorhat", coords: [26.7509, 94.2037] }
  ];

  places.forEach((place) => {
    L.circleMarker(place.coords, {
      radius: 7,
      color: "#0b7d8b",
      fillColor: "#5de1e5",
      fillOpacity: 0.9,
      weight: 2
    })
      .addTo(map)
      .bindPopup(
        `<strong>${place.name}</strong><br>` +
        "Reference location — no active disaster status is implied."
      );
  });

  setTimeout(() => map.invalidateSize(), 250);
}

function makeChart(canvasId, existing, label, labels, values, color, max) {
  if (existing) existing.destroy();

  const canvas = $(canvasId);
  if (!canvas || !window.Chart) return null;

  return new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: color,
        backgroundColor: color + "22",
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.3,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: {
          labels: { color: "#b8c9dc", boxWidth: 10, font: { size: 10 } }
        }
      },
      scales: {
        x: {
          ticks: { color: "#92a8bd", maxTicksLimit: 6, maxRotation: 0 },
          grid: { color: "#26364a" }
        },
        y: {
          beginAtZero: true,
          suggestedMax: max,
          ticks: { color: "#92a8bd" },
          grid: { color: "#26364a" }
        }
      }
    }
  });
}

function renderWeather(data) {
  lastWeather = data;
  const hourly = data.hourly;

  if (!hourly || !hourly.time?.length) {
    $("weatherStatus").textContent = tr("weatherError");
    return;
  }

  // Pick the current or next available forecast hour.
  const now = Date.now();
  let start = hourly.time.findIndex((time) =>
    new Date(time).getTime() >= now - 60 * 60 * 1000
  );
  if (start < 0) start = 0;

  const temp = hourly.temperature_2m?.[start];
  const rain = hourly.precipitation_probability?.[start];
  const wind = hourly.wind_speed_10m?.[start];

  $("temperature").textContent = temp == null ? "—" : `${Math.round(temp)}°C`;
  $("rain").textContent = rain == null ? "—" : `${rain}%`;
  $("wind").textContent = wind == null ? "—" : `${Math.round(wind)} km/h`;

  $("updated").textContent = new Date(data.fetchedAt).toLocaleTimeString(
    language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN",
    { hour: "2-digit", minute: "2-digit" }
  );

  $("weatherStatus").textContent = `${tr("loaded")} ${data.city}`;

  const hours = hourly.time.slice(start, start + 12);
  const labels = hours.map((time) => time.slice(11, 16));

  tempChart = makeChart(
    "tempChart", tempChart, tr("tempChartTitle"),
    labels, hourly.temperature_2m.slice(start, start + 12),
    "#5de1e5", 40
  );

  rainChart = makeChart(
    "rainChart", rainChart, tr("rainChartTitle"),
    labels, hourly.precipitation_probability.slice(start, start + 12),
    "#82b4ff", 100
  );

  windChart = makeChart(
    "windChart", windChart, tr("windChartTitle"),
    labels, hourly.wind_speed_10m.slice(start, start + 12),
    "#e8bd78", 60
  );

  const list = $("hourlyForecast");
  list.replaceChildren();

  hours.forEach((time, index) => {
    const i = start + index;
    const card = document.createElement("div");
    card.className = "hour-item";

    const timeEl = document.createElement("time");
    timeEl.textContent = time.slice(11, 16);

    const tempEl = document.createElement("strong");
    const tempVal = hourly.temperature_2m?.[i];
    tempEl.textContent = tempVal == null ? "—" : `${Math.round(tempVal)}°`;

    const rainEl = document.createElement("span");
    const rainVal = hourly.precipitation_probability?.[i];
    rainEl.textContent = rainVal == null ? "—" : `${rainVal}% ${tr("chance")}`;

    const windEl = document.createElement("small");
    const windVal = hourly.wind_speed_10m?.[i];
    windEl.textContent = windVal == null ? "—" : `${Math.round(windVal)} km/h`;

    card.append(timeEl, tempEl, rainEl, windEl);
    list.appendChild(card);
  });
}

async function loadWeather() {
  $("weatherStatus").textContent = tr("loading");
  $("refreshWeather").disabled = true;

  try {
    const city = $("city").value;
    const response = await fetch(
      `/api/weather?city=${encodeURIComponent(city)}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || tr("weatherError"));
    }

    renderWeather(data);
  } catch (error) {
    $("weatherStatus").textContent = tr("weatherError");
    console.error("Weather request failed:", error.message);
  } finally {
    $("refreshWeather").disabled = false;
  }
}

function addChatMessage(text, type) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = text;
  $("chatMessages").appendChild(bubble);
  $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
  return bubble;
}

async function sendChat(message) {
  message = message.trim();
  if (!message || $("sendButton").disabled) return;

  addChatMessage(message, "user");
  $("chatInput").value = "";
  $("sendButton").disabled = true;
  $("chatInput").disabled = true;

  const answer = addChatMessage(tr("aiThinking"), "bot");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, language })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || tr("aiError"));
    }

    answer.textContent = data.reply;
  } catch (error) {
    answer.textContent = error.message || tr("networkError");
    console.error("Chat request failed:", error.message);
  } finally {
    $("sendButton").disabled = false;
    $("chatInput").disabled = false;
    $("chatInput").focus();
  }
}

$("language").addEventListener("change", (event) => {
  language = event.target.value;
  applyLanguage();
});

$("city").addEventListener("change", loadWeather);
$("refreshWeather").addEventListener("click", loadWeather);

$("chatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  sendChat($("chatInput").value);
});

initMap();
applyLanguage();
loadWeather();
