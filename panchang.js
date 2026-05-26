const { AstronomicalCalculator } = require('@bidyashish/panchang');
const MASA_NAMES = [ "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",  "Ashwina", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"];

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

function getPanchang(targetDate, latitude, longitude, timezone) {
    const calculator = new AstronomicalCalculator();
    const location = { latitude, longitude, timezone };

    try {
        const panchanga = calculator.calculatePanchanga({ date: targetDate, location });

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

        // 3. Get Sidereal Sun Sign at the start of the lunar month
        const pos = calculator.calculatePlanetaryPositions(prevAmavasyaDate);
        const startRashi = getNirayanaRashi(pos.Sun.longitude, prevAmavasyaDate);

        // 4. Calculate Month Names (Vedic rule: Month is named by the Rashi the Sun transits INTO)
        const monthIndex = (startRashi + 1) % 12;
        let amantaMonth = MASA_NAMES[monthIndex];
        
        // Purnimanta month is identical to Amanta in Shukla Paksha, but +1 month in Krishna Paksha
        const purnimantaIndex = panchanga.tithi.paksha === 'Krishna' ? (monthIndex + 1) % 12 : monthIndex;
        let purnimantaMonth = MASA_NAMES[purnimantaIndex];

        // Append Adhika prefix if required
        if (isAdhika) {
            amantaMonth = "Adhika " + amantaMonth;
            purnimantaMonth = "Adhika " + purnimantaMonth;
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
        console.error("Astronomical calculation failed:", error);
        throw error;
    } finally {
        calculator.cleanup();
    }
}

// Example Execution for May 26, 2026 (Adhika Jyeshtha)
const result = getPanchang(new Date('2026-05-26T12:00:00Z'), 28.6139, 77.2090, "Asia/Kolkata");
console.log(result);

module.exports = { getPanchang };
