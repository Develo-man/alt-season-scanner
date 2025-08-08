const { calculateMomentumScoreWithDEX } = require('./accumulation');
const { calculateDEXScore, generateDEXSignals } = require('./dexScoring');
const { generateActionSignal } = require('./actionSignals');
const { calculateRiskReward } = require('./riskReward');
const { calculateFlowScore, generateFlowSignals } = require('./flowAnalysis');

// Helper do obliczania stabilności trendu
function calculateTrendStability(klines) {
	if (!klines || klines.length < 7) return 0;
	// Bierzemy ostatnie 7 świec (dni)
	const dailyChanges = klines
		.slice(-7)
		.map((kline, i, arr) => {
			if (i === 0) return 0;
			// Obliczamy dzienną zmianę procentową
			return ((kline.close - arr[i - 1].close) / arr[i - 1].close) * 100;
		})
		.slice(1); // Pomijamy pierwszy element, który jest 0

	if (dailyChanges.length === 0) return 0;

	const mean = dailyChanges.reduce((a, b) => a + b, 0) / dailyChanges.length;
	// Obliczamy odchylenie standardowe - miarę zmienności
	const stdDev = Math.sqrt(
		dailyChanges.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) /
			dailyChanges.length
	);

	// Niższe odchylenie = stabilniejszy trend = wyższy bonus
	if (stdDev < 5) return 15; // Bardzo stabilny, zdrowy wzrost
	if (stdDev < 10) return 10; // Stabilny wzrost
	if (stdDev < 15) return 5; // Umiarkowana stabilność
	return 0; // Bardzo zmienny, chaotyczny ruch
}

// Helper do obliczania prostej średniej kroczącej z cen zamknięcia
function calculateSMA(klines, period) {
	if (!klines || klines.length < period) return null;
	const relevantKlines = klines.slice(-period);
	const sum = relevantKlines.reduce((acc, kline) => acc + kline.close, 0);
	return sum / period;
}

/**
 * Helper function to calculate a score based on a smooth, continuous scale instead of discrete steps.
 * @param {number} value - The actual value of the metric (e.g., price change).
 * @param {number} maxExpectedValue - The value at which the maximum score is achieved.
 * @param {number} maxPoints - The maximum points this metric can award.
 * @returns {number} A smoothly calculated score.
 */
function calculateSmoothedScore(value, maxExpectedValue, maxPoints) {
	// We don't penalize for negative values here, just cap at 0
	const clampedValue = Math.max(0, value);
	// Calculate the performance ratio, capping at 1 (100% of expected performance)
	const performanceRatio = Math.min(clampedValue / maxExpectedValue, 1);
	// Return the final score
	return performanceRatio * maxPoints;
}

/**
 * Analizuje strukturę rynku (wyższe szczyty/dołki) na podstawie danych świecowych.
 * @param {Array} klines - Tablica danych świecowych (wymagane co najmniej 30).
 * @returns {number} Wynik od -20 do +30.
 */
function analyzeMarketStructure(klines) {
	if (!klines || klines.length < 30) return 0;

	const closes = klines.map((k) => k.close);
	const recentCloses = closes.slice(-14); // Analiza ostatnich 14 dni

	let score = 0;
	const lastPrice = recentCloses[recentCloses.length - 1];
	const high14d = Math.max(...recentCloses);
	const low14d = Math.min(...recentCloses);

	// Sprawdź, czy cena jest blisko ostatniego szczytu (siła)
	if (lastPrice / high14d > 0.95) {
		score += 15; // Jesteśmy w górnych 5% zakresu - silny sygnał
	}

	// Sprawdź, czy ostatni dołek był wyższy niż poprzedni (potwierdzenie trendu)
	const midPoint = Math.floor(recentCloses.length / 2);
	const firstHalfLow = Math.min(...recentCloses.slice(0, midPoint));
	const secondHalfLow = Math.min(...recentCloses.slice(midPoint));

	if (secondHalfLow > firstHalfLow) {
		score += 15; // Tworzenie wyższego dołka - bardzo byczy sygnał
	}

	// Kara za przełamanie ostatniego dołka
	if (lastPrice < low14d * 1.02) {
		// Cena jest w dolnych 2% zakresu
		score -= 20;
	}

	return score;
}

