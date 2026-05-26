const { AstronomicalCalculator } = require('@bidyashish/panchang');

const MASA_NAMES = [
  "Chaitra",
  "Vaishakha",
  "Jyeshtha",
  "Ashadha",
  "Shravana",
  "Bhadrapada",
  "Ashwin",
  "Kartika",
  "Margashirsha",
  "Pausha",
  "Magha",
  "Phalguna"
];

// Default location = Delhi
const DEFAULT_LOCATION = {
  latitude: 28.6139,
  longitude: 77.2090,
  timezone: "Asia/Kolkata"
};

function normalizeDegrees(deg) {
  return ((deg % 360) + 360) % 360;
}

function getRashi(longitude) {
  return Math.floor(normalizeDegrees(longitude) / 30);
}

function isAmavasya(tithi) {
  return (
    tithi.name.toLowerCase().includes("amavasya") ||
    (tithi.number === 30)
  );
}

function isPurnima(tithi) {
  return (
    tithi.name.toLowerCase().includes("purnima") ||
    (tithi.number === 15 && tithi.paksha === "Shukla")
  );
}

function createUTCDate(date, offset = 0) {
  const d = new Date(date);

  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + offset,
    12,
    0,
    0
  ));
}

function getSunRashi(calculator, date) {
  const positions = calculator.calculatePlanetaryPositions(date);
  return getRashi(positions.Sun.longitude);
}

/*
  Finds previous/next Amavasya or Purnima
*/
function findBoundary(calculator, location, startDate, type, direction) {
  let lastMatched = null;

  for (let i = 0; i < 35; i++) {
    const date = createUTCDate(startDate, i * direction);

    const p = calculator.calculatePanchanga({
      date,
      location
    });

    const matched =
      type === "amavasya"
        ? isAmavasya(p.tithi)
        : isPurnima(p.tithi);

    if (matched) {
      lastMatched = date;
      break;
    }
  }

  return lastMatched;
}

/*
  Adhik Masa Logic

  If Sun does NOT change rashi between
  two consecutive Amavasyas,
  then that lunar month is Adhik Masa.
*/
function calculateAmantaMonth(calculator, location, targetDate) {
  const prevAmavasya = findBoundary(
    calculator,
    location,
    targetDate,
    "amavasya",
    -1
  );

  const nextAmavasya = findBoundary(
    calculator,
    location,
    targetDate,
    "amavasya",
    1
  );

  if (!prevAmavasya || !nextAmavasya) {
    return {
      monthName: "Unknown",
      isAdhika: false
    };
  }

  const prevRashi = getSunRashi(calculator, prevAmavasya);
  const nextRashi = getSunRashi(calculator, nextAmavasya);

  /*
    IMPORTANT:
    Lunar month is named from the
    solar sign entered AFTER Amavasya.

    This fixes your previous bug.
  */
  const monthIndex = (nextRashi + 1) % 12;

  return {
    monthName: MASA_NAMES[monthIndex],
    isAdhika: prevRashi === nextRashi
  };
}

/*
  Purnimanta Month
*/
function calculatePurnimantaMonth(calculator, location, targetDate) {
  const prevPurnima = findBoundary(
    calculator,
    location,
    targetDate,
    "purnima",
    -1
  );

  if (!prevPurnima) {
    return "Unknown";
  }

  const rashi = getSunRashi(calculator, prevPurnima);

  /*
    Correct purnimanta mapping
  */
  const monthIndex = (rashi + 2) % 12;

  return MASA_NAMES[monthIndex];
}

function getPanchang({
  date = new Date(),
  latitude = DEFAULT_LOCATION.latitude,
  longitude = DEFAULT_LOCATION.longitude,
  timezone = DEFAULT_LOCATION.timezone
} = {}) {

  const calculator = new AstronomicalCalculator();

  const location = {
    latitude,
    longitude,
    timezone
  };

  try {

    const targetDate = new Date(date);

    const panchanga = calculator.calculatePanchanga({
      date: targetDate,
      location
    });

    const amanta = calculateAmantaMonth(
      calculator,
      location,
      targetDate
    );

    const purnimanta = calculatePurnimantaMonth(
      calculator,
      location,
      targetDate
    );

    return {

      date: targetDate.toISOString(),

      location,

      tithi: {
        name: panchanga.tithi.name,
        number: panchanga.tithi.number,
        paksha: panchanga.tithi.paksha,
        percentage: panchanga.tithi.percentage
      },

      vara: {
        name: panchanga.vara.name,
        number: panchanga.vara.number
      },

      nakshatra: {
        name: panchanga.nakshatra.name,
        number: panchanga.nakshatra.number,
        pada: panchanga.nakshatra.pada
      },

      yoga: {
        name: panchanga.yoga.name,
        number: panchanga.yoga.number
      },

      karana: {
        name: panchanga.karana.name,
        number: panchanga.karana.number
      },

      lunarMonth: {
        amanta: amanta.isAdhika
          ? `Adhika ${amanta.monthName}`
          : amanta.monthName,

        purnimanta,

        isAdhika: amanta.isAdhika
      },

      sunrise: panchanga.sunrise,
      sunset: panchanga.sunset,

      rahuKaal: panchanga.rahuKaal
    };

  } finally {
    calculator.cleanup();
  }
}
console.log(getPanchang({}));
module.exports = {
  getPanchang
};
