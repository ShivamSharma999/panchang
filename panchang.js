const { AstronomicalCalculator } = require('@bidyashish/panchang');

const MASA_NAMES = [
  "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada", 
  "Ashwina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"
];

/**
 * Checks if a Solar Sankranti not occurs between two dates.
 */
function isAdhikaMasa(startAmavasya, endAmavasya, calculator) {
    const posStart = calculator.calculatePlanetaryPositions(startAmavasya);
    const posEnd = calculator.calculatePlanetaryPositions(endAmavasya);

    const rashiStart = Math.floor(posStart.Sun.longitude / 30);
    const rashiEnd = Math.floor(posEnd.Sun.longitude / 30);

    // If the Rashi is the same, no Sankranti occurred, therefore it IS an Adhika Masa
    return rashiStart === rashiEnd;
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
    const isAdhika = isAdhikaMasa(prevAmavasyaDate, nextAmavasyaDate, calculator);

    // 3. Get Sun Sign at start of lunar month
    const pos = calculator.calculatePlanetaryPositions(prevAmavasyaDate);
    const prevSunSign = Math.floor(pos.Sun.longitude / 30);

    // 4. Calculate Month Names
    let amantaMonth = MASA_NAMES[prevSunSign];

    let purnimantaMonth = MASA_NAMES[prevSunSign == 11 ? 0 : prevSunSign + 1];

    if (isAdhika) {
      amantaMonth = "Adhika " + amantaMonth;
      purnimantaMonth = "Adhika " + purnimantaMonth
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
    console.error("Astronimical calculation failed:", error);
    throw error;
  } finally {
    calculator.cleanup();
  }
}

// Example Execution
const result = getPanchang(new Date(), 28.6139, 77.2090, "Asia/Kolkata");
console.log(result);

module.exports = { getPanchang };
