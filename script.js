document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('search-btn');
    const locationBtn = document.getElementById('location-btn');
    const cityInput = document.getElementById('city-input');
    const forecastContainer = document.getElementById('forecast-container');
    const forecastGrid = document.getElementById('forecast-grid');
    const locationNameEl = document.getElementById('location-name');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');

    searchBtn.addEventListener('click', handleSearch);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    locationBtn.addEventListener('click', handleGeolocation);

    async function handleSearch() {
        const query = cityInput.value.trim();
        if (!query) return;

        showLoader();
        try {
            // Geocoding API
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=he`);
            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) {
                throw new Error('לא מצאנו את העיר שחיפשת. נסה שוב.');
            }

            const location = geoData.results[0];
            locationNameEl.textContent = `תחזית עבור ${location.name}${location.country ? ', ' + location.country : ''}`;
            
            await fetchSunsetForecast(location.latitude, location.longitude);
        } catch (error) {
            showError(error.message);
        }
    }

    function handleGeolocation() {
        if (!navigator.geolocation) {
            showError('הדפדפן שלך לא תומך באיתור מיקום.');
            return;
        }

        showLoader();
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            locationNameEl.textContent = 'תחזית למיקום הנוכחי שלך';
            try {
                await fetchSunsetForecast(latitude, longitude);
            } catch (error) {
                showError('שגיאה בקבלת נתוני שקיעה למיקום שלך.');
            }
        }, () => {
            showError('לא הצלחנו לקבל את המיקום שלך. ודא שאישרת גישה למיקום.');
        });
    }

    async function fetchSunsetForecast(lat, lon) {
        try {
            // Fetch daily sunset times, and hourly cloud cover and visibility
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunset&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,relative_humidity_2m&timezone=auto`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('שגיאה בקבלת נתוני מזג אוויר.');
            
            const data = await res.json();
            processData(data);
        } catch (error) {
            showError(error.message);
        }
    }

    function processData(data) {
        forecastGrid.innerHTML = '';
        const daily = data.daily;
        const hourly = data.hourly;

        // Ensure we have data
        if (!daily || !daily.sunset) {
            showError('אין נתוני שקיעה זמינים למיקום זה.');
            return;
        }

        for (let i = 0; i < daily.sunset.length; i++) {
            const sunsetTimeStr = daily.sunset[i];
            const sunsetDate = new Date(sunsetTimeStr);
            
            // Find the closest hour in the hourly data
            const sunsetHourISO = sunsetTimeStr.slice(0, 14) + "00"; // roughly truncating to hour
            let hourIndex = hourly.time.findIndex(t => t.startsWith(sunsetHourISO));
            
            // fallback if exact match not found
            if (hourIndex === -1) {
                const searchTime = sunsetDate.getTime();
                hourIndex = hourly.time.reduce((closestIdx, t, idx) => {
                    const diff = Math.abs(new Date(t).getTime() - searchTime);
                    const closestDiff = Math.abs(new Date(hourly.time[closestIdx]).getTime() - searchTime);
                    return diff < closestDiff ? idx : closestIdx;
                }, 0);
            }

            const sunsetConditions = {
                lowClouds: hourly.cloud_cover_low[hourIndex],
                midClouds: hourly.cloud_cover_mid[hourIndex],
                highClouds: hourly.cloud_cover_high[hourIndex],
                visibility: hourly.visibility[hourIndex],
                humidity: hourly.relative_humidity_2m[hourIndex]
            };

            const evaluation = evaluateSunset(sunsetConditions);
            createForecastCard(sunsetDate, evaluation);
        }

        hideLoader();
    }

    function evaluateSunset(conditions) {
        // Algorithm to score sunset from 0 to 100
        let score = 50; // Base score

        // High clouds catch light beautifully (ideal 30-70%)
        if (conditions.highClouds > 20 && conditions.highClouds <= 80) score += 25;
        else if (conditions.highClouds > 80) score += 10;
        
        // Mid clouds add texture (ideal 20-60%)
        if (conditions.midClouds > 20 && conditions.midClouds <= 70) score += 20;
        else if (conditions.midClouds > 70) score -= 10;

        // Low clouds block the sun
        if (conditions.lowClouds > 60) score -= 40;
        else if (conditions.lowClouds > 30) score -= 20;
        else if (conditions.lowClouds < 10) score += 10;

        // Visibility (meters) - higher is better for crisp colors
        if (conditions.visibility > 20000) score += 10;
        else if (conditions.visibility < 10000) score -= 15;

        // Humidity - lower is better (less haze)
        if (conditions.humidity > 85) score -= 15;
        else if (conditions.humidity < 50) score += 10;

        // Clamp score between 0 and 100
        score = Math.max(0, Math.min(100, score));

        let desc, colorClass, icon;

        if (score >= 80) {
            desc = 'שקיעה מטורפת! צבעים משוגעים!';
            colorClass = 'score-amazing';
            icon = '🌅';
        } else if (score >= 60) {
            desc = 'שקיעה יפהפייה ונעימה';
            colorClass = 'score-good';
            icon = '🌇';
        } else if (score >= 35) {
            desc = 'שקיעה נחמדה, שמיים די נקיים';
            colorClass = 'score-average';
            icon = '🌤️';
        } else {
            desc = 'שקיעה משעממת או מוסתרת בעננים';
            colorClass = 'score-bad';
            icon = '☁️';
        }

        return { score: Math.round(score), desc, colorClass, icon };
    }

    function createForecastCard(date, eval) {
        // Format date and time
        const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        const dayName = days[date.getDay()];
        let todayStr = "";
        
        const now = new Date();
        if (date.getDate() === now.getDate() && date.getMonth() === now.getMonth()) {
            todayStr = " (היום)";
        } else if (date.getDate() === now.getDate() + 1 || (now.getDate() === new Date(now.getFullYear(), now.getMonth()+1, 0).getDate() && date.getDate() === 1)) {
            todayStr = " (מחר)";
        }

        const dateStr = `${dayName}${todayStr} - ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        const card = document.createElement('div');
        card.className = 'day-card';
        card.innerHTML = `
            <div class="card-date">${dateStr}</div>
            <div class="card-time">${timeStr}</div>
            <div class="icon-container">${eval.icon}</div>
            <div class="score-container">
                <div class="score-bar-bg">
                    <div class="score-bar-fill ${eval.colorClass}" style="width: 0%"></div>
                </div>
            </div>
            <div class="card-score-text">${eval.score}%</div>
            <div class="card-desc">${eval.desc}</div>
        `;

        forecastGrid.appendChild(card);

        // Animate the bar
        setTimeout(() => {
            const bar = card.querySelector('.score-bar-fill');
            bar.style.width = `${eval.score}%`;
        }, 100);
    }

    function showLoader() {
        forecastContainer.classList.add('hidden');
        errorMessage.classList.add('hidden');
        loader.classList.remove('hidden');
        forecastContainer.classList.remove('hidden');
        forecastGrid.innerHTML = '';
        locationNameEl.textContent = 'מחפש נתונים...';
    }

    function hideLoader() {
        loader.classList.add('hidden');
        forecastContainer.classList.remove('hidden');
    }

    function showError(msg) {
        loader.classList.add('hidden');
        forecastContainer.classList.add('hidden');
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }
});
