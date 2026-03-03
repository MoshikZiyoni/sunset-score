import React, { useState, useEffect, useRef } from 'react';
import SunCalc from 'suncalc';
import Tilt from 'react-parallax-tilt';
import { Compass, Sunrise, Info, MapPin, Search, CalendarPlus, Share2, ChevronDown, ChevronUp, Wind, Map, Navigation, Sun } from 'lucide-react';
import './SunsetPredictor.css';

// --- Recommended Spots DB (Israel) ---
const sunsetSpots = [
    { name: 'חוף הצוק (תל אביב)', desc: 'חוף פתוח לחלוטין למערב עם בריזת ים צלולה', type: 'beach', lat: 32.1388, lon: 34.7937 },
    { name: 'טיילת ארמון הנציב (ירושלים)', desc: 'תצפית פנורמית מרהיבה על כל העיר העתיקה', type: 'viewpoint', lat: 31.7533, lon: 35.2396 },
    { name: 'מצפה שלום (רמת הגולן)', desc: 'תצפית עוצרת נשימה למערב אל הכנרת בשקיעה', type: 'mountain', lat: 32.7486, lon: 35.6599 },
    { name: 'מצפה רמון (שפת המכתש)', desc: 'אופק נקי וצלול עם צבעי מדבר משתנים בזהב', type: 'mountain', lat: 30.6080, lon: 34.8014 },
    { name: 'חוף דור הבונים', desc: 'שמורת טבע מטורפת עם מפרצים שיפים לשעת הזהב', type: 'beach', lat: 32.6284, lon: 34.9221 },
    { name: 'תל עזקה (עמק האלה)', desc: 'גבעה החולשת על כל מישור החוף הדרומי, שקיעות פסטל', type: 'hill', lat: 31.6997, lon: 34.9351 },
    { name: 'גבעת קוזאלי (חיפה/כרמל)', desc: 'תצפית קלאסית מגובה רב ישר אל הים התיכון', type: 'viewpoint', lat: 32.8191, lon: 34.9983 },
    { name: 'אפולוניה (הרצליה)', desc: 'מצוק מדהים עם עתיקות היורד ישר אל קו המים', type: 'cliff', lat: 32.1956, lon: 34.8078 },
    { name: 'מרינה אשדוד', desc: 'שוברי גלים ארוכים לקומפוזיציות שקיעה מעניינות', type: 'beach', lat: 31.8157, lon: 34.6366 },
    { name: 'מצפה לוקי (יער ירושלים)', desc: 'תצפית פראית על הרי ירושלים והקסטל', type: 'mountain', lat: 31.7820, lon: 35.1680 },
    { name: 'הר תבור', desc: 'צפייה בכיפה ממזרח למערב מעל עמק יזרעאל', type: 'mountain', lat: 32.6868, lon: 35.3892 },
    { name: 'חוף פלמחים', desc: 'דיונות חול ומצוקי כורכר בשקיעות כתומות עזות', type: 'beach', lat: 31.9280, lon: 34.7431 },
    { name: 'הר בנטל', desc: 'תצפית גובה קיצונית אל עבר סוריה ועמק קוניטרה', type: 'mountain', lat: 33.1250, lon: 35.8115 },
    { name: 'גן לאומי כוכב הירדן', desc: 'מבצר צלבני עם תצפית אל תוך בקעת הירדן', type: 'viewpoint', lat: 32.5936, lon: 35.5215 },
    { name: 'נמל יפו העתיקה', desc: 'מבט מהמזח אל עבר קו הרקיע של תל אביב בשקיעה', type: 'beach', lat: 32.0519, lon: 34.7505 }
];

// --- Haversine Distance Formula ---
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = (lat2 - lat1) * (Math.PI / 180);
    var dLon = (lon2 - lon1) * (Math.PI / 180);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

// --- Scoring and Text Generation ---

