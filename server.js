
require("dotenv").config();

const express = require("express");
const path = require("path");
const OpenAI = require("openai");
const { runPipeline, toGeoJSON, toKML } = require("./lib/fire-engine");
const { runFloodPipeline, floodsToGeoJSON } = require("./lib/flood-engine");
const { findNearbyServices } = require("./lib/nearby");
const {
  STATES,
  DEFAULT_STATE,
  findState,
  REFERENCE_PLACES,
} = require("./lib/india-states");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: "15kb" }));
app.use(express.static(path.join(__dirname, "public")));

// AI provider configuration (OpenAI-compatible APIs).
// Groq is used when GROQ_API_KEY is set; DeepSeek is the fallback.
const aiProvider = process.env.GROQ_API_KEY
  ? {
      name: "Groq",
      envKey: "GROQ_API_KEY",
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
        timeout: 60000,
      }),
    }
  : process.env.DEEPSEEK_API_KEY
  ? {
      name: "DeepSeek",
      envKey: "DEEPSEEK_API_KEY",
      model: "deepseek-flash",
      client: new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: "https://api.deepseek.com",
        timeout: 60000,
      }),
    }
  : null;

// Reference places used to describe where incidents are ("12 km N of X").
const cities = REFERENCE_PLACES;

// Resolves ?state= (preferred) or a legacy ?city= to a weather location.
function resolveLocation(query) {
  if (query.state) {
    const state = findState(query.state);
    if (!state) {
      throw Object.assign(new Error("Unsupported state"), { status: 400 });
    }
    return { state: state.name, place: state.capital, lat: state.lat, lon: state.lon };
  }
  if (query.city) {
    if (!Object.prototype.hasOwnProperty.call(REFERENCE_PLACES, query.city)) {
      throw Object.assign(new Error("Unsupported city"), { status: 400 });
    }
    return { state: null, place: query.city, ...REFERENCE_PLACES[query.city] };
  }
  const state = findState(DEFAULT_STATE);
  return { state: state.name, place: state.capital, lat: state.lat, lon: state.lon };
}

// A state's bounding box, unless an explicit bbox was given.
function areaBbox(query) {
  if (query.bbox || !query.state) return query.bbox;
  const state = findState(query.state);
  if (!state) {
    throw Object.assign(new Error("Unsupported state"), { status: 400 });
  }
  return state.bbox.join(",");
}

// Homepage — fixes "Cannot GET /"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    aiConfigured: Boolean(aiProvider),
    aiProvider: aiProvider?.name || null,
    firmsConfigured: Boolean(process.env.FIRMS_MAP_KEY),
  });
});

// Retries once on a network error or 5xx response; brief connection
// drops to weather providers are common.
async function fetchWithRetry(url, timeoutMs) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status < 500 || attempt === 2) return response;
    } catch (error) {
      if (attempt === 2) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 600));
  }
}

// States and union territories for location pickers
app.get("/api/states", (req, res) => {
  res.json({
    default: DEFAULT_STATE,
    states: STATES.map(({ name, type, capital, lat, lon, bbox }) => ({
      name, type, capital, lat, lon, bbox,
    })),
  });
});

// Weather API (?state=Assam uses the state capital)
app.get("/api/weather", async (req, res) => {
  try {
    let location;
    try {
      location = resolveLocation(req.query);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const { lat, lon } = location;

    const url = new URL(
      "https://api.open-meteo.com/v1/forecast"
    );

    url.search = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      hourly:
        "temperature_2m,precipitation,precipitation_probability,wind_speed_10m",
      forecast_days: "2",
      timezone: "Asia/Kolkata",
    }).toString();

    const response = await fetchWithRetry(url, 20000);

    if (!response.ok) {
      throw new Error("Weather provider returned an error");
    }

    const data = await response.json();

    res.json({
      city: location.place,
      state: location.state,
      place: location.place,
      source: "Open-Meteo",
      sourceUrl: url.toString(),
      fetchedAt: new Date().toISOString(),
      timezone: data.timezone,
      hourly: data.hourly,
    });
  } catch (error) {
    console.error("Weather error:", error.message);

    res.status(502).json({
      error: "Unable to load weather data. Please try again.",
    });
  }
});

// Fire intelligence: FIRMS VIIRS detections -> perimeters -> spread forecast.
// Query: state=Assam or bbox=west,south,east,north  days=1-5
//        mode=auto|live|replay  minConfidence=l|n|h
function fireOptions(query) {
  return {
    bbox: areaBbox(query),
    days: query.days,
    mode: query.mode,
    minConfidence: query.minConfidence,
  };
}

function sendFireError(res, error) {
  console.error("Fire pipeline error:", error.message);
  res.status(error.status || 500).json({
    error:
      error.status === 400
        ? error.message
        : `Fire data could not be processed: ${error.message}`,
  });
}