/**
 * Zwraca dynamiczne wagi dla oceny momentum na podstawie warunków rynkowych.
 * @param {Object} marketConditions - Obiekt zawierający dane o rynku.
 * @param {number} [marketConditions.btcDominance] - Dominacja BTC.
 * @param {Object} [marketConditions.fearAndGreed] - Wskaźnik Fear & Greed.
 * @returns {Object} Obiekt z wagami dla poszczególnych składników oceny.
 */
function getDynamicWeights(marketConditions) {
	const weights = {
		price: 0.35,
		volume: 0.35,
		position: 0.3,
		risk: 0.5,
	};
	if (
		!marketConditions ||
		!marketConditions.btcDominance ||
		!marketConditions.fearAndGreed
	) {
		return weights;
	}

	const { btcDominance, fearAndGreed } = marketConditions;
	const fngValue = fearAndGreed.value;

	// === Dynamiczne Wagi Główne (na podstawie dominacji BTC) ===
	if (btcDominance < 55) {
		weights.price = 0.45;
		weights.volume = 0.3;
		weights.position = 0.25;
	} else if (btcDominance > 60) {
		weights.price = 0.25;
		weights.volume = 0.45;
		weights.position = 0.3;
	}

	// BARDZIEJ AGRESYWNA WAGA RYZYKA
	if (fngValue > 75) {
		// EXTREME GREED
		weights.risk = 0.8; // ZNACZĄCO zwiększamy wagę ryzyka
		console.log(
			'⚖️ Rynek w trybie "Extreme Greed". Zwiększono wagę ryzyka do 0.8.'
		);
	} else if (fngValue > 60) {
		// GREED
		weights.risk = 0.65; // Zwiększamy wagę ryzyka
	} else if (fngValue < 25) {
		// EXTREME FEAR
		weights.risk = 0.4; // Lekko zmniejszamy wagę ryzyka
	}

	return weights;
}

/**
 * Calculate momentum score based on price performance using a smooth scale.
 * @param {Object} coin - Coin data
 * @returns {number} Momentum score (0-100)
 */
function calculatePriceMomentum(coin, klines = []) {
	let score = 0;
	const priceChange7d = coin.priceChange7d || 0;
	const priceChange24h = coin.priceChange24h || 0;

	// 7-day performance (max 40 points)
	score += calculateSmoothedScore(priceChange7d, 70, 40);

	// 24h performance (max 20 points)
	score += calculateSmoothedScore(priceChange24h, 25, 20);

	// Consistency bonus (10 points) - smoothly applied
	if (priceChange24h > 0 && priceChange7d > 0) {
		const consistencyStrength = Math.min(priceChange24h / 15, 1);
		score += consistencyStrength * 10;
	}

	// Dip opportunity bonus (15 points)
	if (priceChange7d > 20 && priceChange24h < 0 && priceChange24h > -10) {
		score += 15;
	}

	// Bonus za jakość i stabilność trendu (max 15 punktów)
	if (priceChange7d > 10) {
		// Dodajemy bonus tylko dla monet w trendzie wzrostowym
		score += calculateTrendStability(klines);
	}

	return Math.min(score, 70); // Maksymalna liczba punktów za cenę to 70
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
	if (coin.price < 0.01)
		score += 30; // "Penny coins"
	else if (coin.price < 0.1)
		score += 25; // Very cheap
	else if (coin.price < 0.5)
		score += 20; // Cheap
	else if (coin.price < 1)
		score += 15; // Under $1 psychological
	else if (coin.price < 2)
		score += 10; // Still attractive
	else if (coin.price < 3) score += 5; // Our max

	// Round number proximity bonus
	if (coin.nearRoundNumber) {
		const distance =
			Math.abs(coin.price - coin.nearRoundNumber) / coin.nearRoundNumber;
		if (distance < 0.05)
			score += 20; // Very close (5%)
		else if (distance < 0.1) score += 10; // Close (10%)
	}

	return Math.min(score, 60);
}

