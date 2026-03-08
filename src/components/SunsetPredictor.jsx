import React, { useState, useEffect, useRef } from 'react';
import SunCalc from 'suncalc';
import Tilt from 'react-parallax-tilt';
import { Compass, Sunset, Info, MapPin, Search, CalendarPlus, Share2, ChevronDown, ChevronUp, Wind, Map, Navigation, Sun, Thermometer } from 'lucide-react';
import './SunsetPredictor.css';

// --- Recommended Spots DB (Israel Fallback) ---
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
    const { highClouds, midClouds, lowClouds, visibility, humidity, aerosol, temperature } = conditions;

    let score = 0;
    let bonuses = [];

    // ============================================================
    // 1. חלון האופק (0-30 נקודות)
    //    האם יש "חלון" שדרכו השמש יכולה לזרוח ממש לפני השקיעה?
    //    עננים נמוכים הם הבעיה הכי גדולה כי הם ממש בגובה קו האופק.
    // ============================================================
    let horizonScore = 0;

    if (lowClouds <= 5) {
        horizonScore = 30; // אופק קריסטל - שקיעה גלויה לחלוטין
    } else if (lowClouds <= 15) {
        horizonScore = 26; // בעיקר פתוח, פתיתי עננים מוסיפים דרמה
    } else if (lowClouds <= 30) {
        horizonScore = 20; // עדיין סיכוי טוב לראות את השמש בשקיעה עצמה
    } else if (lowClouds <= 45) {
        horizonScore = 13; // פחות מ50/50 - לפעמים השמש פורצת, לפעמים לא
    } else if (lowClouds <= 60) {
        horizonScore = 6;  // סיכוי נמוך לראות כדור השמש עצמו
    } else if (lowClouds <= 80) {
        horizonScore = 2;  // כמעט בטוח מוסתר, אבל פסים של אור אפשריים
    } else {
        horizonScore = 0;  // מוסתר לחלוטין
    }

    score += horizonScore;

    // ============================================================
    // 2. קנבס הצבע בשמיים (0-28 נקודות)
    //    עננים גבוהים ובינוניים הם "לוח הציור" של השקיעה.
    //    הם נצבעים בכתום/ורוד/אדום כשהשמש פוגעת בהם מלמטה.
    //    הכי טוב: 30-65% עננות גבוהה + מעט בינונית.
    // ============================================================
    let canvasScore = 0;
    // עננות גבוהה ובינונית - Weighted Combo
    const canvasCover = (highClouds * 0.65) + (midClouds * 0.35);

    if (canvasCover >= 30 && canvasCover <= 60) {
        canvasScore = 28; // מושלם - המון קנבס אבל לא סגור לחלוטין
    } else if (canvasCover > 60 && canvasCover <= 80) {
        canvasScore = 20; // הרבה עננות - צבעונית אבל קצת כבדה
    } else if (canvasCover >= 15 && canvasCover < 30) {
        canvasScore = 18; // קצת קנבס - צבעים ממוקדים ליפים
    } else if (canvasCover > 80) {
        canvasScore = 8;  // שמיים אפורים-כבדים, אבל שכבה עליונה יכולה להאיר
    } else {
        canvasScore = 5;  // שמיים נקיים לחלוטין - שקיעה נקייה אבל פחות דרמה
    }

    // אם האופק סגור ברובו, הקנבס שם פחות
    if (horizonScore <= 6) canvasScore = Math.round(canvasScore * 0.4);

    score += canvasScore;

    // ============================================================
    // 3. אאוסולים — חלקיקי אוויר (0-27 נקודות)
    //    זה הגורם הכי לא מוכר ושהכי חשוב לצבעים!
    //    אבק סהרה, עשן, מלח ים = פיזור אור לאדום/כתום/ורוד.
    //    גם עם 30% עננות נמוכה, אאוסול גבוה = שקיעה מדהימה על האופק
    // ============================================================
    let aerosolScore = 0;

    if (aerosol >= 0.30) {
        aerosolScore = 27; // סופת חול / אבק עצום — שמיים בוערים
        bonuses.push('🏜️ אבק סהרה');
    } else if (aerosol >= 0.20) {
        aerosolScore = 22; // אבק גבוה — כתום-אדום עז
        bonuses.push('🌫️ חלקיקי אבק גבוהים');
    } else if (aerosol >= 0.12) {
        aerosolScore = 16; // מודרטי — גוון זהוב-כתום חזק
    } else if (aerosol >= 0.07) {
        aerosolScore = 10; // קצת — שעה מוזהבת נחמדה
    } else if (aerosol >= 0.04) {
        aerosolScore = 5;  // מינימלי — אוויר צלול, צבעים עדינים
    } else {
        aerosolScore = 0;  // אוויר נקי מאוד — שקיעה ורודה עדינה
    }

    score += aerosolScore;

    // ============================================================
    // 4. ראות (0-10 נקודות)
    //    ראות גבוהה + אאוסול = הצירוף הכי טוב לצבעי שקיעה
    // ============================================================
    let visScore = 0;
    if (visibility > 50000) visScore = 10;
    else if (visibility > 30000) visScore = 8;
    else if (visibility > 15000) visScore = 5;
    else if (visibility > 5000) visScore = 2;
    else visScore = 0; // ערפל כבד — מוסתר

    score += visScore;

    // ============================================================
    // 5. לחות (בונוס/קנס קטן)
    //    לחות גבוהה יוצרת ערפיח שמעמעם את הצבעים.
    //    לחות נמוכה = צבעים חדים וחיים.
    // ============================================================
    if (humidity < 45) {
        score += 5; // אוויר יבש = צבעים חדים
    } else if (humidity >= 45 && humidity <= 65) {
        score += 0; // נייטרל
    } else if (humidity > 65 && humidity <= 80) {
        score -= 3; // לחות גבוהה = ערפיח קל
    } else {
        score -= 7; // לחות כבדה = שקיעה מטושטשת
    }

    // ============================================================
    // 6. בונוס שילוב: "עננות נמוכה + אאוסול" = שקיעה דרמטית!
    //    זה מה שכנראה קרה אצלך! 
    //    עננות נמוכה בינונית + אאוסול = כתום/אדום עז על האופק.
    //    האלגוריתם הישן עניש את זה. החדש נותן בונוס.
    // ============================================================
    if (lowClouds >= 20 && lowClouds <= 50 && aerosol >= 0.10) {
        const dramaBonus = Math.round(aerosol * 30); // עד +9 נקודות
        score += dramaBonus;
        bonuses.push(`🌋 שקיעה דרמטית (עננות+אאוסול)`);
    }

    // ============================================================
    // 7. בונוס שקיעה "נקייה-פסטל" — שמיים ללא עננים + נקיים
    //    שקיעה פשוטה אבל יפה בורדו-ורוד-כחול לאחר השקיעה
    // ============================================================
    if (lowClouds < 5 && highClouds < 10 && midClouds < 10) {
        score += 5;
        bonuses.push('🌸 שקיעה פסטל נקייה');
    }

    // Final clamp
    score = Math.max(0, Math.min(100, Math.round(score)));

    // ============================================================
    // תיאורים — מדורג ומשוכלל
    // ============================================================
    let desc, detailText, colorClass, gradientClass, img;

    if (score >= 85) {
        if (aerosol >= 0.20) {
            desc = 'שקיעה פסיכית בוערת 🔥';
            detailText = `שמיים בוערים צפויים! אבק גבוה (AOD: ${aerosol?.toFixed(2)}) בשילוב עם עננות אידיאלית יצרו כנראה שקיעה ברמה שרואים פעם בחודש. ${bonuses.join(' · ')}`;
        } else {
            desc = 'נדיר ומטורף 🤩';
            detailText = `תנאים מושלמים! עננות נוצה גבוהה + אוויר נקי = שמיים ורוד-כתום ריסוסי מקצה לקצה. ${bonuses.join(' · ')}`;
        }
        colorClass = 'score-amazing';
        gradientClass = 'bg-amazing';
        img = 'amazing.png';

    } else if (score >= 68) {
        if (aerosolScore >= 16) {
            desc = 'שמיים כתומים-בוערים 🌋';
            detailText = `חלקיקי אוויר גבוהים (AOD: ${aerosol?.toFixed(2)}) ייצרו צבעי כתום ואדום עזים על קו האופק, גם אם העננים לא יצבעו כולם. ${bonuses.join(' · ')}`;
        } else {
            desc = 'שקיעה מרהיבה 🌅';
            detailText = `שקיעה יפה עם גוונים של כתום וורוד. העננות הגבוהה תצבע את השמיים לטווח ארוך אחרי שקיעת השמש. ${bonuses.join(' · ')}`;
        }
        colorClass = 'score-good';
        gradientClass = 'bg-good';
        img = 'good.png';

    } else if (score >= 45) {
        if (bonuses.includes('🌋 שקיעה דרמטית (עננות+אאוסול)')) {
            desc = 'שקיעה דרמטית ומפתיעה ⚡';
            detailText = `שילוב של עננות נמוכה ואאוסול יכול לייצר פסים דרמטיים של אדום-כתום על קו האופק, גם אם השמיים לא "נצבעו" בגדול. ${bonuses.join(' · ')}`;
        } else {
            desc = 'שקיעה נחמדה ⛅';
            detailText = 'שקיעה סולידית עם קצת צבע. לא דרמטית במיוחד אבל שווה לצאת לאוויר.';
        }
        colorClass = 'score-average';
        gradientClass = 'bg-average';
        img = 'average.png';

    } else if (score >= 25) {
        desc = 'שקיעה חלשה 🌥️';
        detailText = 'כנראה לא שווה יציאה מיוחדת. צבעים עמומים, עננות מפריעה לחזות באופק.';
        colorClass = 'score-average';
        gradientClass = 'bg-average';
        img = 'average.png';

    } else {
        desc = 'מוסתר / שמיים אפורים ☁️';
        detailText = 'עננות כבדה על קו האופק. השמש לא תהיה גלויה ולא יהיו צבעים משמעותיים.';
        colorClass = 'score-bad';
        gradientClass = 'bg-bad';
        img = 'bad.png';
    }

    return { score, desc, detailText, colorClass, gradientClass, img, temperature, bonuses };
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
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

    const resultsRef = useRef(null);
    const spotsSectionRef = useRef(null);

    const scrollToSpots = () => {
        const spotsEl = document.querySelector('.spots-section');
        if (spotsEl) {
            spotsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        const timer = setTimeout(async () => {
            if (cityInput.trim().length > 1) {
                setIsFetchingSuggestions(true);
                try {
                    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityInput)}&count=5&language=he`);
                    const data = await res.json();
                    setSuggestions(data.results || []);
                    setShowSuggestions(true);
                } catch (err) {
                    console.error('Error fetching suggestions', err);
                } finally {
                    setIsFetchingSuggestions(false);
                }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [cityInput]);

    const handleSuggestionClick = (suggestion) => {
        setCityInput(suggestion.name);
        setShowSuggestions(false);
        setLocationName(`תחזית עבור ${suggestion.name}${suggestion.country ? ', ' + suggestion.country : ''}`);
        fetchSunsetForecast(suggestion.latitude, suggestion.longitude);
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

    const getFallbackSpots = (latitude, longitude) => {
        const spotsWithDist = sunsetSpots.map(s => ({
            ...s,
            distance: getDistanceFromLatLonInKm(latitude, longitude, s.lat, s.lon)
        }));
        // Limit fallback spots to 25km radius so we don't return spots from across the country
        const closeSpots = spotsWithDist.filter(s => s.distance <= 25);
        closeSpots.sort((a, b) => a.distance - b.distance);
        return closeSpots.slice(0, 6);
    };

    const fetchDynamicSpots = async (lat, lon) => {
        try {
            // Find viewpoints and beaches within ~12km, with a 5 second timeout
            const radius = 12000;
            const query = `
                [out:json][timeout:5];
                (
                  node["tourism"="viewpoint"](around:${radius},${lat},${lon});
                  way["tourism"="viewpoint"](around:${radius},${lat},${lon});
                  node["natural"="beach"](around:${radius},${lat},${lon});
                  way["natural"="beach"](around:${radius},${lat},${lon});
                  node["leisure"="park"](around:${radius},${lat},${lon});
                  way["leisure"="park"](around:${radius},${lat},${lon});
                  node["natural"="peak"](around:${radius},${lat},${lon});
                  node["historic"="ruins"](around:${radius},${lat},${lon});
                  way["historic"="ruins"](around:${radius},${lat},${lon});
                  node["leisure"="nature_reserve"](around:${radius},${lat},${lon});
                  way["leisure"="nature_reserve"](around:${radius},${lat},${lon});
                  node["amenity"="bench"](around:${radius},${lat},${lon});
                );
                out center 50;
            `;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Overpass API failed: ${response.status}`);

            const data = await response.json();

            if (!data || !data.elements || data.elements.length === 0) {
                setClosestSpots(getFallbackSpots(lat, lon));
                return;
            }

            let spots = data.elements.map(el => {
                const elementLat = el.lat || el.center.lat;
                const elementLon = el.lon || el.center.lon;

                let name = '';
                if (el.tags) {
                    name = el.tags['name:he'] || el.tags.name || '';
                }

                let typeText = 'נקודת נוף / תצפית';
                if (el.tags) {
                    if (el.tags.natural === 'beach') typeText = 'חוף ים';
                    else if (el.tags.leisure === 'park') typeText = 'פארק / גן ציבורי';
                    else if (el.tags.natural === 'peak') typeText = 'פסגה / אזור גבוה';
                    else if (el.tags.historic === 'ruins') typeText = 'עתיקות / חורבה';
                    else if (el.tags.leisure === 'nature_reserve') typeText = 'שמורת טבע';
                    else if (el.tags.amenity === 'bench') typeText = 'ספסל ציבורי';
                }

                if (!name) name = typeText;

                return {
                    name: name,
                    desc: `${typeText} פוטנציאלי באזור שלך`,
                    lat: elementLat,
                    lon: elementLon,
                    distance: getDistanceFromLatLonInKm(lat, lon, elementLat, elementLon)
                };
            });

            const namedSpots = spots.filter(s => s.name !== 'נקודת נוף / תצפית' && s.name !== 'פארק / גן ציבורי' && s.name !== 'ספסל ציבורי' && s.name !== 'חוף ים');
            if (namedSpots.length >= 2) {
                spots = namedSpots;
            }

            spots = spots.filter((spot, index, self) =>
                index === self.findIndex((t) => (t.name === spot.name))
            );

            spots.sort((a, b) => a.distance - b.distance);
            setClosestSpots(spots.slice(0, 6));

        } catch (error) {
            console.error("Error fetching dynamic spots, using fallback:", error);
            setClosestSpots(getFallbackSpots(lat, lon));
        }
    };

    const fetchSunsetForecast = async (lat, lon) => {
        try {
            // Fetch Weather API with temperature
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunset&hourly=temperature_2m,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,relative_humidity_2m&timezone=auto`;
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
                temperature: hourly.temperature_2m[hourIndex],
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

        // Fetch dynamic spots based on coordinates
        fetchDynamicSpots(lat, lon);

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
                                        <div className="score-title-group">
                                            <div className="score-label">ציון שקיעה</div>
                                            <img src={`/${ev.img}`} alt="Sunset Preview" className="sunset-thumbnail" />
                                        </div>
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
                                    <div className="sun-time-block">
                                        <div className="sun-icon-container">
                                            <Sunset size={45} className="sun-icon animate-pulse-slow" strokeWidth={1.5} />
                                        </div>
                                        <div className="card-time">{timeStr}</div>
                                        {ev.temperature && (
                                            <div className="temperature-badge" title="טמפרטורה צפויה בשקיעה">
                                                <Thermometer size={18} className="temp-icon" />
                                                <span>{Math.round(ev.temperature)}°C</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="card-golden-hour">
                                        <Sunset size={14} className="sun-icon inline" style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '0.4rem' }} />
                                        <span className="gh-label">שעת זהב:</span> <span className="gh-val">{goldenHourStr}</span>
                                    </div>
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
                    <h1>תחזית שקיעות</h1>
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
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            onFocus={() => cityInput.trim().length > 1 && setShowSuggestions(true)}
                        />
                        {showSuggestions && suggestions.length > 0 && (
                            <ul className="suggestions-dropdown">
                                {suggestions.map((s, idx) => (
                                    <li key={idx} onClick={() => handleSuggestionClick(s)}>
                                        <MapPin size={16} />
                                        <span className="suggestion-name">{s.name}</span>
                                        <span className="suggestion-admin">{s.admin1 || s.country}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
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
                                    <p className="spots-subtitle">(מקומות מומלצים באזורך)</p>
                                </div>
                                <div className="spots-grid">
                                    {closestSpots.map((spot, idx) => (
                                        <div key={idx} className="spot-card glow-hover">
                                            <div className="spot-name">
                                                <MapPin size={18} /> {spot.name}
                                            </div>
                                            <p className="spot-desc">{spot.desc}</p>
                                            <div className="spot-dist">
                                                <Navigation size={14} /> במרחק {spot.distance.toFixed(1)} ק"מ
                                            </div>
                                            <div className="spot-nav-links" style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem', justifyContent: 'center' }}>
                                                <a href={`https://waze.com/ul?ll=${spot.lat},${spot.lon}&navigate=yes`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '0.5rem 1rem', borderRadius: '12px', color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                                                    <Compass size={16} /> Waze
                                                </a>
                                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lon}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.5rem 1rem', borderRadius: '12px', color: '#34d399', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                                                    <Map size={16} /> Maps
                                                </a>
                                            </div>
                                        </div>
                                    ))}
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
