const { AstronomicalCalculator } = require('@bidyashish/panchang');

const MASA_NAMES = [
  "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada", 
  "Ashwina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"
];

/**
 * Checks if a Solar Sankranti occurs between two dates.
 */
function hasSankrantiOccurred(startDate, endDate, calculator, location) {
  let currentDate = new Date(startDate);
  const startPos = calculator.calculatePlanetaryPositions(currentDate);
  const startRashi = Math.floor(startPos.Sun.longitude / 30);
  
  let d = new Date(startDate);
  while (d < endDate) {
    d.setDate(d.getDate() + 1);
    const pos = calculator.calculatePlanetaryPositions(d);
    const currentRashi = Math.floor(pos.Sun.longitude / 30);
    if (currentRashi !== startRashi) return true;
  }
  return false;
}

function getPanchang(targetDate, latitude, longitude, timezone) {
  const calculator = new AstronomicalCalculator();
  const location = { latitude, longitude, timezone };

  try {
    const panchanga = calculator.calculatePanchanga({ date: targetDate, location });

    // 1. Locate Amavasya boundaries
    let prevAmavasyaDate = new Date(targetDate);
    for (let i = 0; i < 35; i++) {
      const p = calculator.calculatePanchanga({ date: prevAmavasyaDate, location });
      if ((p.tithi.number === 15 && p.tithi.paksha === 'Krishna') || p.tithi.name === 'Amavasya') break;
      prevAmavasyaDate.setDate(prevAmavasyaDate.getDate() - 1);
    }

    let nextAmavasyaDate = new Date(targetDate);
    for (let i = 0; i < 35; i++) {
      const p = calculator.calculatePanchanga({ date: nextAmavasyaDate, location });
      if ((p.tithi.number === 15 && p.tithi.paksha === 'Krishna') || p.tithi.name === 'Amavasya') break;
      nextAmavasyaDate.setDate(nextAmavasyaDate.getDate() + 1);
    }

    // 2. Determine Adhika Masa (No Sankranti = Adhika)
    const isAdhika = !hasSankrantiOccurred(prevAmavasyaDate, nextAmavasyaDate, calculator, location);

    // 3. Get Sun Sign at start of lunar month
    const pos = calculator.calculatePlanetaryPositions(prevAmavasyaDate);
    const prevSunSign = Math.floor(pos.Sun.longitude / 30);

    // 4. Calculate Month Names
    let amantaMonth = MASA_NAMES[prevSunSign];
    if (isAdhika) amantaMonth = "Adhika " + amantaMonth;

    let purnimantaMonth = amantaMonth;
    if (panchanga.tithi.paksha === 'Krishna') {
      const nextMonthSign = (prevSunSign + 1) % 12;
      purnimantaMonth = MASA_NAMES[nextMonthSign];
      if (isAdhika) purnimantaMonth = "Adhika " + purnimantaMonth;
    }

    return {
      date: targetDate.toDateString(),
      tithi: panchanga.tithi,
      vara: panchanga.vara,
      lunarMonth: {
        amanta: amantaMonth,
        purnimanta: purnimantaMonth,
        isAdhika: isAdhika
      },
      nakshatra: panchanga.nakshatra,
      yoga: panchanga.yoga,
      karana: panchanga.karana,
      sunrise: panchanga.sunrise,
      sunset: panchanga.sunset,
      rahuKaal: panchanga.rahuKaal,
    };

  } catch (error) {
    console.error("Calculation failed:", error);
    throw error;
  } finally {
    calculator.cleanup();
  }
}

// Example Execution
const result = getPanchang(new Date(""), 28.6139, 77.2090, "Asia/Kolkata");
console.log(result);

module.exports = { getPanchang };
