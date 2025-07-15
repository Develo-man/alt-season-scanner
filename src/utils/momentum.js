/**
 * Advanced Momentum Calculator for Alt Season Scanner
 * Calculates comprehensive scores based on multiple factors
 */
const { calculateAccumulationScore } = require('./accumulation');

/**
 * Calculate momentum score based on price performance
 * @param {Object} coin - Coin data
 * @returns {number} Momentum score (0-100)
 */
function calculatePriceMomentum(coin) {
	let score = 0;

	// 7-day performance (weight: 40%)
	if (coin.priceChange7d > 50) score += 40;
	else if (coin.priceChange7d > 30) score += 35;
	else if (coin.priceChange7d > 20) score += 30;
	else if (coin.priceChange7d > 10) score += 20;
	else if (coin.priceChange7d > 0) score += 10;
	else if (coin.priceChange7d > -10) score += 5;

	// 24h performance (weight: 20%)
	if (coin.priceChange24h > 20) score += 20;
	else if (coin.priceChange24h > 10) score += 15;
	else if (coin.priceChange24h > 5) score += 10;
	else if (coin.priceChange24h > 0) score += 5;

	// Consistency bonus (both positive)
	if (coin.priceChange24h > 0 && coin.priceChange7d > 0) {
		score += 10;
	}

	return Math.min(score, 70); // Cap at 70 for price momentum
}

/**
 * Calculate volume score
 * @param {Object} coin - Coin data with Binance info
 * @returns {number} Volume score (0-100)
 */
function calculateVolumeScore(coin) {
	let score = 0;

	// Volume to Market Cap ratio (weight: 50%)
	const volMcap = coin.volumeToMcap * 100;
	if (volMcap > 50) score += 50;
	else if (volMcap > 30) score += 40;
	else if (volMcap > 20) score += 30;
	else if (volMcap > 10) score += 20;
	else if (volMcap > 5) score += 10;

	// Binance trading activity (weight: 30%)
	if (coin.binance && coin.binance.binanceTrades24h) {
		const trades = coin.binance.binanceTrades24h;
		if (trades > 2000000) score += 30;
		else if (trades > 1000000) score += 25;
		else if (trades > 500000) score += 20;
		else if (trades > 100000) score += 10;
		else if (trades > 50000) score += 5;
	}

	// Price range volatility (weight: 20%)
	if (coin.binance && coin.binance.priceRange24h) {
		const range = parseFloat(coin.binance.priceRange24h);
		if (range > 20) score += 20;
		else if (range > 15) score += 15;
		else if (range > 10) score += 10;
		else if (range > 5) score += 5;
	}

	return Math.min(score, 100);
}

/**
 * Calculate market position score
 * @param {Object} coin - Coin data
 * @returns {number} Position score (0-100)
 */
function calculatePositionScore(coin) {
	let score = 0;

	// Market cap rank (lower is better)
	if (coin.rank <= 20) score += 10;
	else if (coin.rank <= 50) score += 30;
	else if (coin.rank <= 75) score += 20;
	else if (coin.rank <= 100) score += 10;

	// Price attractiveness for retail
	if (coin.price < 0.01) score += 30; // "Penny coins"
	else if (coin.price < 0.1) score += 25; // Very cheap
	else if (coin.price < 0.5) score += 20; // Cheap
	else if (coin.price < 1) score += 15; // Under $1 psychological
	else if (coin.price < 2) score += 10; // Still attractive
	else if (coin.price < 3) score += 5; // Our max

	// Round number proximity bonus
	if (coin.nearRoundNumber) {
		const distance =
			Math.abs(coin.price - coin.nearRoundNumber) / coin.nearRoundNumber;
		if (distance < 0.05) score += 20; // Very close (5%)
		else if (distance < 0.1) score += 10; // Close (10%)
	}

	return Math.min(score, 60);
}

/**
 * Calculate risk score (lower is better)
 * @param {Object} coin - Coin data
 * @returns {number} Risk score (0-100)
 */
function calculateRiskScore(coin) {
	let risk = 0;

	// Too much pump already (FOMO risk)
	if (coin.priceChange7d > 100) risk += 40;
	else if (coin.priceChange7d > 70) risk += 25;
	else if (coin.priceChange7d > 50) risk += 15;

	// Negative 24h with positive 7d (momentum fading?)
	if (coin.priceChange24h < -10 && coin.priceChange7d > 20) {
		risk += 20;
	}

	// Low liquidity risk
	if (coin.volumeToMcap < 0.02) risk += 20; // Less than 2% daily volume

	// Rank risk (too low = risky)
	if (coin.rank > 90) risk += 15;
	else if (coin.rank > 80) risk += 10;

	// Binance specific risks
	if (coin.binance && coin.binance.binanceTrades24h < 10000) {
		risk += 20; // Very low activity on Binance
	}

	return Math.min(risk, 100);
}

/**
 * Calculate comprehensive momentum score
 * @param {Object} coin - Complete coin data with Binance info
 * @returns {Object} Detailed scoring breakdown
 */
