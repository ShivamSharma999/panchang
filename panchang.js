const { AstronomicalCalculator } = require('@bidyashish/panchang');

const MONTHS = [
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

// Delhi default
const DEFAULT_LOCATION = {
  latitude: 28.6139,
  longitude: 77.2090,
  timezone: "Asia/Kolkata"
};

function normalize(deg) {
  return ((deg % 360) + 360) % 360;
}

function getRashi(longitude) {
  return Math.floor(normalize(longitude) / 30);
}

function isAmavasya(tithi) {
  return (
    tithi.name.toLowerCase().includes("amavasya") ||
    tithi.number === 30
  );
}

/*
  Finds exact previous/next amavasya
*/
function findAmavasya(calculator, location, startDate, direction) {

  let date = new Date(startDate);

  for (let i = 0; i < 35; i++) {

    const p = calculator.calculatePanchanga({
      date,
      location
    });

    if (isAmavasya(p.tithi)) {
      return {
        date: new Date(date),
        panchanga: p
      };
    }

    date.setHours(date.getHours() + (24 * direction));
  }

  return null;
}

/*
  REAL adhik masa calculation

  If Sun does NOT change rashi
  between two consecutive amavasyas,
  then it is adhik masa.
*/
function calculateLunarMonth(calculator, location, targetDate) {

  const prevAmavasya = findAmavasya(
    calculator,
    location,
    targetDate,
    -1
  );

  const nextAmavasya = findAmavasya(
    calculator,
    location,
    targetDate,
    1
  );

  if (!prevAmavasya || !nextAmavasya) {
    return {
      monthName: "Unknown",
      isAdhika: false
    };
  }

  const prevSun = calculator.calculatePlanetaryPositions(
    prevAmavasya.date
  );

  const nextSun = calculator.calculatePlanetaryPositions(
    nextAmavasya.date
  );

  const prevRashi = getRashi(prevSun.Sun.longitude);
  const nextRashi = getRashi(nextSun.Sun.longitude);

  /*
    IMPORTANT:

    Month name is based on the
    rashi entered AFTER amavasya.
  */
  const monthIndex = (nextRashi + 1) % 12;

  return {
    monthName: MONTHS[monthIndex],
    isAdhika: prevRashi === nextRashi
  };
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

    const lunarMonth = calculateLunarMonth(
      calculator,
      location,
      targetDate
    );

    return {

      date: targetDate,

      tithi: panchanga.tithi,

      vara: panchanga.vara,

      nakshatra: panchanga.nakshatra,

      yoga: panchanga.yoga,

      karana: panchanga.karana,

      lunarMonth: {
        amanta: lunarMonth.isAdhika
          ? `Adhika ${lunarMonth.monthName}`
          : lunarMonth.monthName,

        isAdhika: lunarMonth.isAdhika
      },

      sunrise: panchanga.sunrise,

      sunset: panchanga.sunset
    };

  } finally {
    calculator.cleanup();
  }
}
console.log(getPanchang({}));
module.exports = {
  getPanchang
};
