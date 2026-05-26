const { AstronomicalCalculator } = require('@bidyashish/panchang');

const MASA_NAMES = [
  "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
  "Ashwina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"
];

function normalizeDegrees(deg) {
  return ((deg % 360) + 360) % 360;
}

function getSunRashi(longitude) {
  return Math.floor(normalizeDegrees(longitude) / 30);
}

function isAmavasya(panchanga) {
  return (
    panchanga.tithi.name === "Amavasya" ||
    (panchanga.tithi.number === 15 && panchanga.tithi.paksha === "Krishna")
  );
}

function isPurnima(panchanga) {
  return (
    panchanga.tithi.name === "Purnima" ||
    (panchanga.tithi.number === 15 && panchanga.tithi.paksha === "Shukla")
  );
}

function atUTCNoon(date, offsetDays = 0) {
  const d = new Date(date);
  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + offsetDays,
    12, 0, 0, 0
  ));
}

function findBoundary(calculator, location, targetDate, type, direction) {
  for (let i = 0; i < 40; i++) {
    const d = atUTCNoon(targetDate, direction * i);
    const p = calculator.calculatePanchanga({ date: d, location });
    const matched = type === "amavasya" ? isAmavasya(p) : isPurnima(p);
    if (matched) return d;
  }
  return null;
}

function calculateAdhikaMasa(calculator, location, targetDate) {
  const prevAmavasya = findBoundary(calculator, location, targetDate, "amavasya", -1);
  const nextAmavasya = findBoundary(calculator, location, targetDate, "amavasya", +1);

  if (!prevAmavasya || !nextAmavasya) {
    return { isAdhika: false, monthIndex: 0 };
  }

  const prevPos = calculator.calculatePlanetaryPositions(prevAmavasya);
  const nextPos = calculator.calculatePlanetaryPositions(nextAmavasya);

  const prevRashi = getSunRashi(prevPos.Sun.longitude);
  const nextRashi = getSunRashi(nextPos.Sun.longitude);

  return {
    isAdhika: prevRashi === nextRashi,
    monthIndex: prevRashi
  };
}

function calculatePurnimantaMonth(calculator, location, targetDate) {
  const prevPurnima = findBoundary(calculator, location, targetDate, "purnima", -1);
  if (!prevPurnima) return { monthName: "Unknown" };

  const sun = calculator.calculatePlanetaryPositions(prevPurnima);
  const rashi = getSunRashi(sun.Sun.longitude);
  const monthIndex = (rashi + 1) % 12;

  return { monthName: MASA_NAMES[monthIndex] };
}

function getPanchang({ date = new Date(), latitude=28.6139, longitude=77.2090, timezone = "Asia/Kolkata" }) {
  const calculator = new AstronomicalCalculator();
  const location = { latitude, longitude, timezone };

  try {
    const targetDate = new Date(date);
    const panchanga = calculator.calculatePanchanga({ date: targetDate, location });

    const adhikaData = calculateAdhikaMasa(calculator, location, targetDate);

    let amantaMonth = MASA_NAMES[adhikaData.monthIndex];
    if (adhikaData.isAdhika) {
      amantaMonth = `Adhika ${amantaMonth}`;
    }

    const purnimanta = calculatePurnimantaMonth(calculator, location, targetDate);

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
        isAdhika: adhikaData.isAdhika
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
console.log(getPanchang({}))
module.exports = { getPanchang };
