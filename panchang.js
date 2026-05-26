const { AstronomicalCalculator } = require('@bidyashish/panchang');

const MASA_NAMES = [
  "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
  "Ashwina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"
];

function isBoundaryTithi(panchanga, type) {
  if (!panchanga || !panchanga.tithi) return false;

  if (type === 'amavasya') {
    return (
      panchanga.tithi.name === 'Amavasya' ||
      (panchanga.tithi.number === 15 && panchanga.tithi.paksha === 'Krishna')
    );
  }

  return (
    panchanga.tithi.name === 'Purnima' ||
    (panchanga.tithi.number === 15 && panchanga.tithi.paksha === 'Shukla')
  );
}

function findBoundaryInstant(fromDate, directionDays, location, calculator, type) {
  const probe = new Date(fromDate);

  for (let i = 0; i < 40; i++) {
    const p = calculator.calculatePanchanga({ date: probe, location });

    if (isBoundaryTithi(p, type)) {
      // Use the exact transition time if the library provides it.
      return p.tithi.endTime ? new Date(p.tithi.endTime) : new Date(probe);
    }

    probe.setDate(probe.getDate() + directionDays);
  }

  throw new Error(`Unable to locate ${type} near ${fromDate.toISOString()}`);
}

function sunRashiAt(date, calculator) {
  const pos = calculator.calculatePlanetaryPositions(date);
  const lon = ((pos.Sun.longitude % 360) + 360) % 360;
  return Math.floor(lon / 30);
}

function hasSankrantiOccurred(startInstant, endInstant, calculator) {
  return sunRashiAt(startInstant, calculator) !== sunRashiAt(endInstant, calculator);
}

function getPanchang(targetDate, latitude, longitude, timezone) {
  const calculator = new AstronomicalCalculator();
  const location = { latitude, longitude, timezone };

  try {
    const panchanga = calculator.calculatePanchanga({ date: targetDate, location });

    // Amanta boundaries
    const prevAmavasya = findBoundaryInstant(targetDate, -1, location, calculator, 'amavasya');
    const nextAmavasya = findBoundaryInstant(targetDate, 1, location, calculator, 'amavasya');
    const isAdhikaAmanta = !hasSankrantiOccurred(prevAmavasya, nextAmavasya, calculator);

    // Purnimanta boundaries
    const prevPurnima = findBoundaryInstant(targetDate, -1, location, calculator, 'purnima');
    const nextPurnima = findBoundaryInstant(targetDate, 1, location, calculator, 'purnima');
    const isAdhikaPurnimanta = !hasSankrantiOccurred(prevPurnima, nextPurnima, calculator);

    const amantaSunSign = sunRashiAt(prevAmavasya, calculator);
    const purnimantaSunSign = sunRashiAt(prevPurnima, calculator);

    let amantaMonth = MASA_NAMES[amantaSunSign];
    let purnimantaMonth = MASA_NAMES[(purnimantaSunSign + 1) % 12];

    if (isAdhikaAmanta) amantaMonth = `Adhika ${amantaMonth}`;
    if (isAdhikaPurnimanta) purnimantaMonth = `Adhika ${purnimantaMonth}`;

    return {
      date: targetDate.toDateString(),
      tithi: panchanga.tithi,
      vara: panchanga.vara,
      lunarMonth: {
        amanta: amantaMonth,
        purnimanta: purnimantaMonth,
        isAdhikaAmanta,
        isAdhikaPurnimanta
      },
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
module.exports = { getPanchang };
