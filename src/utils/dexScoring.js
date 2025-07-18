/**
 * DEX Analytics Scoring System
 * Integrates DEX metrics into momentum calculation
 */

/**
 * Calculate DEX score component (0-100)
 * @param {Object} dexData - DEX analytics data
 * @returns {number} DEX score
 */
function calculateDEXScore(dexData) {
	if (!dexData || !dexData.hasDEXData) {
		return 0; // No DEX data = 0 points
	}

	let score = 0;

	// Liquidity Score (weight: 30%)
	score += (dexData.liquidityScore || 0) * 0.3;

	// Volume Quality Score (weight: 25%)
	score += (dexData.volumeQualityScore || 0) * 0.25;

	// Buy Pressure (weight: 20%)
	const buyPressure = parseFloat(dexData.buyPressure || 50);
	if (buyPressure > 60) score += 20;
	else if (buyPressure > 55) score += 15;
	else if (buyPressure > 45) score += 10;
	else if (buyPressure > 40) score += 5;

	// DEX Diversity (weight: 15%)
	const uniqueDEXes = dexData.uniqueDEXes || 0;
	if (uniqueDEXes >= 5) score += 15;
	else if (uniqueDEXes >= 3) score += 12;
	else if (uniqueDEXes >= 2) score += 8;
	else if (uniqueDEXes >= 1) score += 5;

	// Activity Score (weight: 10%)
	const txns24h = dexData.totalTxns24h || 0;
	if (txns24h > 10000) score += 10;
	else if (txns24h > 5000) score += 8;
	else if (txns24h > 1000) score += 6;
	else if (txns24h > 100) score += 3;

	return Math.min(score, 100);
}

/**
 * Generate DEX-specific signals
 * @param {Object} dexData - DEX analytics data
 * @param {Object} coin - Coin data
 * @returns {Array} Array of signal strings
 */
function generateDEXSignals(dexData, coin) {
	const signals = [];

	if (!dexData || !dexData.hasDEXData) {
		signals.push('❌ Brak danych DEX - tylko CEX trading');
		return signals;
	}

	// Liquidity signals
	if (dexData.liquidityScore >= 80) {
		signals.push('💧 Doskonała płynność DEX (>$1M)');
	} else if (dexData.liquidityScore >= 60) {
		signals.push('💧 Dobra płynność DEX');
	} else if (dexData.liquidityScore < 40) {
		signals.push('⚠️ Niska płynność DEX - ostrożnie ze slippage');
	}

	// Buy pressure signals
	const buyPressure = parseFloat(dexData.buyPressure || 50);
	if (buyPressure > 65) {
		signals.push('🟢 Silna presja kupna na DEX');
	} else if (buyPressure < 35) {
		signals.push('🔴 Presja sprzedaży na DEX');
	}

	// Volume quality signals
	if (dexData.volumeQualityScore >= 80) {
		signals.push('✅ Organiczny wolumen DEX');
	} else if (dexData.volumeQualityScore < 40) {
		signals.push('⚠️ Podejrzany wolumen DEX - możliwe wash trading');
	}

	// DEX diversity signals
	if (dexData.uniqueDEXes >= 5) {
		signals.push('🌐 Szeroka dostępność DEX');
	} else if (dexData.uniqueDEXes === 1) {
		signals.push('⚠️ Dostępne tylko na jednym DEX');
	}

	// Activity signals
	if (dexData.totalTxns24h > 10000) {
		signals.push('🔥 Bardzo aktywny trading DEX');
	}

	// Special opportunities
	if (
		dexData.liquidityScore >= 70 &&
		buyPressure > 60 &&
		dexData.volumeQualityScore >= 60
	) {
		signals.push('🎯 DEX Alpha - wszystkie wskaźniki pozytywne');
	}

	return signals;
}

/**
 * Enhanced DEX analysis with market making detection
 * @param {Object} dexData - DEX analytics data
 * @returns {Object} Enhanced analysis
 */
function enhancedDEXAnalysis(dexData) {
	if (!dexData || !dexData.hasDEXData) {
		return {
			riskLevel: 'HIGH',
			recommendation: 'Brak DEX - pełna zależność od CEX',
			insights: [],
		};
	}

	const insights = [];
	let riskLevel = 'MEDIUM';
	let recommendation = 'Standardowy DEX trading';

	// Risk assessment
	if (dexData.liquidityScore < 40) {
		riskLevel = 'HIGH';
		insights.push('Niska płynność = wysokie slippage');
	}

	if (dexData.volumeQualityScore < 40) {
		riskLevel = 'HIGH';
		insights.push('Podejrzany wolumen - weryfikuj przed wejściem');
	}

	if (dexData.uniqueDEXes === 1) {
		insights.push('Koncentracja ryzyka - jedna giełda DEX');
	}

	// Opportunity assessment
	if (dexData.liquidityScore >= 80 && parseFloat(dexData.buyPressure) > 60) {
		riskLevel = 'LOW';
		recommendation = 'Doskonałe warunki DEX - dobra okazja';
		insights.push('Idealne warunki: wysoka płynność + presja kupna');
	}

	// Market making opportunities
	const volLiqRatio =
		dexData.totalLiquidity > 0
			? dexData.totalVolume24h / dexData.totalLiquidity
			: 0;

	if (volLiqRatio > 10) {
		insights.push('Wysoki obrót vs płynność - potencjalne MM opportunity');
	}

	return {
		riskLevel,
		recommendation,
		insights,
		scores: {
			liquidity: dexData.liquidityScore,
			volumeQuality: dexData.volumeQualityScore,
			diversity: Math.min((dexData.uniqueDEXes / 5) * 100, 100),
		},
	};
}

module.exports = {
	calculateDEXScore,
	generateDEXSignals,
	enhancedDEXAnalysis,
};