/**
 * Oblicza Współczynnik Ryzyka v2 (bardziej dynamiczny i wielowymiarowy)
 * @param {Object} coin - Dane monety
 * @param {Object} marketConditions - Aktualne warunki rynkowe (w tym Fear & Greed)
 * @param {Array} klines - Dane świecowe (do obliczenia zmienności)
 * @returns {number} Wynik ryzyka (0-100)
 */
function calculateRiskScore(coin, marketConditions = {}, klines = []) {
	let risk = 0;

	// 1. Ryzyko zmienności (Volatility Risk) - ULEPSZONE
	if (klines && klines.length >= 14) {
		const atr14 = require('./accumulation').calculateATR(klines);
		const price = coin.price;
		if (price > 0) {
			const atrPercentage = (atr14 / price) * 100; // Zmienność jako % ceny
			if (atrPercentage > 15)
				risk += 30; // Dzienna zmienność > 15% to bardzo dużo
			else if (atrPercentage > 8) risk += 15;
			else if (atrPercentage > 4) risk += 5;
		}
	}

	// 2. Ryzyko przegrzania rynku (FOMO Risk) - ULEPSZONE
	const priceChange7d = coin.priceChange7d || 0;
	if (priceChange7d > 50) {
		// Kara skalowana zamiast stałej
		risk += Math.min(30, (priceChange7d - 50) / 2); // max 30 pkt
	}

	// 3. Ryzyko sentymentu rynkowego (Market Sentiment Risk)
	if (marketConditions.fearAndGreed) {
		const fngValue = marketConditions.fearAndGreed.value;
		if (fngValue > 80)
			risk += 25; // Extreme Greed
		else if (fngValue > 65) risk += 15; // Greed
	}

	// 4. Ryzyko projektu (Project Risk)
	if (coin.developerData) {
		// Kara za brak aktywności deweloperskiej w ostatnim miesiącu
		if (coin.developerData.commit_count_4_weeks === 0) {
			risk += 20;
		}
	}

	// 5. Ryzyko płynności (Liquidity Risk) - bez zmian
	if (coin.volumeToMcap < 0.02) risk += 15;

	// 6. Ryzyko niskiej kapitalizacji (Low Cap Risk) - ULEPSZONE
	if (coin.rank > 75) {
		risk += Math.min(15, (coin.rank - 75) / 2); // Kara skalowana, max 15 pkt
	}

	//  Ryzyko oddalenia od średniej (Mean Reversion Risk)
	const sma14 = calculateSMA(klines, 14);
	if (sma14 && coin.price > sma14) {
		const distanceFromSMA = ((coin.price - sma14) / sma14) * 100;
		if (distanceFromSMA > 40) {
			risk += 25; // Cena jest >40% powyżej 14-dniowej średniej - bardzo duże ryzyko korekty
		} else if (distanceFromSMA > 25) {
			risk += 15; // Cena jest >25% powyżej średniej
		}
	}

	return Math.min(Math.round(risk), 100); // Zwracamy zaokrągloną wartość, max 100
}

/**
 * Oblicza wynik aktywności deweloperskiej.
 * @param {Object} coin - Obiekt monety z polem `developerData`.
 * @returns {number} Wynik od 0 do 100.
 */
function calculateDeveloperScore(coin) {
	if (!coin.developerData) {
		return 0;
	}

	let score = 0;
	const { commit_count_4_weeks, pull_request_contributors, stars } =
		coin.developerData;

	// Punkty za commity w ostatnich 4 tygodniach (waga: 60%)
	if (commit_count_4_weeks > 50) score += 60;
	else if (commit_count_4_weeks > 20) score += 40;
	else if (commit_count_4_weeks > 5) score += 20;
	else if (commit_count_4_weeks > 0) score += 10;

	// Punkty za liczbę współtwórców (waga: 20%)
	if (pull_request_contributors > 50) score += 20;
	else if (pull_request_contributors > 10) score += 15;
	else if (pull_request_contributors > 1) score += 10;
	else if (pull_request_contributors === 1) score += 5;

	// Punkty za gwiazdki na GitHubie (waga: 20%)
	if (stars > 10000) score += 20;
	else if (stars > 2000) score += 15;
	else if (stars > 500) score += 10;
	else if (stars > 100) score += 5;

	return Math.min(score, 100);
}