// Flood intelligence: NASA VIIRS flood product -> flood zones -> outlook.
// Query: state=Assam or bbox=west,south,east,north  date=YYYY-MM-DD
function floodOptions(query) {
  return { bbox: areaBbox(query), date: query.date };
}

function sendFloodError(res, error) {
  console.error("Flood pipeline error:", error.message);
  res.status(error.status || 502).json({
    error:
      error.status === 400
        ? error.message
        : `Flood data could not be processed: ${error.message}`,
  });
}

app.get("/api/floods", async (req, res) => {
  try {
    res.json(await runFloodPipeline(floodOptions(req.query), cities));
  } catch (error) {
    sendFloodError(res, error);
  }
});

app.get("/api/floods.geojson", async (req, res) => {
  try {
    const result = await runFloodPipeline(floodOptions(req.query), cities);
    res
      .type("application/geo+json")
      .attachment(`disasterguardian-floods-${result.date}.geojson`)
      .send(JSON.stringify(floodsToGeoJSON(result)));
  } catch (error) {
    sendFloodError(res, error);
  }
});

// Nearest fire stations and hospitals for reporting an incident.
app.get("/api/nearby", async (req, res) => {
  try {
    res.json(await findNearbyServices(req.query));
  } catch (error) {
    console.error("Nearby services error:", error.message);
    res.status(error.status || 502).json({
      error:
        error.status === 400
          ? error.message
          : "Nearby services could not be loaded. Call 112 in an emergency.",
    });
  }
});

app.get("/api/fires", async (req, res) => {
  try {
    res.json(await runPipeline(fireOptions(req.query), cities));
  } catch (error) {
    sendFireError(res, error);
  }
});

function exportName(result, ext) {
  return `disasterguardian-fires-${result.mode}-${result.forecastStart.slice(0, 13).replace(/[-:T]/g, "")}.${ext}`;
}

app.get("/api/fires.geojson", async (req, res) => {
  try {
    const result = await runPipeline(fireOptions(req.query), cities);
    res
      .type("application/geo+json")
      .attachment(exportName(result, "geojson"))
      .send(JSON.stringify(toGeoJSON(result)));
  } catch (error) {
    sendFireError(res, error);
  }
});

app.get("/api/fires.kml", async (req, res) => {
  try {
    const result = await runPipeline(fireOptions(req.query), cities);
    res
      .type("application/vnd.google-earth.kml+xml")
      .attachment(exportName(result, "kml"))
      .send(toKML(result));
  } catch (error) {
    sendFireError(res, error);
  }
});

// Disaster preparedness AI chatbot
app.post("/api/chat", async (req, res) => {
  try {
    const { message, language = "en" } = req.body || {};

    if (typeof message !== "string" ||
        !message.trim() ||
        message.length > 2000) {
      return res.status(400).json({
        error: "Enter a message of up to 2000 characters.",
      });
    }

    if (!["en", "hi", "mr"].includes(language)) {
      return res.status(400).json({
        error: "Unsupported language.",
      });
    }

    if (!aiProvider) {
      return res.status(503).json({
        error:
          "AI is not configured. Add GROQ_API_KEY to the .env file.",
      });
    }

    const languages = {
      en: "English",
      hi: "Hindi",
      mr: "Marathi",
    };

    const completion = await aiProvider.client.chat.completions.create({
      model: aiProvider.model,
      temperature: 0.4,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `
You are DisasterGuardian, a disaster-preparedness assistant
focused on India.

Reply in ${languages[language]} using simple, clear language.

Give practical safety and preparedness advice.
Never invent live alerts, flood levels, evacuation orders,
or disaster predictions. Explain when information is unverified.
For immediate danger, advise following local authorities
and calling India's emergency number 112.
Never advise anyone to walk or drive through floodwater.
          `.trim(),
        },
        {
          role: "user",
          content: message.trim(),
        },
      ],
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "Sorry, I could not generate a response. Please try again.";

    res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error.status || "", error.message);

    // Map common provider API failures to actionable messages.
    const providerErrors = {
      401: `The ${aiProvider.name} API key is invalid. Check ${aiProvider.envKey} in .env.`,
      402: `The ${aiProvider.name} account has insufficient balance. Top up the account to use the assistant.`,
      404: `The model "${aiProvider.model}" is not available on ${aiProvider.name}.`,
      429: "The AI service is busy (rate limited). Please wait a moment and try again.",
    };

    res.status(502).json({
      error:
        providerErrors[error.status] ||
        "The AI service could not respond. Check your API configuration and try again.",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`DisasterGuardian-Pro: http://localhost:${PORT}`);
  console.log(
    aiProvider
      ? `AI provider: ${aiProvider.name} (${aiProvider.model})`
      : "AI provider: not configured"
  );
});