function calculateMomentumScore(coin) {
	// Skip if not on Binance
	if (!coin.binance || !coin.binance.isListed) {
		return {
			totalScore: 0,
			notListed: true,
		};
	}

	// Calculate individual scores
	const priceScore = calculatePriceMomentum(coin);
	const volumeScore = calculateVolumeScore(coin);
	const positionScore = calculatePositionScore(coin);
	const riskScore = calculateRiskScore(coin);

	// Calculate accumulation if data provided
	let accumulationData = null;
	if (additionalData.klines && additionalData.whaleData) {
		accumulationData = calculateAccumulationScore(
			coin,
			additionalData.klines,
			additionalData.whaleData
		);
	}

	// Calculate weighted total (risk reduces score)
	const totalScore = Math.max(
		0,
		priceScore * 0.35 +
			volumeScore * 0.35 +
			positionScore * 0.3 -
			riskScore * 0.25
	);

	// Determine category
	let category = 'NEUTRAL';
	let emoji = '😐';

	if (totalScore >= 70) {
		category = 'HOT';
		emoji = '🔥';
	} else if (totalScore >= 60) {
		category = 'STRONG';
		emoji = '💪';
	} else if (totalScore >= 50) {
		category = 'PROMISING';
		emoji = '🌟';
	} else if (totalScore >= 40) {
		category = 'INTERESTING';
		emoji = '👀';
	} else if (totalScore >= 30) {
		category = 'NEUTRAL';
		emoji = '😐';
	} else {
		category = 'WEAK';
		emoji = '💤';
	}

	// Combine signals
	const signals = generateSignals(coin, {
		priceScore,
		volumeScore,
		positionScore,
		riskScore,
	});

		// Add accumulation signals if available
	if (accumulationData && accumulationData.signals.length > 0) {
		signals.push(...accumulationData.signals.slice(0, 2));
	}


	return {
		totalScore: totalScore.toFixed(2),
		priceScore,
		volumeScore,
		positionScore,
		riskScore,
		accumulation: accumulationData,
		category,
		emoji,
		breakdown: {
			priceMomentum: `${priceScore}/70`,
			volumeActivity: `${volumeScore}/100`,
			marketPosition: `${positionScore}/60`,
			riskFactor: `${riskScore}/100`,
			accumulation: accumulationData ? `${accumulationData.score}/100` : 'N/A',
		},
		signals: generateSignals(coin, {
			priceScore,
			volumeScore,
			positionScore,
			riskScore,
		}),
	};
}

/**
 * Generate trading signals based on scores
 * @param {Object} coin - Coin data
 * @param {Object} scores - Individual scores
 * @returns {Array} Array of signal strings
 */
function generateSignals(coin, scores) {
	const signals = [];

	// Price momentum signals
	if (coin.priceChange7d > 50) {
		signals.push('⚠️ Przedłużony wzrost - rozważ poczekanie na korektę');
	} else if (coin.priceChange7d > 30 && coin.priceChange24h > 5) {
		signals.push('✅ Silna kontynuacja momentum');
	} else if (coin.priceChange7d > 10 && coin.priceChange24h < -5) {
		signals.push('⚡ Potencjalna okazja do kupna w dołku');
	}

	// Volume signals
	if (scores.volumeScore > 70) {
		signals.push('🔥 Ekstremalny wolumen - coś się dzieje');
	} else if (scores.volumeScore > 50) {
		signals.push('📈 Duże zainteresowanie traderów');
	}

	// Position signals
	if (coin.nearRoundNumber && coin.price < coin.nearRoundNumber) {
		signals.push(
			`🎯 Zbliża się do psychologicznego poziomu: $${coin.nearRoundNumber}`
		);
	}

	if (coin.price < 0.01) {
		signals.push('💎 Groszowa moneta - wysokie ryzyko/wysoka nagroda');
	}

	// Risk signals
	if (scores.riskScore > 60) {
		signals.push('🚨 Wysokie ryzyko - handluj ostrożnie');
	} else if (scores.riskScore < 30) {
		signals.push('✅ Stosunkowo niski profil ryzyka');
	}

	// Binance specific
	if (coin.binance && coin.binance.binanceTrades24h > 1000000) {
		signals.push('💹 Duża płynność na Binance');
	}

	return signals;
}

/**
 * Rank coins by momentum score
 * @param {Array} coins - Array of coins with scores
 * @returns {Array} Sorted array
 */
function rankByMomentum(coins) {
	return coins
		.map((coin) => ({
			...coin,
			momentum: calculateMomentumScore(coin),
		}))
		.filter((coin) => !coin.momentum.notListed)
		.sort(
			(a, b) =>
				parseFloat(b.momentum.totalScore) - parseFloat(a.momentum.totalScore)
		);
}

/**
 * Get top coins by specific category
 * @param {Array} coins - Array of coins
 * @param {string} category - Category to filter by
 * @param {number} limit - Max results
 * @returns {Array} Filtered and sorted coins
 */
function getTopByCategory(coins, category, limit = 5) {
	const ranked = rankByMomentum(coins);

	switch (category) {
		case 'safest':
			return ranked.filter((c) => c.momentum.riskScore < 40).slice(0, limit);

		case 'momentum':
			return ranked.filter((c) => c.momentum.priceScore > 50).slice(0, limit);

		case 'volume':
			return ranked
				.sort((a, b) => b.momentum.volumeScore - a.momentum.volumeScore)
				.slice(0, limit);

		case 'value':
			return ranked
				.filter((c) => c.price < 1 && c.momentum.totalScore > 40)
				.slice(0, limit);

		default:
			return ranked.slice(0, limit);
	}
}

module.exports = {
	calculatePriceMomentum,
	calculateVolumeScore,
	calculatePositionScore,
	calculateRiskScore,
	calculateMomentumScore,
	generateSignals,
	rankByMomentum,
	getTopByCategory,
};