/**
 * Calculate comprehensive momentum score with a "Quality" multiplier.
 * @param {Object} coin - Complete coin data with Binance info
 * @param {Object} [marketConditions={}] - Optional market conditions data
 * @param {Object} [additionalData={}] - Optional data for accumulation
 * @param {Array} [sectorAnalysis=[]] - Pre-calculated sector analysis data
 * @returns {Object} Detailed scoring breakdown
 */
function calculateMomentumScore(
	coin,
	marketConditions = {},
	additionalData = {},
	sectorAnalysis = []
) {
	const { calculateTimingScore, getTimingMultiplier } = require('./timing');

	const signals = [];

	// Skip if not on Binance
	if (!coin.binance || !coin.binance.isListed) {
		return {
			totalScore: 0,
			notListed: true,
		};
	}

	// Calculate individual scores
	const priceScore = calculatePriceMomentum(coin, additionalData.klines);
	const volumeScore = calculateVolumeScore(coin);
	const positionScore = calculatePositionScore(coin);
	const riskScore = calculateRiskScore(coin);
	const devScore = calculateDeveloperScore(coin);
	const flowScore = calculateFlowScore(coin.flowData, coin);
	const riskFromFlows = (50 - flowScore) * 0.6; // Scale from -24 to +24
	const finalRiskScore = Math.round(
		Math.max(0, Math.min(100, riskScore + riskFromFlows))
	);
	const dexScore = coin.dexData ? calculateDEXScore(coin.dexData) : 0;
	const vpScore = calculateVolumeProfileScore(coin.volumeProfile, coin.price);

	const structureScore = analyzeMarketStructure(additionalData.klines);

	// Dynamiczne wagi w zależności od strategii**
	const strategyKey = coin.strategy;
	let priceWeight = 0.5,
		volumeWeight = 0.35,
		dexWeight = 0.15; // Domyślne wagi (dla Balanced)

	if (strategyKey === 'MOMENTUM') {
		// W strategii MOMENTUM, siła trendu cenowego jest najważniejsza
		priceWeight = 0.6;
		volumeWeight = 0.3;
		dexWeight = 0.1;
	} else if (strategyKey === 'VALUE') {
		// W strategii VALUE, szukamy "cichej akumulacji", więc wolumen i aktywność DEX są ważniejsze
		priceWeight = 0.3;
		volumeWeight = 0.4;
		dexWeight = 0.3;
	}

	// Step 1: Calculate "Raw Market Strength" (max ~100)
	// Combines price action, volume, and DEX activity.
	const rawStrength =
		priceScore * priceWeight +
		volumeScore * volumeWeight +
		dexScore * dexWeight;

	// Step 2: Calculate "Quality & Safety Multiplier" (ranges approx. 0.5 to 1.5)
	// A score of 50 in each category results in a multiplier of 1.0.
	// Lower risk and better position/dev activity increase the multiplier.
	const qualityMultiplier =
		1 +
		(positionScore - 50) / 100 -
		(finalRiskScore - 50) / 100 +
		devScore / 200;

	// Step 3: Calculate the base score by applying the quality multiplier
	let baseScore = rawStrength * qualityMultiplier + structureScore * 0.3;

	// Then, perform timing analysis
	const timingAnalysis = calculateTimingScore(
		coin,
		marketConditions,
		additionalData.allCoins
	);
	const timingMultiplier = getTimingMultiplier(timingAnalysis.timingScore);

	// Adjust total score based on timing
	let timedScore = baseScore * timingMultiplier;

	// Apply sector multiplier
	let sectorMultiplier = 1.0;
	let finalScore = timedScore;

	if (coin.sector && coin.sector !== 'Unknown' && sectorAnalysis.length > 0) {
		const sectorData = sectorAnalysis.find((s) => s.name === coin.sector);
		if (sectorData) {
			const sectorAvgScore = sectorData.averageScore;
			if (sectorAvgScore > 65) {
				sectorMultiplier = 1.15; // +15% bonus
				signals.push(`🔥 Gorący sektor: ${coin.sector} (+15%)`);
			} else if (sectorAvgScore > 58) {
				sectorMultiplier = 1.07; // +7% bonus
				signals.push(`📈 Sektor w trendzie: ${coin.sector} (+7%)`);
			} else if (sectorAvgScore < 45) {
				sectorMultiplier = 0.9; // -10% penalty
				signals.push(`❄️ Zimny sektor: ${coin.sector} (-10%)`);
			}
			finalScore *= sectorMultiplier;
		}
	}

	// Calculate accumulation and apply bonus if significant
	let accumulationData = null;
	if (additionalData && additionalData.klines && additionalData.whaleData) {
		accumulationData = calculateMomentumScoreWithDEX(
			coin,
			additionalData.klines,
			additionalData.whaleData
		);
		if (accumulationData && accumulationData.score > 75) {
			finalScore *= 1.15; // +15% bonus for extreme accumulation
			signals.push('🔥 Wykryto ekstremalną akumulację Smart Money (+15%)');
		}
	}

	// Determine category based on the final score
	let category = 'NEUTRAL';
	let emoji = '😐';
	if (finalScore >= 70) {
		category = 'HOT';
		emoji = '🔥';
	} else if (finalScore >= 60) {
		category = 'STRONG';
		emoji = '💪';
	} else if (finalScore >= 50) {
		category = 'PROMISING';
		emoji = '🌟';
	} else if (finalScore >= 40) {
		category = 'INTERESTING';
		emoji = '👀';
	} else if (finalScore >= 30) {
		category = 'NEUTRAL';
		emoji = '😐';
	} else {
		category = 'WEAK';
		emoji = '💤';
	}

	// --- Generate all signals ---

	// Smart Volume signals
	if (coin.smartVolume) {
		const sv = coin.smartVolume;
		if (sv.marketCharacter.includes('Whale')) {
			signals.push('🐋 Wieloryby aktywne - duże transakcje dominują');
		} else if (sv.marketCharacter.includes('Retail')) {
			signals.push('👥 Retail FOMO - małe transakcje dominują');
		}
		const whalePercent = parseFloat(sv.categories.whale.volumePercent);
		if (whalePercent > 50 && coin.priceChange24h < 5) {
			signals.push(
				'🎯 Cicha akumulacja - wieloryby kupują bez pompowania ceny'
			);
		}
	}

	// Volume Profile signals
	if (coin.volumeProfile) {
		const vp = coin.volumeProfile;
		const currentPrice = coin.price;
		const pocPrice = vp.pointOfControl.price;
		if (Math.abs(((currentPrice - pocPrice) / pocPrice) * 100) < 2) {
			signals.push(
				`🎯 Cena przy kluczowym poziomie POC ($${pocPrice.toFixed(4)})`
			);
		}
	}

	// Base signals
	const baseSignals = generateSignals(coin, {
		priceScore,
		volumeScore,
		positionScore,
		riskScore: finalRiskScore,
	});
	signals.push(...baseSignals);

	// Flow signals
	const flowSignals = generateFlowSignals(coin.flowData, flowScore);
	signals.push(...flowSignals);

	// DEX signals
	if (coin.dexData) {
		const dexSignals = generateDEXSignals(coin.dexData, coin);
		signals.push(...dexSignals.slice(0, 2)); // Limit to top 2 signals
	}

	// Accumulation signals
	if (accumulationData && accumulationData.signals.length > 0) {
		signals.push(...accumulationData.signals.slice(0, 2));
	}

	// Generate final action and risk-reward analysis
	const actionSignal = generateActionSignal(coin, marketConditions);
	const riskReward = calculateRiskReward(coin, marketConditions, '30d');

	return {
		totalScore: Math.min(100, finalScore).toFixed(2),
		originalScore: baseScore.toFixed(2),
		sectorMultiplier: sectorMultiplier.toFixed(2),
		timingMultiplier: timingMultiplier.toFixed(2),
		priceScore,
		volumeScore,
		positionScore,
		devScore,
		riskScore: finalRiskScore,
		flowScore,
		dexScore,
		accumulation: accumulationData,
		category,
		emoji,
		timing: timingAnalysis,
		actionSignal,
		riskReward,
		breakdown: {
			priceMomentum: `${priceScore.toFixed(0)}/70`,
			volumeActivity: `${volumeScore.toFixed(0)}/100`,
			marketPosition: `${positionScore.toFixed(0)}/60`,
			volumeProfile: `${vpScore.toFixed(0)}/40`,
			dexMetrics: `${dexScore.toFixed(0)}/100`,
			riskFactor: `${finalRiskScore}/100`,
			accumulation: accumulationData ? `${accumulationData.score}/100` : 'N/A',
		},
		signals: signals.filter(Boolean).slice(0, 5),
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
 * Rank coins by momentum score, correctly accepting and passing all necessary data.
 * @param {Array} coins - Array of coins to be ranked.
 * @param {Object} marketConditions - Object with market data.
 * @param {Object} additionalData - Contains allCoins for timing analysis.
 * @param {Array} sectorAnalysis - Pre-calculated sector analysis data.
 * @returns {Array} A sorted array of coins with their momentum scores.
 */
function rankByMomentum(
	coins,
	marketConditions,
	additionalData = {},
	sectorAnalysis = []
) {
	return coins
		.map((coin) => ({
			...coin,
			momentum: calculateMomentumScore(
				coin,
				marketConditions,
				additionalData,
				sectorAnalysis
			),
		}))
		.filter((coin) => coin.momentum && !coin.momentum.notListed)
		.sort(
			(a, b) =>
				parseFloat(b.momentum.totalScore) - parseFloat(a.momentum.totalScore)
		);
}

/**
 * Oblicza punktację na podstawie pozycji ceny względem jej profilu wolumenu.
 * @param {Object} volumeProfile - Dane profilu wolumenu z funkcji getVolumeProfile.
 * @param {number} currentPrice - Aktualna cena monety.
 * @returns {number} Wynik od 0 do 40.
 */
function calculateVolumeProfileScore(volumeProfile, currentPrice) {
	if (!volumeProfile || !currentPrice) {
		return 0;
	}

	const pocPrice = volumeProfile.pointOfControl.price;
	const valueAreaHigh = volumeProfile.valueArea.high;
	const valueAreaLow = volumeProfile.valueArea.low;

	let score = 0;

	// 1. Cena jest w Strefie Wartości (Value Area) - sygnał "uczciwej ceny" i stabilności.
	if (currentPrice >= valueAreaLow && currentPrice <= valueAreaHigh) {
		score += 20; // Solidna baza punktowa
	}

	// 2. Pozycja ceny względem POC (najważniejszy poziom)
	const priceVsPOC = ((currentPrice - pocPrice) / pocPrice) * 100; // Różnica w %

	if (priceVsPOC > 0 && priceVsPOC <= 5) {
		// Cena tuż nad POC (0-5%) - bardzo byczy sygnał, udany retest wsparcia.
		score += 20;
	} else if (priceVsPOC > 5 && priceVsPOC <= 15) {
		// Cena konsoliduje się powyżej POC (5-15%) - wciąż byczo.
		score += 10;
	} else if (priceVsPOC < 0 && priceVsPOC >= -5) {
		// Cena tuż poniżej POC (0 do -5%) - może testować opór, sygnał neutralny.
		score += 5;
	} else if (priceVsPOC < -15) {
		// Cena daleko poniżej POC - potencjalna strefa akumulacji, ale wymaga potwierdzenia.
		score += 10; // Bonus za potencjalne niedowartościowanie.
	}

	// Ogranicz wynik do 40 punktów.
	return Math.min(score, 40);
}

module.exports = {
	calculatePriceMomentum,
	calculateVolumeScore,
	calculatePositionScore,
	calculateRiskScore,
	calculateMomentumScore,
	generateSignals,
	rankByMomentum,
	calculateSMA,
};
