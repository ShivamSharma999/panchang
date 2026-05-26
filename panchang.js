const { AstronomicalCalculator } = require('@bidyashish/panchang');

const LUNAR_MONTHS = [
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

function normalizeDegree(deg) {
  return ((deg % 360) + 360) % 360;
}

function getRashi(longitude) {
  return Math.floor(normalizeDegree(longitude) / 30);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function isAmavasya(panchanga) {
  if (!panchanga || !panchanga.tithi) return false;

  return (
    panchanga.tithi.name === "Amavasya" ||
    panchanga.tithi.number === 30
  );
}

function findPreviousAmavasya(calculator, location, targetDate) {
  for (let i = 0; i <= 35; i++) {
    const d = addDays(targetDate, -i);

    const p = calculator.calculatePanchanga({
      date: d,
      location
    });

    if (isAmavasya(p)) {
      return d;
    }
  }

  throw new Error("Previous Amavasya not found");
}

function findNextAmavasya(calculator, location, targetDate) {
  for (let i = 1; i <= 35; i++) {
    const d = addDays(targetDate, i);

    const p = calculator.calculatePanchanga({
      date: d,
      location
    });

    if (isAmavasya(p)) {
      return d;
    }
  }

  throw new Error("Next Amavasya not found");
}

function getSunRashiAt(calculator, date) {
  const positions = calculator.calculatePlanetaryPositions(date);

  return getRashi(positions.Sun.longitude);
}

function calculateLunarMonth(calculator, location, targetDate) {
  const prevAmavasya = findPreviousAmavasya(
    calculator,
    location,
    targetDate
  );

  const nextAmavasya = findNextAmavasya(
    calculator,
    location,
    targetDate
  );

  const prevRashi = getSunRashiAt(
    calculator,
    prevAmavasya
  );

  const nextRashi = getSunRashiAt(
    calculator,
    nextAmavasya
  );

  const isAdhika = prevRashi === nextRashi;

  /*
    Lunar month naming rule:

    Month name is based on the zodiac sign
    occupied by the Sun during the lunar month.

    Mapping:
    Mesha -> Chaitra
    Vrishabha -> Vaishakha
    Mithuna -> Jyeshtha
    etc.

    Therefore:
    monthIndex = (sunRashi + 1) % 12
  */

  const monthIndex = (prevRashi + 1) % 12;

  let monthName = LUNAR_MONTHS[monthIndex];

  if (isAdhika) {
    monthName = `Adhika ${monthName}`;
  }

  return {
    amanta: monthName,
    isAdhikaAmanta: isAdhika,
    previousAmavasya: prevAmavasya,
    nextAmavasya: nextAmavasya,
    sunRashiPrevious: prevRashi,
    sunRashiNext: nextRashi
  };
}

function getPanchang({
  date = new Date(),
  latitude,
  longitude,
  timezone = "Asia/Kolkata"
}) {
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
      date: targetDate.toDateString(),

      tithi: panchanga.tithi,

      vara: panchanga.vara,

      lunarMonth,

      nakshatra: panchanga.nakshatra,

      yoga: panchanga.yoga,

      karana: panchanga.karana,

      sunrise: panchanga.sunrise,

      sunset: panchanga.sunset,

      rahuKaal: panchanga.rahuKaal
    };
  } finally {
    calculator.cleanup();
  }
}
const result = getPanchang(new Date(), 28.6139, 77.2090, "Asia/Kolkata");
console.log(result);
module.exports = {
  getPanchang
};
