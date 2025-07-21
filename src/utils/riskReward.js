/**
 * RISK-REWARD ANALYSIS
 * "Mogę zyskać 30% ale ryzykuję 15% - warto czy nie?"
 */

/**
 * GŁÓWNA FUNKCJA - oblicza risk-reward dla konkretnego coina
 */
function calculateRiskReward(coin, marketConditions, timeframe = '30d') {
	const momentum = coin.momentum || {};
	const timing = momentum.timing || {};

	// 1. Oszacuj potencjalny zysk (upside)
	const upside = estimateUpside(coin, marketConditions, timeframe);

	// 2. Oszacuj potencjalną stratę (downside)
	const downside = estimateDownside(coin, marketConditions);

	// 3. Oblicz prawdopodobieństwo sukcesu
	const successProbability = calculateSuccessProbability(
		coin,
		marketConditions
	);

	// 4. Oblicz Expected Value
	const expectedValue = calculateExpectedValue(
		upside,
		downside,
		successProbability
	);

	// 5. Wygeneruj rekomendację
	const recommendation = generateRiskRewardRecommendation(
		upside,
		downside,
		successProbability,
		expectedValue
	);

	return {
		upside: upside,
		downside: downside,
		riskRewardRatio: upside.percent / downside.percent,
		successProbability: successProbability,
		expectedValue: expectedValue,
		recommendation: recommendation,
		timeframe: timeframe,
		reasoning: generateReasoning(upside, downside, successProbability, coin),
	};
}

/**
 * OSZACUJ POTENCJALNY ZYSK (UPSIDE)
 */
function estimateUpside(coin, marketConditions, timeframe) {
	let baseUpside = 0;
	const momentum = coin.momentum || {};
	const momentumScore = parseFloat(momentum.totalScore || 0);
	const timingScore = momentum.timing?.timingScore || 50;
	const reasons = [];

	// Base upside na podstawie momentum score
	if (momentumScore > 80) {
		baseUpside = 40; // Bardzo silny momentum
		reasons.push('Ekstremalnie wysoki momentum score');
	} else if (momentumScore > 70) {
		baseUpside = 30; // Silny momentum
		reasons.push('Wysoki momentum score');
	} else if (momentumScore > 60) {
		baseUpside = 22; // Dobry momentum
		reasons.push('Dobry momentum score');
	} else if (momentumScore > 50) {
		baseUpside = 15; // OK momentum
		reasons.push('Średni momentum');
	} else {
		baseUpside = 8; // Słaby momentum
		reasons.push('Słaby momentum');
	}

	// Timing multiplier
	if (timingScore > 70) {
		baseUpside *= 1.3;
		reasons.push('Doskonały timing rynkowy');
	} else if (timingScore > 60) {
		baseUpside *= 1.2;
		reasons.push('Dobry timing');
	} else if (timingScore < 40) {
		baseUpside *= 0.8;
		reasons.push('Słaby timing może ograniczyć wzrost');
	}

	// Market conditions adjustment
	const btcDominance = parseFloat(marketConditions.btcDominance || 60);
	if (btcDominance < 50) {
		baseUpside *= 1.4; // Alt season boost
		reasons.push('Alt season - zwiększony potencjał');
	} else if (btcDominance > 65) {
		baseUpside *= 0.7; // BTC dominance penalty
		reasons.push('BTC dominance ogranicza potencjał altów');
	}

	// Sector momentum
	if (coin.sector) {
		const sectorMultiplier = getSectorMultiplier(coin.sector);
		baseUpside *= sectorMultiplier.multiplier;
		if (sectorMultiplier.reason) {
			reasons.push(sectorMultiplier.reason);
		}
	}

	// Technical factors
	if (coin.volumeProfile && isNearSupport(coin)) {
		baseUpside *= 1.2;
		reasons.push('Bounce od support level');
	}

	// Volume confirmation
	const volumeRatio = coin.volumeToMcap || 0;
	if (volumeRatio > 0.2) {
		baseUpside *= 1.15;
		reasons.push('Bardzo wysoky wolumen potwierdza ruch');
	} else if (volumeRatio > 0.1) {
		baseUpside *= 1.1;
		reasons.push('Dobry wolumen');
	}

	// Cap extreme values
	baseUpside = Math.max(5, Math.min(80, baseUpside));

	return {
		percent: Math.round(baseUpside),
		reasons: reasons.slice(0, 3), // Max 3 najważniejsze powody
		confidence: getUpsideConfidence(momentumScore, timingScore, volumeRatio),
	};
}

/**
 * OSZACUJ POTENCJALNĄ STRATĘ (DOWNSIDE)
 */
