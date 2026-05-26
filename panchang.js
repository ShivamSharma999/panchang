const { AstronomicalCalculator } = require('@bidyashish/panchang');

const MASA_NAMES = [
  "Chaitra",
  "Vaishakha",
  "Jyeshtha",
  "Ashadha",
  "Shravana",
  "Bhadrapada",
  "Ashwina",
  "Kartika",
  "Margashirsha",
  "Pausha",
  "Magha",
  "Phalguna"
];

const MS_PER_DAY = 86400000;

function normalizeDegrees(deg) {
  return ((deg % 360) + 360) % 360;
}

function getSunRashi(longitude) {
  return Math.floor(normalizeDegrees(longitude) / 30);
}

function isAmavasya(panchanga) {
  return (
    panchanga.tithi.name === "Amavasya" ||
    panchanga.tithi.number === 30
  );
}

function isPurnima(panchanga) {
  return (
    panchanga.tithi.name === "Purnima" ||
    (
      panchanga.tithi.number === 15 &&
      panchanga.tithi.paksha === "Shukla"
    )
  );
}

function findPreviousBoundary(
  calculator,
  location,
  targetDate,
  type
) {
  for (let i = 0; i < 35; i++) {
    const d = new Date(targetDate.getTime() - i * MS_PER_DAY);

    const p = calculator.calculatePanchanga({
      date: d,
      location
    });

    const matched =
      type === "amavasya"
        ? isAmavasya(p)
        : isPurnima(p);

    if (matched) {
      return d;
    }
  }

  return null;
}

function findNextBoundary(
  calculator,
  location,
  targetDate,
  type
) {
  for (let i = 1; i < 35; i++) {
    const d = new Date(targetDate.getTime() + i * MS_PER_DAY);

    const p = calculator.calculatePanchanga({
      date: d,
      location
    });

    const matched =
      type === "amavasya"
        ? isAmavasya(p)
        : isPurnima(p);

    if (matched) {
      return d;
    }
  }

  return null;
}

function calculateAdhikaMasa(
  calculator,
  location,
  targetDate
) {
  const prevAmavasya = findPreviousBoundary(
    calculator,
    location,
    targetDate,
    "amavasya"
  );

  const nextAmavasya = findNextBoundary(
    calculator,
    location,
    targetDate,
    "amavasya"
  );

  if (!prevAmavasya || !nextAmavasya) {
    return {
      isAdhika: false,
      monthIndex: 0
    };
  }

  const prevSun = calculator.calculatePlanetaryPositions(prevAmavasya);
  const nextSun = calculator.calculatePlanetaryPositions(nextAmavasya);

  const prevRashi = getSunRashi(prevSun.Sun.longitude);
  const nextRashi = getSunRashi(nextSun.Sun.longitude);

  const isAdhika = prevRashi === nextRashi;

  /*
    Month naming rule (Amanta):
    Month is named from Sun sign during Amavasya.
  */

  const monthIndex = (prevRashi + 1) % 12;

  return {
    isAdhika,
    monthIndex
  };
}

function calculatePurnimantaMonth(
  calculator,
  location,
  targetDate
) {
  const prevPurnima = findPreviousBoundary(
    calculator,
    location,
    targetDate,
    "purnima"
  );

  if (!prevPurnima) {
    return {
      monthName: "Unknown"
    };
  }

  const sun = calculator.calculatePlanetaryPositions(prevPurnima);

  const rashi = getSunRashi(sun.Sun.longitude);

  const monthIndex = (rashi + 2) % 12;

  return {
    monthName: MASA_NAMES[monthIndex]
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

    const adhikaData = calculateAdhikaMasa(
      calculator,
      location,
      targetDate
    );

    let amantaMonth =
      MASA_NAMES[adhikaData.monthIndex];

    if (adhikaData.isAdhika) {
      amantaMonth = `Adhika ${amantaMonth}`;
    }

    const purnimanta =
      calculatePurnimantaMonth(
        calculator,
        location,
        targetDate
      );

    return {
      date: targetDate.toDateString(),

      tithi: {
        name: panchanga.tithi.name,
        number: panchanga.tithi.number,
        percentage: panchanga.tithi.percentage,
        paksha: panchanga.tithi.paksha
      },

      vara: {
        name: panchanga.vara.name,
        number: panchanga.vara.number
      },

      lunarMonth: {
        amanta: amantaMonth,
        purnimanta: purnimanta.monthName,
        isAdhikaAmanta: adhikaData.isAdhika
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
