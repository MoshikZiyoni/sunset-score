const https = require('https');

const lat = 32.0853;
const lon = 34.7818;

const fetchJson = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
});

async function run() {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunset&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,relative_humidity_2m&timezone=auto`;
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=aerosol_optical_depth&timezone=auto`;

    const weatherData = await fetchJson(weatherUrl);
    const aqData = await fetchJson(aqUrl);

    if (!weatherData.daily || !weatherData.daily.sunset) {
        console.log("No sunset data");
        return;
    }

    const todaySunset = weatherData.daily.sunset[0]; // Today
    console.log("Today's Sunset Time:", todaySunset);

    const sunsetHourISO = todaySunset.slice(0, 14) + "00";
    console.log("Looking for hour:", sunsetHourISO);

    let hourIndex = weatherData.hourly.time.findIndex(t => t.startsWith(sunsetHourISO));
    if (hourIndex === -1) {
        console.log("Exact hour not found, approximating...");
        hourIndex = 0; // Simple fallback just for testing script
    }

    const conditions = {
        lowClouds: weatherData.hourly.cloud_cover_low[hourIndex],
        midClouds: weatherData.hourly.cloud_cover_mid[hourIndex],
        highClouds: weatherData.hourly.cloud_cover_high[hourIndex],
        visibility: weatherData.hourly.visibility[hourIndex],
        humidity: weatherData.hourly.relative_humidity_2m[hourIndex],
        aerosol: aqData.hourly.aerosol_optical_depth ? aqData.hourly.aerosol_optical_depth[hourIndex] : 0
    };

    console.log("\n--- TODAY'S SUNSET CONDITIONS IN TEL AVIV ---");
    console.log(JSON.stringify(conditions, null, 2));

    let score = 0;
    console.log("\n--- SCORING BREAKDOWN ---");

    if (conditions.highClouds >= 30 && conditions.highClouds <= 65) { score += 35; console.log("+35 (High clouds 30-65)"); }
    else if (conditions.highClouds > 65 && conditions.highClouds <= 85) { score += 15; console.log("+15 (High clouds 66-85)"); }
    else if (conditions.highClouds > 10 && conditions.highClouds < 30) { score += 15; console.log("+15 (High clouds 11-29)"); }

    if (conditions.midClouds >= 15 && conditions.midClouds <= 40) { score += 20; console.log("+20 (Mid clouds 15-40)"); }
    else if (conditions.midClouds > 40 && conditions.midClouds <= 60) { score += 10; console.log("+10 (Mid clouds 41-60)"); }
    else if (conditions.midClouds > 70) { score -= 20; console.log("-20 (Mid clouds > 70)"); }

    if (conditions.lowClouds > 50) { score -= 50; console.log("-50 (Low clouds > 50)"); }
    else if (conditions.lowClouds > 25) { score -= 30; console.log("-30 (Low clouds > 25)"); }
    else if (conditions.lowClouds > 10) { score -= 15; console.log("-15 (Low clouds > 10)"); }
    else if (conditions.lowClouds <= 5) { score += 15; console.log("+15 (Low clouds <= 5)"); }

    if (conditions.aerosol >= 0.15) { score += 20; console.log("+20 (Aerosol >= 0.15)"); }
    else if (conditions.aerosol >= 0.08) { score += 10; console.log("+10 (Aerosol >= 0.08)"); }
    else if (conditions.aerosol < 0.04) { score -= 10; console.log("-10 (Aerosol < 0.04)"); }

    if (conditions.visibility > 24000) { score += 10; console.log("+10 (Visibility > 24000)"); }
    else if (conditions.visibility < 10000) { score -= 20; console.log("-20 (Visibility < 10000)"); }

    if (conditions.humidity < 55) { score += 5; console.log("+5 (Humidity < 55)"); }
    else if (conditions.humidity > 85) { score -= 15; console.log("-15 (Humidity > 85)"); }

    console.log("FINAL RAW SCORE:", score);
    console.log("CLAMPED SCORE:", Math.max(0, Math.min(100, score)));
}

run();