function estimateDownside(coin, marketConditions) {
	let baseDownside = 15; // Standardowe -15% dla altcoina
	const riskScore = coin.momentum?.riskScore || 50;
	const reasons = [];

	// Risk score adjustment
	if (riskScore > 80) {
		baseDownside = 35;
		reasons.push('Bardzo wysokie ryzyko projektu');
	} else if (riskScore > 70) {
		baseDownside = 28;
		reasons.push('Wysokie ryzyko');
	} else if (riskScore > 60) {
		baseDownside = 22;
		reasons.push('Podwyższone ryzyko');
	} else if (riskScore < 30) {
		baseDownside = 10;
		reasons.push('Stosunkowo bezpieczny projekt');
	}

	// Market cap rank risk
	if (coin.rank > 200) {
		baseDownside += 10;
		reasons.push('Niska pozycja w rankingu (#' + coin.rank + ')');
	} else if (coin.rank <= 50) {
		baseDownside -= 3;
		reasons.push('Top 50 - mniejsze ryzyko');
	}

	// Liquidity risk
	const volumeRatio = coin.volumeToMcap || 0;
	if (volumeRatio < 0.02) {
		baseDownside += 8;
		reasons.push('Niska płynność - trudność sprzedaży');
	} else if (volumeRatio > 0.1) {
		baseDownside -= 3;
		reasons.push('Dobra płynność');
	}

	// Recent pump risk
	const change7d = coin.priceChange7d || 0;
	if (change7d > 50) {
		baseDownside += 12;
		reasons.push(
			'Może być po pumpie (+' + change7d.toFixed(1) + '% w tygodniu)'
		);
	} else if (change7d > 30) {
		baseDownside += 6;
		reasons.push('Duży wzrost w tygodniu - ryzyko korekty');
	}

	// Volatility risk
	const change24h = Math.abs(coin.priceChange24h || 0);
	if (change24h > 20) {
		baseDownside += 5;
		reasons.push('Wysoka zmienność (±' + change24h.toFixed(1) + '% w 24h)');
	}

	// Exchange risk
	if (!coin.binance?.isListed) {
		baseDownside += 8;
		reasons.push('Brak na głównych giełdach');
	}

	// Market conditions risk
	const btcDominance = parseFloat(marketConditions.btcDominance || 60);
	if (btcDominance > 70) {
		baseDownside += 5;
		reasons.push('BTC dominance - ryzyko dla altów');
	}

	// Technical risk
	if (coin.volumeProfile && isNearResistance(coin)) {
		baseDownside += 5;
		reasons.push('Blisko resistance level');
	}

	// Cap values
	baseDownside = Math.max(8, Math.min(50, baseDownside));

	return {
		percent: Math.round(baseDownside),
		reasons: reasons.slice(0, 3), // Max 3 najważniejsze powody
		confidence: getDownsideConfidence(riskScore, volumeRatio, coin.rank),
	};
}

/**
 * OBLICZ PRAWDOPODOBIEŃSTWO SUKCESU
 */
function calculateSuccessProbability(coin, marketConditions) {
	let probability = 0.5; // Start z 50%

	const momentumScore = parseFloat(coin.momentum?.totalScore || 0);
	const timingScore = coin.momentum?.timing?.timingScore || 50;
	const riskScore = coin.momentum?.riskScore || 50;

	// Momentum effect
	if (momentumScore > 70) probability += 0.2;
	else if (momentumScore > 60) probability += 0.15;
	else if (momentumScore > 50) probability += 0.1;
	else if (momentumScore < 40) probability -= 0.15;

	// Timing effect
	if (timingScore > 70) probability += 0.15;
	else if (timingScore > 60) probability += 0.1;
	else if (timingScore < 40) probability -= 0.1;
	else if (timingScore < 30) probability -= 0.2;

	// Risk effect
	if (riskScore < 30) probability += 0.1;
	else if (riskScore > 70) probability -= 0.15;

	// Market conditions
	const btcDominance = parseFloat(marketConditions.btcDominance || 60);
	if (btcDominance < 50) probability += 0.1;
	else if (btcDominance > 70) probability -= 0.15;

	// Project quality
	if (coin.rank <= 50) probability += 0.05;
	else if (coin.rank > 200) probability -= 0.1;

	if (coin.binance?.isListed) probability += 0.05;
	if ((coin.volumeToMcap || 0) > 0.1) probability += 0.05;

	// Cap between 10% and 90%
	return Math.max(0.1, Math.min(0.9, probability));
}

/**
 * OBLICZ EXPECTED VALUE
 */
function calculateExpectedValue(upside, downside, successProbability) {
	const expectedGain = upside.percent * successProbability;
	const expectedLoss = downside.percent * (1 - successProbability);
	const netExpectedValue = expectedGain - expectedLoss;

	return {
		expectedGain: expectedGain.toFixed(1),
		expectedLoss: expectedLoss.toFixed(1),
		netExpectedValue: netExpectedValue.toFixed(1),
		isPositive: netExpectedValue > 0,
	};
}

/**
 * GENERUJ REKOMENDACJĘ RISK-REWARD
 */
