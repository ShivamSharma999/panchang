const { AstronomicalCalculator } = require('@bidyashish/panchang');

// Mapping of Sun's Sidereal Zodiac Sign (Rashi Index 0-11) at Amavasya to Lunar Month Name
const MASA_NAMES = [
  "Chaitra",
  "Vaishakha",
  "Jyeshtha",
  "Ashadha",
  "Shravana",
  "Bhadrapada",
  "Ashvin",
  "Kartika",
  "Margashirsha",
  "Pausha",
  "Magha",
  "Phalguna"
];

/**
 * Calculates complete Hindu Panchang details along with computed Hindu Lunar Months.
 * 
 * @param {Date} targetDate - The date for calculation.
 * @param {number} latitude - Geographic latitude.
 * @param {number} longitude - Geographic longitude.
 * @param {string} timezone - IANA timezone identifier (e.g. 'Asia/Kolkata').
 * @returns {object} Full Panchang details with Amanta and Purnimanta Month names.
 */
function getPanchang(targetDate, latitude, longitude, timezone) {
  const calculator = new AstronomicalCalculator();
  const location = { latitude, longitude, timezone };

  try {
    // 1. Calculate base daily Panchang elements
    const panchanga = calculator.calculatePanchanga({ date: targetDate, location });

    // 2. Locate the preceding Amavasya (New Moon)
    // If today is already Amavasya, we step back to find the Amavasya that started the current cycle.
    let prevAmavasyaDate = new Date(targetDate);
    const todayPanchang = calculator.calculatePanchanga({ date: prevAmavasyaDate, location });
    const isTodayAmavasya = (todayPanchang.tithi.number === 15 && todayPanchang.tithi.paksha === 'Krishna') || 
                            todayPanchang.tithi.name === 'Amavasya';

    if (isTodayAmavasya) {
      prevAmavasyaDate.setDate(prevAmavasyaDate.getDate() - 1);
    }

    let foundPrev = false;
    for (let i = 0; i < 35; i++) {
      const p = calculator.calculatePanchanga({ date: prevAmavasyaDate, location });
      if ((p.tithi.number === 15 && p.tithi.paksha === 'Krishna') || p.tithi.name === 'Amavasya') {
        foundPrev = true;
        break;
      }
      prevAmavasyaDate.setDate(prevAmavasyaDate.getDate() - 1);
    }

    // 3. Locate the succeeding Amavasya (New Moon)
    let nextAmavasyaDate = new Date(targetDate);
    let foundNext = false;
    for (let i = 0; i < 35; i++) {
      const p = calculator.calculatePanchanga({ date: nextAmavasyaDate, location });
      if ((p.tithi.number === 15 && p.tithi.paksha === 'Krishna') || p.tithi.name === 'Amavasya') {
        foundNext = true;
        break;
      }
      nextAmavasyaDate.setDate(nextAmavasyaDate.getDate() + 1);
    }

    // 4. Extract Sun's sidereal longitude at both boundaries
    const prevPos = calculator.calculatePlanetaryPositions(prevAmavasyaDate,);
    const nextPos = calculator.calculatePlanetaryPositions(nextAmavasyaDate,);

    const sunLongPrev = prevPos.Sun.longitude; // Sidereal degree (0° to 360°)
    const sunLongNext = nextPos.Sun.longitude;

    const prevSunSign = Math.floor(sunLongPrev / 30); // Sidereal Rashi Index (0-11)
    const nextSunSign = Math.floor(sunLongNext / 30);
    // 5. Determine the Month names and Adhika Masa status
    // If the Sun's Rashi is the same at both the start and end of the lunar month,
    // then no Sankranti (transit) occurred, making it a leap month (Adhika Masa).
    const isAdhika = prevSunSign == nextSunSign;
    let amantaMonth = MASA_NAMES[prevSunSign];
    
    // Purnimanta month starts 15 days earlier (from Krishna Paksha)
    // Hence, during Krishna Paksha, the Purnimanta month is one month ahead of Amanta.
    let purnimantaMonth = MASA_NAMES[prevSunSign == 11 ? 0 : prevSunSign + 1];
    if (isAdhika) {
      amantaMonth = "Adhika " + amantaMonth;
      purnimantaMonth = "Adhika" + purnimantaMonth;
    }

    // Assemble the complete response payload
    return {
      date: targetDate.toDateString(),
      location: {
        latitude: latitude,
        longitude: longitude,
        timezone: timezone
      },
      vara: panchanga.vara,
      tithi: panchanga.tithi,
      nakshatra: panchanga.nakshatra,
      yoga: panchanga.yoga,
      karana: panchanga.karana,
      sunrise: panchanga.sunrise,
      sunset: panchanga.sunset,
      rahuKaal: panchanga.rahuKaal,
      lunarMonth: {
        amanta: amantaMonth,
        purnimanta: purnimantaMonth,
        isAdhika: isAdhika,
        sunSignIndexAtAmavasya: prevSunSign,
        sunLongitudeAtAmavasya: parseFloat(sunLongPrev.toFixed(4))
      }
    };

  } catch (error) {
    console.error("Astronomical calculation failed:", error);
    throw error;
  } finally {
    // Always cleanup Swiss Ephemeris resources
    calculator.cleanup();
  }
}

// ==========================================
// EXAMPLE EXECUTION
// ==========================================
const testDate = new Date(); // This lands on today's date
const lat = 28.6139;  // New Delhi
const lng = 77.2090;
const tz = "Asia/Kolkata";

const result = getPanchang(testDate, lat, lng, tz);
console.log(JSON.stringify(result, null, 2));

module.exports = { getPanchang };
