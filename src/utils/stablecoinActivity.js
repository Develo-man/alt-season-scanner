// src/utils/stablecoinActivity.js

/**
 * Analizuje zagregowane dane o aktywności stablecoinów z giełdy.
 * @param {Object} activityData - Obiekt z totalBuyVolume, totalSellVolume, totalTrades.
 * @returns {{score: number, interpretation: string, advice: string, buyPressure: number}}
 */
function analyzeStablecoinActivity(activityData) {
	if (!activityData || activityData.totalTrades === 0) {
		return {
			score: 50,
			interpretation: 'Brak danych',
			advice: 'Nie można było przeanalizować aktywności stablecoinów.',
			buyPressure: 50,
		};
	}

	const { totalBuyVolume, totalSellVolume, totalVolume } = activityData;
	const buyPressure = (totalBuyVolume / totalVolume) * 100;

	let score = 50; // Neutralny start
	let interpretation = 'Neutralna';
	let advice = 'Standardowa aktywność na rynku.';

	// Ocena na podstawie wolumenu (dla skali użyjemy np. 10 miliardów jako wysoki wolumen)
	const highVolumeThreshold = 10e9;
	if (totalVolume > highVolumeThreshold) {
		score += 20;
	} else if (totalVolume > highVolumeThreshold / 2) {
		score += 10;
	} else if (totalVolume < highVolumeThreshold / 10) {
		score -= 15;
	}

	// Ocena na podstawie presji zakupowej
	if (buyPressure > 60) {
		score += 30;
		interpretation = 'Wysoka Presja Kupna';
		advice =
			'Stablecoiny są aktywnie wymieniane na kryptowaluty. Silny sygnał popytu.';
	} else if (buyPressure > 55) {
		score += 15;
		interpretation = 'Podwyższona Presja Kupna';
		advice = 'Więcej kupujących niż sprzedających. Pozytywny sygnał.';
	} else if (buyPressure < 45) {
		score -= 15;
		interpretation = 'Podwyższona Presja Sprzedaży';
		advice = 'Więcej sprzedających niż kupujących. Sygnał ostrzegawczy.';
	} else if (buyPressure < 40) {
		score -= 30;
		interpretation = 'Wysoka Presja Sprzedaży';
		advice =
			'Kryptowaluty są aktywnie wymieniane na stablecoiny. Silny sygnał podaży.';
	}

	return {
		score: Math.max(0, Math.min(100, Math.round(score))),
		interpretation,
		advice,
		buyPressure: Math.round(buyPressure),
	};
}

module.exports = { analyzeStablecoinActivity };