function generateRiskRewardRecommendation(
	upside,
	downside,
	successProbability,
	expectedValue
) {
	const riskRewardRatio = upside.percent / downside.percent;
	const ev = parseFloat(expectedValue.netExpectedValue);

	// Doskonały risk-reward
	if (riskRewardRatio >= 3 && successProbability > 0.65 && ev > 5) {
		return {
			decision: 'EXCELLENT',
			action: '🟢 DOSKONAŁY RISK-REWARD',
			reasoning: `Ryzykujesz ${downside.percent}% żeby zyskać ${upside.percent}% (1:${riskRewardRatio.toFixed(1)}). Expected Value: +${ev}%`,
			positionSize: '4-6%',
			confidence: 'VERY_HIGH',
		};
	}

	// Dobry risk-reward
	if (riskRewardRatio >= 2 && successProbability > 0.55 && ev > 2) {
		return {
			decision: 'GOOD',
			action: '🟢 DOBRY RISK-REWARD',
			reasoning: `Ryzykujesz ${downside.percent}% żeby zyskać ${upside.percent}% (1:${riskRewardRatio.toFixed(1)}). Expected Value: +${ev}%`,
			positionSize: '2-4%',
			confidence: 'HIGH',
		};
	}

	// Akceptowalny risk-reward
	if (riskRewardRatio >= 1.5 && successProbability > 0.5 && ev > 0) {
		return {
			decision: 'ACCEPTABLE',
			action: '🟡 AKCEPTOWALNY RISK-REWARD',
			reasoning: `Ryzykujesz ${downside.percent}% żeby zyskać ${upside.percent}% (1:${riskRewardRatio.toFixed(1)}). Expected Value: +${ev}%`,
			positionSize: '1-2%',
			confidence: 'MEDIUM',
		};
	}

	// Słaby risk-reward
	if (riskRewardRatio < 1.5 || successProbability < 0.4 || ev < -2) {
		return {
			decision: 'POOR',
			action: '🔴 SŁABY RISK-REWARD',
			reasoning: `Ryzykujesz ${downside.percent}% żeby zyskać ${upside.percent}% (1:${riskRewardRatio.toFixed(1)}). Expected Value: ${ev}%`,
			positionSize: '0%',
			confidence: 'HIGH',
		};
	}

	// Neutralny
	return {
		decision: 'NEUTRAL',
		action: '🟡 NEUTRALNY RISK-REWARD',
		reasoning: `Ryzykujesz ${downside.percent}% żeby zyskać ${upside.percent}% (1:${riskRewardRatio.toFixed(1)}). Expected Value: ${ev}%`,
		positionSize: '0-1%',
		confidence: 'LOW',
	};
}

/**
 * HELPER FUNCTIONS
 */
function getSectorMultiplier(sector) {
	const sectors = {
		AI: { multiplier: 1.3, reason: 'AI sector bardzo hot' },
		RWA: { multiplier: 1.25, reason: 'RWA emerging trend' },
		DeFi: { multiplier: 1.15, reason: 'DeFi nadal silny' },
		'Layer 1': { multiplier: 1.1, reason: 'L1 zawsze w grze' },
		Gaming: { multiplier: 0.95, reason: 'Gaming czeka na powrót' },
		Memecoin: { multiplier: 0.9, reason: 'Meme coins unpredictable' },
	};

	return sectors[sector] || { multiplier: 1.0, reason: null };
}

function isNearSupport(coin) {
	if (!coin.volumeProfile) return false;
	const currentPrice = coin.price;
	const pocPrice = coin.volumeProfile.pointOfControl.price;
	return Math.abs((currentPrice - pocPrice) / pocPrice) < 0.05;
}

function isNearResistance(coin) {
	if (!coin.volumeProfile) return false;
	const currentPrice = coin.price;
	const valueAreaHigh = coin.volumeProfile.valueArea.high;
	return Math.abs((currentPrice - valueAreaHigh) / valueAreaHigh) < 0.05;
}

function getUpsideConfidence(momentumScore, timingScore, volumeRatio) {
	if (momentumScore > 70 && timingScore > 70 && volumeRatio > 0.1)
		return 'HIGH';
	if (momentumScore > 60 && timingScore > 60) return 'MEDIUM';
	return 'LOW';
}

function getDownsideConfidence(riskScore, volumeRatio, rank) {
	if (riskScore > 70 || volumeRatio < 0.02 || rank > 200) return 'HIGH';
	if (riskScore > 50 || rank > 100) return 'MEDIUM';
	return 'LOW';
}

function generateReasoning(upside, downside, successProbability, coin) {
	return {
		upsideFactors: upside.reasons,
		downsideFactors: downside.reasons,
		probabilityNote: `${(successProbability * 100).toFixed(0)}% szans na zysk na podstawie historycznych wzorców`,
		summary: `Risk-reward ratio 1:${(upside.percent / downside.percent).toFixed(1)} z ${(successProbability * 100).toFixed(0)}% prawdopodobieństwem sukcesu`,
	};
}

module.exports = {
	calculateRiskReward,
};
