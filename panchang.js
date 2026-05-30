const { getDailyPanchang } = require('panchang-ts');

// Helper: Calculate Lahiri Ayanamsha to convert Tropical to Sidereal
function getLahiriAyanamsha(date) {
    const J2000 = new Date('2000-01-01T12:00:00Z');
    const daysSinceJ2000 = (date - J2000) / 86400000;
    // Standard precession rate: ~50.29 arcsec/year
    return 23.8533 + (daysSinceJ2000 * (0.01396944 / 365.25));
}

// Helper: Get Sidereal (Nirayana) Rashi Index (0-11)
function getNirayanaRashi(tropicalLongitude, date) {
    const ayanamsha = getLahiriAyanamsha(date);
    let nirayana = tropicalLongitude - ayanamsha;
    if (nirayana < 0) nirayana += 360;
    return Math.floor(nirayana / 30);
}

// Checks if no Sankranti occurred between two Amavasyas (Adhika Masa)
function isAdhikaMasa(startAmavasya, endAmavasya, calculator) {
    const startPos = calculator.calculatePlanetaryPositions(startAmavasya);
    const endPos = calculator.calculatePlanetaryPositions(endAmavasya);

    const startRashi = getNirayanaRashi(startPos.Sun.longitude, startAmavasya);
    const endRashi = getNirayanaRashi(endPos.Sun.longitude, endAmavasya);

    // If the Rashi is identical at both boundaries, no transit occurred
    return startRashi === endRashi;
}

function getPanchang(targetDate = new Date(), latitude = 28.6139, longitude = 77.2090, timezone = "Asia/Kolkata") {
    const location = { latitude, longitude };

    try {
        const panchanga = getDailyPanchang(targetDate, location, {timezone});

        // 1. Locate Lunar Month Boundaries safely
        let prevAmavasyaDate = new Date(targetDate);
        // Start searching from yesterday to avoid skipping if targetDate IS Amavasya
        prevAmavasyaDate.setDate(prevAmavasyaDate.getDate() - 1); 
        for (let i = 0; i < 35; i++) {
            const p = calculator.calculatePanchanga({ date: prevAmavasyaDate, location });
            if ((p.tithi.number === 15 && p.tithi.paksha === 'Krishna') || p.tithi.name === 'Amavasya') break;
            prevAmavasyaDate.setDate(prevAmavasyaDate.getDate() - 1);
        }

        let nextAmavasyaDate = new Date(targetDate);
        // Start searching from today
        for (let i = 0; i < 35; i++) {
            const p = calculator.calculatePanchanga({ date: nextAmavasyaDate, location });
            if ((p.tithi.number === 15 && p.tithi.paksha === 'Krishna') || p.tithi.name === 'Amavasya') break;
            nextAmavasyaDate.setDate(nextAmavasyaDate.getDate() + 1);
        }

        // 2. Determine Adhika Masa 
        const isAdhika = isAdhikaMasa(prevAmavasyaDate, nextAmavasyaDate, calculator);


        return {
            date: targetDate.toDateString(),
            ...panchanga
        };

    } catch (error) {
        console.error("Astronomical calculation failed:", error);
        throw error;
    } finally {
        calculator.cleanup();
    }
}

console.log(getPanchang());

module.exports = { getPanchang };
