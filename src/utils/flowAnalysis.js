// src/utils/flowAnalysis.js

/**
 * Oblicza 'Flow Score' (0-100) na podstawie danych o przepływach.
 * Wysoki wynik = bycze przepływy (odpływy > wpływy).
 * Niski wynik = niedźwiedzie przepływy (wpływy > odpływy).
 * @param {Object} flowData Dane z Santiment.
 * @param {Object} coin Dane monety (do normalizacji).
 * @returns {number} Wynik od 0 do 100.
 */
function calculateFlowScore(flowData, coin) {
	if (!flowData || !coin.marketCap || coin.marketCap === 0) {
		return 50; // Neutralny wynik, jeśli brak danych
	}

	// Normalizujemy netflow względem kapitalizacji rynkowej, aby był porównywalny
	// Używamy danych USD bezpośrednio z Santiment
	const netflowRatio24h = (flowData.netflow_24h_usd / coin.marketCap) * 100; // w % market cap

	let score = 50; // Punkt wyjścia

	// Silny odpływ (bardzo byczo)
	if (netflowRatio24h < -0.5) score = 95;
	else if (netflowRatio24h < -0.25) score = 85;
	else if (netflowRatio24h < -0.1) score = 75;
	// Lekki odpływ (byczo)
	else if (netflowRatio24h < 0) score = 60;
	// Lekki napływ (niedźwiedzio)
	else if (netflowRatio24h > 0 && netflowRatio24h < 0.1) score = 40;
	// Silny napływ (bardzo niedźwiedzio)
	else if (netflowRatio24h > 0.1) score = 25;
	else if (netflowRatio24h > 0.25) score = 15;
	else if (netflowRatio24h > 0.5) score = 5;

	return Math.round(score);
}

/**
 * Generuje czytelne sygnały na podstawie danych o przepływach.
 * @param {Object} flowData Dane z Santiment.
 * @param {number} flowScore Obliczony Flow Score.
 * @returns {Array<string>} Tablica sygnałów.
 */
function generateFlowSignals(flowData, flowScore) {
	if (!flowData) return [];

	const signals = [];
	if (flowScore >= 80) {
		signals.push('🐋 Duży odpływ z giełd - sygnał silnej akumulacji.');
	} else if (flowScore >= 60) {
		signals.push('✅ Odpływy z giełd - tokeny idą do zimnych portfeli.');
	} else if (flowScore <= 20) {
		signals.push('🚨 Znaczące wpłaty na giełdy - możliwa presja sprzedaży!');
	} else if (flowScore <= 40) {
		signals.push('⚠️ Wpływy na giełdy - obserwuj pod kątem dystrybucji.');
	}

	return signals;
}

module.exports = { calculateFlowScore, generateFlowSignals };
