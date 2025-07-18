/**
 * Accumulation Detection System
 * Identifies coins being accumulated by smart money
 */

/**
 * Calculate Average True Range for volatility measurement
 * @param {Array} klines - Array of kline data
 * @returns {number} ATR value
 */
function calculateATR(klines) {
	if (!klines || klines.length < 2) return 0;

	let trSum = 0;
	for (let i = 1; i < klines.length; i++) {
		const high = klines[i].high;
		const low = klines[i].low;
		const prevClose = klines[i - 1].close;

		// True Range = max of:
		// 1. Current high - current low
		// 2. Abs(current high - previous close)
		// 3. Abs(current low - previous close)
		const tr = Math.max(
			high - low,
			Math.abs(high - prevClose),
			Math.abs(low - prevClose)
		);

		trSum += tr;
	}

	return trSum / (klines.length - 1);
}

/**
 * Calculate volatility contraction score
 * @param {Array} klines - Recent and historical klines
 * @returns {number} Score 0-30
 */
function calculateVolatilityScore(klines) {
	if (!klines || klines.length < 14) return 0;

	// Calculate ATR for different periods
	const recentKlines = klines.slice(-7); // Last 7 days
	const allKlines = klines; // Last 14 days

	const atr7 = calculateATR(recentKlines);
	const atr14 = calculateATR(allKlines);

	if (atr14 === 0) return 0;

	const contractionRatio = atr7 / atr14;

	// Lower ratio = stronger contraction
	if (contractionRatio < 0.5) return 30; // Extreme contraction
	if (contractionRatio < 0.6) return 25;
	if (contractionRatio < 0.7) return 20;
	if (contractionRatio < 0.8) return 15;
	if (contractionRatio < 0.9) return 10;
	if (contractionRatio < 1.0) return 5;
	return 0;
}

/**
 * Calculate volume absorption score
 * High volume without price movement indicates accumulation
 * @param {Object} coin - Coin data with volume and price info
 * @returns {number} Score 0-40
 */
function calculateAbsorptionScore(coin) {
	const priceChange = Math.abs(coin.priceChange24h);
	const volumeRatio = coin.volumeToMcap;

	// High volume + low price change = absorption
	if (volumeRatio > 0.2 && priceChange < 2) return 40;
	if (volumeRatio > 0.15 && priceChange < 3) return 35;
	if (volumeRatio > 0.1 && priceChange < 4) return 30;
	if (volumeRatio > 0.08 && priceChange < 5) return 25;
	if (volumeRatio > 0.06 && priceChange < 6) return 20;
	if (volumeRatio > 0.04 && priceChange < 8) return 15;
	if (volumeRatio > 0.03 && priceChange < 10) return 10;
	if (volumeRatio > 0.02 && priceChange < 12) return 5;
	return 0;
}

/**
 * Calculate whale accumulation score
 * @param {Object} whaleData - Whale activity data from exchange
 * @param {number} priceChange - 24h price change
 * @returns {number} Score 0-30
 */
function calculateWhaleScore(whaleData, priceChange) {
	if (!whaleData || whaleData.totalLargeTrades === 0) return 0;

	const buyPressure = whaleData.buyPressure;
	const priceImpact = Math.abs(priceChange);

	// Strong buy pressure with minimal price impact
	if (buyPressure > 0.7 && priceImpact < 3) return 30;
	if (buyPressure > 0.65 && priceImpact < 4) return 25;
	if (buyPressure > 0.6 && priceImpact < 5) return 20;
	if (buyPressure > 0.55 && priceImpact < 7) return 15;
	if (buyPressure > 0.5 && priceImpact < 10) return 10;
	if (buyPressure > 0.45 && priceImpact < 15) return 5;
	return 0;
}

/**
 * Generate accumulation signals
 * @param {Object} scores - Individual accumulation scores
 * @param {Object} coin - Coin data
 * @returns {Array} Array of signal strings
 */
function generateAccumulationSignals(scores, coin) {
	const signals = [];
	const totalScore = scores.total;

	// Overall signals
	if (totalScore >= 80) {
		signals.push('🎯 Silna akumulacja - smart money ładuje pozycje');
	} else if (totalScore >= 60) {
		signals.push('📊 Umiarkowana akumulacja - warto obserwować');
	}

	// Specific signals
	if (scores.volatility >= 25) {
		signals.push('📉 Ekstremalna kompresja volatility - wybuch blisko');
	}

	if (scores.absorption >= 30) {
		signals.push('🧲 Wysoka absorpcja - duży volume bez ruchu ceny');
	}

	if (scores.whale >= 25) {
		signals.push('🐋 Wieloryby akumulują - 65%+ large trades to buy');
	}

	// Pattern recognition
	if (scores.volatility >= 20 && scores.whale >= 20) {
		signals.push('🏹 Spring Loading - cisza przed burzą');
	}

	if (scores.absorption >= 25 && coin.priceChange7d < 5) {
		signals.push('💎 Hidden Gem - akumulacja w cieniu');
	}

	return signals;
}

/**
 * Main accumulation calculation function
 * @param {Object} coin - Coin data
 * @param {Array} klines - Price klines for volatility
 * @param {Object} whaleData - Whale activity data
 * @returns {Object} Accumulation analysis
 */
function calculateMomentumScoreWithDEX(coin, klines, whaleData) {
	// Calculate individual components
	const volatilityScore = calculateVolatilityScore(klines);
	const absorptionScore = calculateAbsorptionScore(coin);
	const whaleScore = calculateWhaleScore(whaleData, coin.priceChange24h);

	const totalScore = volatilityScore + absorptionScore + whaleScore;

	// Determine category
	let category, emoji, recommendation;

	if (totalScore >= 80) {
		category = 'STRONG_ACCUMULATION';
		emoji = '🎯';
		recommendation = 'Silna akumulacja - rozważ pozycję przed wybiciem';
	} else if (totalScore >= 60) {
		category = 'MODERATE_ACCUMULATION';
		emoji = '📊';
		recommendation = 'Umiarkowana akumulacja - obserwuj uważnie';
	} else if (totalScore >= 40) {
		category = 'WEAK_ACCUMULATION';
		emoji = '👀';
		recommendation = 'Słabe sygnały - może być wczesna faza';
	} else {
		category = 'NO_ACCUMULATION';
		emoji = '💤';
		recommendation = 'Brak sygnałów akumulacji';
	}

	const scores = {
		volatility: volatilityScore,
		absorption: absorptionScore,
		whale: whaleScore,
		total: totalScore,
	};

	return {
		score: totalScore,
		category,
		emoji,
		recommendation,
		breakdown: {
			volatilityContraction: `${volatilityScore}/30`,
			volumeAbsorption: `${absorptionScore}/40`,
			whaleAccumulation: `${whaleScore}/30`,
		},
		signals: generateAccumulationSignals(scores, coin),
		details: {
			atr7d: klines ? calculateATR(klines.slice(-7)) : null,
			largeTrades: whaleData ? whaleData.totalLargeTrades : 0,
			buyPressure: whaleData
				? (whaleData.buyPressure * 100).toFixed(1) + '%'
				: 'N/A',
		},
	};
}

module.exports = {
	calculateATR,
	calculateVolatilityScore,
	calculateAbsorptionScore,
	calculateWhaleScore,
	calculateMomentumScoreWithDEX,
	generateAccumulationSignals,
};
