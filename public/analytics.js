const citySelect = document.getElementById("analyticsCity");
const refreshButton = document.getElementById("refreshAnalytics");
const statusText = document.getElementById("analyticsStatus");

let temperatureChart = null;
let rainChart = null;
let windChart = null;

const STATE_STORAGE_KEY = "dg-state";

async function loadAnalytics() {
    const state = citySelect.value;
    let city = state;

    try {
        localStorage.setItem(STATE_STORAGE_KEY, state);
    } catch {
        // Storage unavailable; the selection just isn't remembered.
    }

    statusText.textContent = `Loading weather data for ${state}...`;
    refreshButton.disabled = true;

    try {
        const response = await fetch(
            `/api/weather?state=${encodeURIComponent(state)}`
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.error || `Weather request failed (${response.status})`
            );
        }

        // Supports a response containing the forecast directly or
        // wrapped inside a "forecast" property.
        const forecast = data.forecast || data;

        if (data.error) {
            throw new Error(data.error);
        }

        if (data.place) city = `${state} (${data.place})`;

        const hourly = forecast.hourly;

        if (
            !hourly ||
            !Array.isArray(hourly.time) ||
            !Array.isArray(hourly.temperature_2m)
        ) {
            throw new Error(
                "The weather API response does not contain hourly forecast data."
            );
        }

        const times = hourly.time;
        const temperatures = hourly.temperature_2m;
        const rainProbabilities =
            hourly.precipitation_probability || [];
        const windSpeeds = hourly.wind_speed_10m || [];

        // Forecast times are Indian Standard Time (IST) without an offset,
        // so parse them as IST and start from the current hour.
        const now = Date.now();
        let start = times.findIndex(time =>
            new Date(`${time}:00+05:30`).getTime() > now - 60 * 60 * 1000
        );
        if (start < 0) start = 0;

        const count = Math.min(
            24,
            times.length - start,
            temperatures.length - start
        );

        if (count <= 0) {
            throw new Error("No forecast data is available.");
        }

        const labels = times
            .slice(start, start + count)
            .map(time => time.slice(11, 16));

        const temperatureValues = labels.map((_, index) =>
            temperatures[start + index] ?? null
        );

        const rainValues = labels.map((_, index) =>
            rainProbabilities[start + index] ?? null
        );

        const windValues = labels.map((_, index) =>
            windSpeeds[start + index] ?? null
        );

        updateMetric("analyticsTemp", temperatureValues[0], "°C");
        updateMetric(
            "analyticsRain",
            maxValue(rainValues),
            "%"
        );
        updateMetric(
            "analyticsWind",
            maxValue(windValues),
            "km/h"
        );

        temperatureChart = drawChart(
            temperatureChart,
            "temperatureChart",
            labels,
            temperatureValues,
            "Temperature (°C)",
            "line"
        );

        rainChart = drawChart(
            rainChart,
            "rainChart",
            labels,
            rainValues,
            "Rain probability (%)",
            "bar"
        );

        windChart = drawChart(
            windChart,
            "windChart",
            labels,
            windValues,
            "Wind speed (km/h)",
            "line"
        );

        statusText.textContent =
            `Forecast loaded for ${city}. Showing up to ${count} hourly readings.`;
    } catch (error) {
        console.error("Analytics error:", error);
        statusText.textContent =
            `Unable to load analytics: ${error.message}`;
    } finally {
        refreshButton.disabled = false;
    }
}

function updateMetric(elementId, value, unit) {
    const element = document.getElementById(elementId);

    element.textContent =
        typeof value === "number" && Number.isFinite(value)
            ? `${value.toFixed(1)} ${unit}`
            : `-- ${unit}`;
}

function maxValue(values) {
    const validValues = values.filter(
        value => typeof value === "number" &&
                 Number.isFinite(value)
    );

    return validValues.length
        ? Math.max(...validValues)
        : null;
}

function drawChart(existingChart, canvasId, labels, values, label, type) {
    if (existingChart) {
        existingChart.destroy();
    }

    const canvas = document.getElementById(canvasId);

    return new Chart(canvas, {
        type,
        data: {
            labels,
            datasets: [{
                label,
                data: values,
                borderWidth: 2,
                tension: 0.35,
                spanGaps: true,
                fill: type === "line",
                pointRadius: type === "line" ? 2 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: type === "bar"
                }
            }
        }
    });
}

citySelect.addEventListener("change", loadAnalytics);
refreshButton.addEventListener("click", loadAnalytics);

// Fill the state list (remembering the last state chosen on any page),
// then load the forecast.
(async () => {
    let saved = null;
    try {
        saved = localStorage.getItem(STATE_STORAGE_KEY);
    } catch {
        saved = null;
    }
    try {
        await loadStateOptions(citySelect, saved);
    } catch (error) {
        console.error("States error:", error);
    }
    loadAnalytics();
})();