function evaluateSunset(conditions) {
    const { highClouds, midClouds, lowClouds, visibility, humidity, aerosol } = conditions;
    let score = 0;

    // V4 Severe Penalty: Low clouds block everything
    if (lowClouds > 10) {
        let penaltyScore = 40 - (lowClouds * 0.5);
        score = Math.max(0, penaltyScore);
    } else {
        // Safe to score based on canvas
        let perfectHighClouds = false;

        if (highClouds >= 40 && highClouds <= 60) {
            score += 40;
            perfectHighClouds = true;
        } else if (highClouds > 10 && highClouds < 80) {
            score += 20;
        } else {
            score = Math.max(0, 30 - (lowClouds * 0.5));
        }

        if (midClouds >= 10 && midClouds <= 30) {
            score += 15;
        }

        if (aerosol > 0.15) {
            score += perfectHighClouds ? 25 : 15;
        } else if (aerosol > 0.08) {
            score += 10;
        }

        if (visibility > 20000) score += 10;
        if (humidity < 60) score += 10;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    let desc, detailText, colorClass, gradientClass, img;

    if (score >= 85) {
        desc = 'נדיר ומטורף 🤩';
        colorClass = 'score-amazing';
        gradientClass = 'bg-amazing';
        img = 'amazing.png';
        detailText = 'תנאים מושלמים! אבק באוויר, טווח עננים גבוהים מדויק ואפס הסתרה נמוכה.';
    } else if (score >= 60) {
        desc = 'שקיעה יפהפייה 🌅';
        colorClass = 'score-good';
        gradientClass = 'bg-good';
        img = 'good.png';
        detailText = 'שקיעה נעימה וקלאסית של השעה המוזהבת. סבירות לגווני כתום וזהב.';
    } else if (score >= 35) {
        desc = 'שקיעה נחמדה ⛅';
        colorClass = 'score-average';
        gradientClass = 'bg-average';
        img = 'average.png';
        detailText = 'שמיים נקיים או ממוצעים. השמש תשקע כרגיל אבל ללא צבעים עזים במיוחד בגלל חוסר בעננות גבוהה או אבק.';
    } else {
        desc = 'לא משהו היום ☁️';
        colorClass = 'score-bad';
        gradientClass = 'bg-bad';
        img = 'bad.png';
        detailText = 'עננים נמוכים וערפיח מסתירים את האופק. חכו ליום טוב יותר.';
    }

    return { score, desc, detailText, colorClass, gradientClass, img };
}

// Convert azimuth from radians to degrees and cardinal direction
function formatAzimuth(radians) {
    let degrees = radians * (180 / Math.PI);
    degrees = (degrees + 180) % 360; // SunCalc uses south as 0, standard compass uses north

    let direction = "";
    if (degrees >= 337.5 || degrees < 22.5) direction = "צפון";
    else if (degrees >= 22.5 && degrees < 67.5) direction = "צפון-מזרח";
    else if (degrees >= 67.5 && degrees < 112.5) direction = "מזרח";
    else if (degrees >= 112.5 && degrees < 157.5) direction = "דרום-מזרח";
    else if (degrees >= 157.5 && degrees < 202.5) direction = "דרום";
    else if (degrees >= 202.5 && degrees < 247.5) direction = "דרום-מערב";
    else if (degrees >= 247.5 && degrees < 292.5) direction = "מערב";
    else if (degrees >= 292.5 && degrees < 337.5) direction = "צפון-מערב";

    return { degrees: Math.round(degrees), direction };
}


const SunsetPredictor = () => {
    const [cityInput, setCityInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [forecasts, setForecasts] = useState([]);
    const [locationName, setLocationName] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [appGradient, setAppGradient] = useState('default');
    const [closestSpots, setClosestSpots] = useState([]);

    const resultsRef = useRef(null);
    const spotsSectionRef = useRef(null);

    const scrollToSpots = () => {
        if (spotsSectionRef.current) {
            spotsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    useEffect(() => {
        // Auto-scroll to results when loading finishes and forecasts are available
        if (!isLoading && forecasts.length > 0 && resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [isLoading, forecasts]);

    const [animateBars, setAnimateBars] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState(null);

    const toggleProData = (id) => {
        setExpandedCardId(expandedCardId === id ? null : id);
    };

    const handleShare = async (forecast) => {
        const text = `${forecast.date.toLocaleDateString('he-IL')} - ציון שקיעה: ${forecast.eval.score}% 🌅\n${forecast.eval.desc}\n${forecast.eval.detailText}\nבדקו בעצמכם ב-Sunset Predictor!`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'תחזית שקיעה',
                    text: text,
                });
            } catch (err) {
                console.log('Error sharing', err);
            }
        } else {
            navigator.clipboard.writeText(text);
            alert('התחזית הועתקה ללוח!');
        }
    };

    const handleCalendar = (forecast) => {
        if (!forecast.sunData.goldenHour) return alert('שעת זהב לא זמינה ליום זה.');
        const startTime = forecast.sunData.goldenHour.toISOString().replace(/-|:|\.\d+/g, '');
        const endTime = forecast.date.toISOString().replace(/-|:|\.\d+/g, '');
        const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('🌅 צילום שקיעה - Golden Hour')}&dates=${startTime}/${endTime}&details=${encodeURIComponent('ציון שקיעה צפוי: ' + forecast.eval.score + '% - ' + forecast.eval.desc)}`;
        window.open(calUrl, '_blank');
    };

    useEffect(() => {
        if (forecasts.length > 0) {
            setAnimateBars(false); // reset

            // Set App background to today's sunset gradient
            setAppGradient(forecasts[0].eval.gradientClass);

            const timer = setTimeout(() => {
                setAnimateBars(true);
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setAppGradient('default');
        }
    }, [forecasts]);

    const handleSearch = async () => {
        const query = cityInput.trim();
        if (!query) return;

        resetState();
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=he`);
            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) {
                throw new Error('לא מצאנו את העיר שחיפשת. נסה שוב.');
            }

            const location = geoData.results[0];
            setLocationName(`תחזית עבור ${location.name}${location.country ? ', ' + location.country : ''}`);

            await fetchSunsetForecast(location.latitude, location.longitude);
        } catch (error) {
            handleError(error.message);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleGeolocation = () => {
        if (!navigator.geolocation) {
            handleError('הדפדפן שלך לא תומך באיתור מיקום.');
            return;
        }

        resetState();
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setLocationName('תחזית למיקום הנוכחי שלך');
            try {
                await fetchSunsetForecast(latitude, longitude);
            } catch (error) {
                handleError('שגיאה בקבלת נתוני שקיעה למיקום שלך.');
            }
        }, () => {
            handleError('לא הצלחנו לקבל את המיקום שלך. ודא שאישרת גישה למיקום.');
        });
    };

    const fetchSunsetForecast = async (lat, lon) => {
        try {
            // Fetch Weather API
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunset&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,relative_humidity_2m&timezone=auto`;
            // Fetch Air Quality API (Aerosols)
            const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=aerosol_optical_depth&timezone=auto`;

            const [weatherRes, aqRes] = await Promise.all([
                fetch(weatherUrl),
                fetch(aqUrl)
            ]);

            if (!weatherRes.ok || !aqRes.ok) throw new Error('שגיאה בקבלת נתוני מזג אוויר ואיכות אוויר.');

            const weatherData = await weatherRes.json();
            const aqData = await aqRes.json();

            processData(weatherData, aqData, lat, lon);
        } catch (error) {
            handleError(error.message);
        }
    };

    const processData = (weatherData, aqData, lat, lon) => {
        const daily = weatherData.daily;
        const hourly = weatherData.hourly;
        const aqHourly = aqData.hourly;

        if (!daily || !daily.sunset) {
            handleError('אין נתוני שקיעה זמינים למיקום זה.');
            return;
        }

        const newForecasts = [];
        for (let i = 0; i < daily.sunset.length; i++) {
            const sunsetTimeStr = daily.sunset[i];
            const sunsetDate = new Date(sunsetTimeStr);

            const sunsetHourISO = sunsetTimeStr.slice(0, 14) + "00";
            let hourIndex = hourly.time.findIndex(t => t.startsWith(sunsetHourISO));
            let aqHourIndex = aqHourly.time.findIndex(t => t.startsWith(sunsetHourISO));

            if (hourIndex === -1) {
                const searchTime = sunsetDate.getTime();
                hourIndex = hourly.time.reduce((closestIdx, t, idx) => {
                    const diff = Math.abs(new Date(t).getTime() - searchTime);
                    const closestDiff = Math.abs(new Date(hourly.time[closestIdx]).getTime() - searchTime);
                    return diff < closestDiff ? idx : closestIdx;
                }, 0);
                aqHourIndex = hourIndex; // Approximate matching indexing
            }

            const sunsetConditions = {
                lowClouds: hourly.cloud_cover_low[hourIndex],
                midClouds: hourly.cloud_cover_mid[hourIndex],
                highClouds: hourly.cloud_cover_high[hourIndex],
                visibility: hourly.visibility[hourIndex],
                humidity: hourly.relative_humidity_2m[hourIndex],
                aerosol: aqHourly.aerosol_optical_depth ? aqHourly.aerosol_optical_depth[aqHourIndex] : 0
            };

            const evaluation = evaluateSunset(sunsetConditions);

            // Calculate advanced Sun data with SunCalc for the exact day and coordinates
            const sunTimes = SunCalc.getTimes(sunsetDate, lat, lon);
            const sunPos = SunCalc.getPosition(sunsetDate, lat, lon);
            const azimuthInfo = formatAzimuth(sunPos.azimuth);

            newForecasts.push({
                date: sunsetDate,
                eval: evaluation,
                conditions: sunsetConditions,
                id: i,
                sunData: {
                    goldenHour: sunTimes.goldenHour,
                    blueHour: sunTimes.night, // Using night for blue hour transition
                    azimuth: azimuthInfo,
                    dawn: sunTimes.dawn,
                    dusk: sunTimes.dusk
                }
            });
        }

        // --- Calculate Closest Spots ---
        const spotsWithDist = sunsetSpots.map(s => ({
            ...s,
            distance: getDistanceFromLatLonInKm(lat, lon, s.lat, s.lon)
        }));
        spotsWithDist.sort((a, b) => a.distance - b.distance);
        setClosestSpots(spotsWithDist.slice(0, 6)); // Show top 6 closest spots

        setForecasts(newForecasts);
        setIsLoading(false);
    };

    const resetState = () => {
        setIsLoading(true);
        setErrorMsg('');
        setForecasts([]);
        setLocationName('מחפש נתונים, שולף איכות אוויר...');
    };

    const handleError = (msg) => {
        setIsLoading(false);
        setErrorMsg(msg);
        setForecasts([]);
    };

    const renderForecastCards = (forecastsToRender, isHero = false) => {
        return forecastsToRender.map(forecast => {
            const { date, eval: ev, id, sunData } = forecast;
            const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
            const dayName = days[date.getDay()];
            let todayStr = "";

            const now = new Date();
            if (date.getDate() === now.getDate() && date.getMonth() === now.getMonth()) {
                todayStr = " (היום)";
            } else if (date.getDate() === now.getDate() + 1 || (now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() && date.getDate() === 1)) {
                todayStr = " (מחר)";
            }

            const dateStr = `${dayName}${todayStr} - ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
            const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

            const goldenHourStr = sunData.goldenHour ? sunData.goldenHour.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : "לא ידוע";
            const dawnStr = sunData.dawn ? sunData.dawn.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : "--:--";
            const duskStr = sunData.dusk ? sunData.dusk.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : "--:--";

            return (
                <div className="tilt-wrapper-outer" key={id}>
                    <Tilt
                        tiltMaxAngleX={isHero ? 2 : 5}
                        tiltMaxAngleY={isHero ? 2 : 5}
                        perspective={1500}
                        transitionSpeed={1000}
                        scale={isHero ? 1.01 : 1.02}
                        className="tilt-wrapper"
                    >
                        <div className={`day-card ${isHero ? 'hero-card' : ''} ${ev.gradientClass}`}>
                            {isHero && <div className="hero-badge">התחזית להיום</div>}

                            {/* V4 AI Background Image */}
                            <div className="card-bg-image" style={{ backgroundImage: `url(/${ev.img})` }} />

                            {/* Floating Dust Particles */}
                            <div className="dust-particle dp-1"></div>
                            <div className="dust-particle dp-2"></div>
                            <div className="dust-particle dp-3"></div>

                            {/* Moving Inner Background Elements */}
                            <div className="inner-glow-1"></div>
                            <div className="inner-glow-2"></div>

                            <div className="card-content">
                                {/* Score Moved to Top */}
                                <div className="score-container">
                                    <div className="score-header-top">
                                        <div className="score-label">ציון שקיעה</div>
                                        <div className={`card-score-text glow-text ${isHero ? 'hero-score-text' : ''}`}>{ev.score}%</div>
                                    </div>
                                    <div className={`score-bar-bg ${isHero ? 'hero-score-bar' : ''}`}>
                                        <div
                                            className={`score-bar-fill ${ev.colorClass}`}
                                            style={{ width: animateBars ? `${ev.score}%` : '0%' }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="card-header">
                                    <div className="card-date">{dateStr}</div>
                                    <div className="card-azimuth" title="כיוון חזותי לשמש">
                                        <Compass size={14} className="compass-icon" />
                                        <span>{sunData.azimuth.direction} {sunData.azimuth.degrees}°</span>
                                    </div>
                                </div>

                                <div className="card-time-wrap">
                                    <div className="sun-icon-container">
                                        <Sunrise size={45} className="sun-icon animate-pulse-slow" strokeWidth={1.5} />
                                    </div>
                                    <div className="card-time">{timeStr}</div>
                                </div>

                                <div className="card-extra-grid">
                                    <div className="extra-item">
                                        <span className="extra-label">עננים</span>
                                        <span className="extra-val">{forecast.conditions.highClouds}%</span>
                                    </div>
                                    <div className="extra-item">
                                        <span className="extra-label">אור ראשון</span>
                                        <span className="extra-val">{dawnStr}</span>
                                    </div>
                                    <div className="extra-item">
                                        <span className="extra-label">אור אחרון</span>
                                        <span className="extra-val">{duskStr}</span>
                                    </div>
                                </div>

                                <div className="card-golden-hour">
                                    <Sunrise size={14} className="sun-icon inline" style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '0.4rem' }} />
                                    <span className="gh-label">שעת זהב:</span> <span className="gh-val">{goldenHourStr}</span>
                                </div>

                                <div className="card-desc">
                                    <h4 className="desc-title">{ev.desc}</h4>
                                    <p className="desc-detail">{ev.detailText}</p>
                                </div>

                                {/* Pro Data Section */}
                                <div className="pro-data-wrapper">
                                    <button className="pro-data-toggle" onClick={() => toggleProData(id)}>
                                        <span>נתונים מתקדמים לצלמים</span>
                                        {expandedCardId === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>

                                    <div className={`pro-data-content ${expandedCardId === id ? 'open' : ''}`}>
                                        <div className="pro-grid">
                                            <div className="pro-item">
                                                <span className="pro-label">עננים נמוכים</span>
                                                <span className="pro-val">{forecast.conditions.lowClouds}%</span>
                                            </div>
                                            <div className="pro-item">
                                                <span className="pro-label">עננים בינוניים</span>
                                                <span className="pro-val">{forecast.conditions.midClouds}%</span>
                                            </div>
                                            <div className="pro-item">
                                                <span className="pro-label">אארוסולים (אבק)</span>
                                                <span className="pro-val">{forecast.conditions.aerosol}</span>
                                            </div>
                                            <div className="pro-item">
                                                <span className="pro-label">לחות</span>
                                                <span className="pro-val">{forecast.conditions.humidity}%</span>
                                            </div>
                                            <div className="pro-item">
                                                <span className="pro-label">ראות ק"מ</span>
                                                <span className="pro-val">{(forecast.conditions.visibility / 1000).toFixed(1)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="card-actions">
                                    <button className="action-btn" onClick={() => handleCalendar(forecast)} title="הוסף ליומן שעת זהב">
                                        <CalendarPlus size={18} /> הוסף ליומן
                                    </button>
                                    <button className="action-btn" onClick={scrollToSpots} title="הצג נקודות תצפית">
                                        <Map size={18} /> נקודות תצפית
                                    </button>
                                    <button className="action-btn" onClick={() => handleShare(forecast)} title="שתף תחזית">
                                        <Share2 size={18} /> שתף
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Tilt>
                </div>
            );
        });
    };

    return (
        <div className={`app-wrapper ${appGradient}`}>
            <div className="background-animation"></div>

            {/* V4 Global Clouds & Sun Glow */}
            <div className="global-clouds">
                <div className="cloud-element cloud-base cloud-1"></div>
                <div className="cloud-element cloud-base cloud-2"></div>
                <div className="cloud-element cloud-base cloud-3"></div>
                <div className="cloud-element cloud-base cloud-4"></div>
                <div className="sun-glow"></div>
            </div>

            {/* Flying Birds Animation */}
            <div className="birds-container">
                <div className="bird bird-1"></div>
                <div className="bird bird-2"></div>
                <div className="bird bird-3"></div>
            </div>

            <div className="stars-overlay"></div>

            <div className="sunset-container">
                <header>
                    <h1>תחזית שקיעות V3</h1>
                    <p className="subtitle">האלגוריתם החדש והמדויק לשקיעות נדירות באמת</p>
                </header>

                <section className="search-section">
                    <div className="search-box">
                        <Search className="search-icon-left" />
                        <input
                            type="text"
                            placeholder="חפש עיר (למשל: תל אביב, ירושלים)..."
                            value={cityInput}
                            onChange={(e) => setCityInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <button className="search-btn" onClick={handleSearch} title="חפש">
                            חיפוש
                        </button>
                    </div>
                    <button className="glass-btn" onClick={handleGeolocation}>
                        <MapPin size={20} />
                        השתמש במיקום הנוכחי שלי
                    </button>
                </section>

                {(isLoading || forecasts.length > 0 || closestSpots.length > 0) && !errorMsg && (
                    <main className="forecast-container" ref={resultsRef}>
                        {isLoading && <Sun className="loader-sun" size={80} />}
                        <h2 className="location-name">{locationName}</h2>

                        {!isLoading && forecasts.length > 0 && (
                            <>
                                {/* Hero Card Section representing Today */}
                                <div className="hero-forecast-section">
                                    {renderForecastCards([forecasts[0]], true)}
                                </div>

                                <div className="secondary-forecast-header">
                                    <h3>הימים הבאים</h3>
                                </div>
                                <div className="forecast-grid">
                                    {renderForecastCards(forecasts.slice(1), false)}
                                </div>
                            </>
                        )}

                        {!isLoading && closestSpots.length > 0 && (
                            <div className="spots-section fade-in" ref={spotsSectionRef}>
                                <div className="spots-header">
                                    <Map size={24} className="spots-icon" />
                                    <h3>מקומות טובים לראות שקיעה</h3>
                                    <p className="spots-subtitle">(מבוסס על המיקום שלך)</p>
                                </div>
                                <div className="spots-grid">
                                    {closestSpots.map((spot, idx) => {
                                        let SpotIcon = MapPin;
                                        if (spot.type === 'beach') SpotIcon = Wind;
                                        if (spot.type === 'mountain') SpotIcon = Navigation;
                                        if (spot.type === 'hill') SpotIcon = Sun;
                                        if (spot.type === 'viewpoint') SpotIcon = Map;
                                        if (spot.type === 'cliff') SpotIcon = Sunrise;

                                        return (
                                            <div key={idx} className="spot-card glow-hover">
                                                <div className="spot-type-badge">
                                                    {spot.type === 'beach' && 'חוף'}
                                                    {spot.type === 'mountain' && 'הר'}
                                                    {spot.type === 'hill' && 'גבעה'}
                                                    {spot.type === 'viewpoint' && 'תצפית'}
                                                    {spot.type === 'cliff' && 'מצוק'}
                                                </div>
                                                <div className="spot-name">
                                                    <SpotIcon size={18} /> {spot.name}
                                                </div>
                                                <p className="spot-desc">{spot.desc}</p>
                                                <div className="spot-dist">
                                                    <Navigation size={14} /> במרחק {spot.distance.toFixed(1)} ק"מ
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </main>
                )}

                {errorMsg && <div className="error-msg"><Info size={24} /> {errorMsg}</div>}
            </div>
        </div>
    );
};

export default SunsetPredictor;
