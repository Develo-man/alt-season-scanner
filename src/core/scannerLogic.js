require('dotenv').config();

// --- Importy zależności ---
const cache = require('./cache');

const {
	getTop100,
	getBTCDominance,
	getCoinDeveloperData,
} = require('../apis/coingecko');
const {
	checkMultipleCoins,
	getBuySellPressure,
	getSmartVolumeAnalysis,
	getVolumeProfile,
	getKlines,
} = require('../apis/binance');
const { getFearAndGreedIndex } = require('../apis/fearAndGreed');
const { batchAnalyzeDEX } = require('../apis/dexAnalytics');
const { filterAndSort } = require('../utils/filters');
const { rankByMomentum } = require('../utils/momentum');
const { getSector } = require('../utils/sectors');
const { analyzeSectors } = require('../utils/analysis');
const { loadHistory, analyzeTrend } = require('../apis/btcDominance');
const config = require('../config');

const MARKET_DATA_CACHE_TTL = 15 * 60 * 1000; // 15 minut

/**
 * Helper function to get all unique coins from the strategies.
 * @param {Object} strategyResults - Object containing the results for each strategy.
 * @returns {Array} An array of unique coin objects.
 */
function getAllCoinsFromStrategies(strategyResults) {
	const allCoins = [];
	const seenSymbols = new Set();

	Object.values(strategyResults).forEach((strategy) => {
		if (
			strategy.enrichedCandidates &&
			Array.isArray(strategy.enrichedCandidates)
		) {
			strategy.enrichedCandidates.forEach((coin) => {
				if (!seenSymbols.has(coin.symbol)) {
					seenSymbols.add(coin.symbol);
					allCoins.push(coin);
				}
			});
		}
	});
	return allCoins;
}
// --- Główna funkcja skanera ---

/**
 * Uruchamia pełny proces skanowania kryptowalut i zwraca ustrukturyzowane wyniki.
 * @returns {Promise<Object>} Obiekt zawierający pełne wyniki skanowania.
 */
async function runScanner() {
	console.log('🔄 Uruchamiam rozszerzony skaner z DEX Analytics...');

	// --- Krok 1: Pobranie danych rynkowych ---
	let btcDominance = cache.get('btcDominance');
	let fearAndGreed = cache.get('fearAndGreed');
	let top100Data = cache.get('top100Data');

	if (btcDominance && fearAndGreed && top100Data) {
		console.log('✅ Pobrano podstawowe dane rynkowe z CACHE.');
	} else {
		console.log('📊 Pobieram świeże dane rynkowe z API...');
		const [fetchedDominance, fetchedFnG, fetchedTop100] = await Promise.all([
			getBTCDominance(),
			getFearAndGreedIndex(),
			getTop100(),
		]);

		// Zapisz świeże dane do cache
		cache.set('btcDominance', fetchedDominance, MARKET_DATA_CACHE_TTL);
		cache.set('fearAndGreed', fetchedFnG, MARKET_DATA_CACHE_TTL);
		// W getTop100 zwracany jest obiekt, bierzemy z niego `coins`
		cache.set('top100Data', fetchedTop100.coins, MARKET_DATA_CACHE_TTL);

		btcDominance = fetchedDominance;
		fearAndGreed = fetchedFnG;
		top100Data = fetchedTop100.coins;
	}

	// Wczytaj historię dominacji - to jest z pliku, więc nie potrzebuje cache
	const history = await loadHistory();
	const trendAnalysis = analyzeTrend(history);
	const dominanceChange24h = trendAnalysis.changes['24h'];

	// --- Krok 2: TRIPLE STRATEGY FILTERING ---
	console.log('🎯 Uruchamiam analizę trzech strategii...');

	const strategyResults = {};
	const allCandidates = new Set(); // Unikalne monety ze wszystkich strategii

	// Process each strategy
	for (const [key, strategy] of Object.entries(config.strategies)) {
		console.log(`${strategy.emoji} Filtrowanie: ${strategy.name}`);

		const candidates = filterAndSort(
			top100Data,
			{
				...strategy.criteria,
				excludeStablecoins: true,
			},
			'momentum',
			40
		);

		strategyResults[key] = {
			...strategy,
			candidates,
			count: candidates.length,
		};

		// Add to master list
		candidates.forEach((coin) => allCandidates.add(coin.symbol));
		console.log(`   └─ Znaleziono ${candidates.length} kandydatów`);
	}

	console.log(`\n📊 Podsumowanie strategii:`);
	console.log(`🚀 Momentum: ${strategyResults.MOMENTUM.count} monet`);
	console.log(`💎 Value: ${strategyResults.VALUE.count} monet`);
	console.log(`⚖️ Balanced: ${strategyResults.BALANCED.count} monet`);
	console.log(`🎯 Unikalne monety: ${allCandidates.size}`);

	// --- Krok 3: Weryfikacja na Binance dla wszystkich kandydatów ---
	const uniqueSymbols = Array.from(allCandidates);
	const binanceData = await checkMultipleCoins(uniqueSymbols);

	// --- Krok 4: Wzbogacenie danych dla każdej strategii ---
	for (const [key, strategy] of Object.entries(strategyResults)) {
		const enrichedCandidates = strategy.candidates
			.map((coin) => {
				const binanceInfo = binanceData[coin.symbol.toUpperCase()];
				return {
					...coin,
					sector: getSector(coin.symbol),
					binance: binanceInfo,
					isOnBinance: binanceInfo?.isListed,
					strategy: key, // Tag coin with strategy
				};
			})
			.filter((coin) => coin.isOnBinance);

		strategyResults[key].enrichedCandidates = enrichedCandidates;
		strategyResults[key].binanceCount = enrichedCandidates.length;
	}

	// --- Krok 5: DEX Analytics for top candidates from each strategy ---
	const topCandidatesForDEX = [];
	Object.values(strategyResults).forEach((strategy) => {
		topCandidatesForDEX.push(
			...strategy.enrichedCandidates.slice(0, 8).map((coin) => ({
				symbol: coin.symbol,
				contractAddress: coin.contractAddress,
				strategy: coin.strategy,
			}))
		);
	});

	const dexAnalytics = await batchAnalyzeDEX(topCandidatesForDEX);

	// --- Krok 6: Wzbogacenie danych dla wszystkich monet (Klines) i top monet (reszta) ---
	console.log(`⚙️ Wzbogacam dane dla kandydatów...`);

	for (const [key, strategy] of Object.entries(strategyResults)) {
		// Pobieramy klines DLA WSZYSTKICH monet w strategii
		const klinesPromises = strategy.enrichedCandidates.map(async (coin) => {
			if (coin.binance && coin.binance.mainPair) {
				// Potrzebujemy 14 dni danych do obliczenia ATR
				coin.klines = await getKlines(coin.binance.mainPair, '1d', 14);
			}
			return coin;
		});
		await Promise.all(klinesPromises);

		// Pobieramy pozostałe, cięższe dane tylko dla TOP 6
		const topCoinsForFullEnrichment = strategy.enrichedCandidates.slice(0, 6);
		const enrichmentPromises = topCoinsForFullEnrichment.map(async (coin) => {
			// Add DEX data
			coin.dexData = dexAnalytics[coin.symbol] || null;

			const promises = {
				devData: getCoinDeveloperData(coin.id),
				pressureData: null,
				smartVolume: null,
				volumeProfile: null,
			};

			if (coin.binance && coin.binance.mainPair) {
				const mainPair = coin.binance.mainPair;
				promises.pressureData = getBuySellPressure(mainPair, 60);
				promises.smartVolume = getSmartVolumeAnalysis(mainPair, 24);
				promises.volumeProfile = getVolumeProfile(mainPair, '1h', 24);
			}

			const results = await Promise.all(Object.values(promises));
			coin.developerData = results[0];
			coin.pressureData = results[1];
			coin.smartVolume = results[2];
			coin.volumeProfile = results[3];

			return coin;
		});

		await Promise.all(enrichmentPromises);
	}
	// --- Krok 7: Enhanced momentum calculation for each strategy ---
	const marketConditions = { btcDominance, fearAndGreed };

	for (const [key, strategy] of Object.entries(strategyResults)) {
		const rankedCoins = rankByMomentum(
			strategy.enrichedCandidates,
			marketConditions,
			{ allCoins: getAllCoinsFromStrategies(strategyResults) }
		);
		strategyResults[key].rankedCoins = rankedCoins;
		strategyResults[key].topCoin = rankedCoins[0] || null;
	}
	// --- Krok 8: Cross-strategy analysis ---
	const crossStrategyAnalysis = analyzeCrossStrategies(strategyResults);

	// --- Krok 9: Market condition analysis ---
	let condition, advice, recommendedStrategy;
	if (btcDominance > 65) {
		condition = 'SEZON BITCOINA';
		advice = 'Trudny czas dla altów - preferuj strategię VALUE';
		recommendedStrategy = 'VALUE';
	} else if (btcDominance > 55) {
		condition = 'FAZA PRZEJŚCIOWA';
		advice = 'Zmienny rynek - najlepsza będzie strategia BALANCED';
		recommendedStrategy = 'BALANCED';
	} else {
		condition = 'SEZON ALTCOINÓW';
		advice = 'Doskonały czas na zagrania pod MOMENTUM';
		recommendedStrategy = 'MOMENTUM';
	}

	// Enhanced coin formatting with DEX priority
	// --- Krok 10: Generate final results ---
	return {
		marketStatus: {
			btcDominance: btcDominance.toFixed(2),
			dominanceChange: `${dominanceChange24h}%`,
			condition,
			advice,
			recommendedStrategy,
			fearAndGreed: fearAndGreed
				? {
						value: fearAndGreed.value,
						classification: fearAndGreed.classification,
					}
				: null,
		},

		// Strategy-specific results
		strategies: Object.entries(strategyResults).map(([key, strategy]) => ({
			key,
			name: strategy.name,
			description: strategy.description,
			emoji: strategy.emoji,
			color: strategy.color,
			advice: strategy.advice,
			totalCandidates: strategy.count,
			binanceCandidates: strategy.binanceCount,
			topCoins: strategy.rankedCoins || [],
			topCoin: strategy.topCoin,
			performance: calculateStrategyPerformance(strategy.rankedCoins || []),
			isRecommended: key === recommendedStrategy,
		})),

		// Cross-strategy insights
		crossStrategy: crossStrategyAnalysis,

		// Traditional sector analysis (combined)
		sectorAnalysis: analyzeSectors(
			Object.values(strategyResults)
				.flatMap((s) => s.rankedCoins || [])
				.slice(0, 50) // Top 50 across all strategies
		),

		// Global stats
		stats: {
			totalAnalyzed: top100Data.length,
			totalUniqueCandidates: allCandidates.size,
			totalWithDEXData: Object.values(dexAnalytics).filter((d) => d.hasDEXData)
				.length,
			avgMomentumByStrategy: Object.fromEntries(
				Object.entries(strategyResults).map(([key, strategy]) => [
					key,
					calculateAverageScore(strategy.rankedCoins || []),
				])
			),
		},

		lastUpdate: new Date().toISOString(),
	};
}
/**
 * Generate DEX analytics summary
 * @param {Array} coins - Formatted coins with DEX data
 * @returns {Object} DEX summary
 */
function generateDEXSummary(coins) {
	const coinsWithDEX = coins.filter((c) => c.dexData?.hasDEXData);

	if (coinsWithDEX.length === 0) {
		return {
			totalCoinsAnalyzed: coins.length,
			coinsWithDEXData: 0,
			message: 'Brak dostępnych danych DEX dla analizowanych monet',
		};
	}

	const totalDEXVolume = coinsWithDEX.reduce(
		(sum, coin) => sum + (coin.dexData.totalVolume24h || 0),
		0
	);

	const totalDEXLiquidity = coinsWithDEX.reduce(
		(sum, coin) => sum + (coin.dexData.totalLiquidity || 0),
		0
	);

	const avgBuyPressure =
		coinsWithDEX.reduce(
			(sum, coin) => sum + parseFloat(coin.dexData.buyPressure || 50),
			0
		) / coinsWithDEX.length;

	const topDEXOpportunities = coinsWithDEX
		.filter((coin) => coin.isDEXAlpha)
		.sort(
			(a, b) =>
				parseFloat(b.momentum.totalScore) - parseFloat(a.momentum.totalScore)
		)
		.slice(0, 5);

	return {
		totalCoinsAnalyzed: coins.length,
		coinsWithDEXData: coinsWithDEX.length,
		dexCoverage: ((coinsWithDEX.length / coins.length) * 100).toFixed(1) + '%',

		aggregateMetrics: {
			totalVolume24h: formatLargeNumber(totalDEXVolume),
			totalLiquidity: formatLargeNumber(totalDEXLiquidity),
			avgBuyPressure: avgBuyPressure.toFixed(1) + '%',
		},

		opportunities: {
			alphaCount: topDEXOpportunities.length,
			highVolumeCount: coins.filter((c) => c.hasHighDEXVolume).length,
			topAlphaCoins: topDEXOpportunities.map((coin) => ({
				symbol: coin.symbol,
				dexScore: coin.momentum.dexScore,
				liquidityScore: coin.dexData.liquidityScore,
				buyPressure: coin.dexData.buyPressure,
			})),
		},

		marketInsights: generateDEXMarketInsights(coinsWithDEX, avgBuyPressure),
	};
}

/**
 * Generate DEX market insights
 * @param {Array} coinsWithDEX - Coins with DEX data
 * @param {number} avgBuyPressure - Average buy pressure
 * @returns {Array} Market insights
 */
function generateDEXMarketInsights(coinsWithDEX, avgBuyPressure) {
	const insights = [];

	if (avgBuyPressure > 60) {
		insights.push('🟢 Silna presja kupna na DEX - bullish sentiment');
	} else if (avgBuyPressure < 40) {
		insights.push('🔴 Dominuje presja sprzedaży na DEX - bearish sentiment');
	} else {
		insights.push('🟡 Zrównoważona presja na DEX - rynek niezdecydowany');
	}

	const highLiquidityCoins = coinsWithDEX.filter(
		(c) => c.dexData.liquidityScore >= 80
	).length;
	if (highLiquidityCoins > coinsWithDEX.length * 0.5) {
		insights.push('💧 Doskonała płynność DEX - niskie slippage');
	} else if (highLiquidityCoins < coinsWithDEX.length * 0.2) {
		insights.push('⚠️ Niska płynność DEX - uważaj na slippage');
	}

	const organicVolumeCoins = coinsWithDEX.filter(
		(c) => c.dexData.volumeQualityScore >= 70
	).length;
	if (organicVolumeCoins > coinsWithDEX.length * 0.7) {
		insights.push('✅ Przeważnie organiczny wolumen DEX');
	} else if (organicVolumeCoins < coinsWithDEX.length * 0.3) {
		insights.push('⚠️ Podejrzany wolumen DEX - możliwe wash trading');
	}

	return insights;
}

/**
 * Calculate average DEX liquidity
 * @param {Array} coins - Coins array
 * @returns {string} Formatted average liquidity
 */
function calculateAvgDEXLiquidity(coins) {
	const coinsWithDEX = coins.filter((c) => c.dexData?.hasDEXData);
	if (coinsWithDEX.length === 0) return '$0';

	const avgLiquidity =
		coinsWithDEX.reduce(
			(sum, coin) => sum + (coin.dexData.totalLiquidity || 0),
			0
		) / coinsWithDEX.length;

	return formatLargeNumber(avgLiquidity);
}

/**
 * Format large numbers
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatLargeNumber(num) {
	if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
	if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
	if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
	return `$${num.toFixed(2)}`;
}

/**
 * Analyze coins that appear in multiple strategies
 */
function analyzeCrossStrategies(strategyResults) {
	const coinOccurrences = new Map();

	// Count occurrences across strategies
	Object.entries(strategyResults).forEach(([strategyKey, strategy]) => {
		(strategy.enrichedCandidates || []).forEach((coin) => {
			if (!coinOccurrences.has(coin.symbol)) {
				coinOccurrences.set(coin.symbol, {
					coin,
					strategies: [],
					totalScore: 0,
				});
			}

			const entry = coinOccurrences.get(coin.symbol);
			entry.strategies.push(strategyKey);

			// Add momentum score if available
			if (coin.momentum?.totalScore) {
				entry.totalScore = Math.max(
					entry.totalScore,
					parseFloat(coin.momentum.totalScore)
				);
			}
		});
	});

	// Find multi-strategy coins
	const multiStrategyCoins = Array.from(coinOccurrences.values())
		.filter((entry) => entry.strategies.length > 1)
		.sort((a, b) => b.totalScore - a.totalScore)
		.slice(0, 10);

	// Strategy overlap analysis
	const overlaps = {};
	const strategies = Object.keys(strategyResults);

	for (let i = 0; i < strategies.length; i++) {
		for (let j = i + 1; j < strategies.length; j++) {
			const strat1 = strategies[i];
			const strat2 = strategies[j];

			const coins1 = new Set(
				(strategyResults[strat1].enrichedCandidates || []).map((c) => c.symbol)
			);
			const coins2 = new Set(
				(strategyResults[strat2].enrichedCandidates || []).map((c) => c.symbol)
			);

			const intersection = [...coins1].filter((symbol) => coins2.has(symbol));
			overlaps[`${strat1}_${strat2}`] = {
				count: intersection.length,
				coins: intersection.slice(0, 5), // Top 5 overlapping coins
			};
		}
	}

	return {
		multiStrategyCoins,
		overlaps,
		insights: generateCrossStrategyInsights(multiStrategyCoins, overlaps),
	};
}

/**
 * Generate insights about cross-strategy performance
 */
function generateCrossStrategyInsights(multiStrategyCoins, overlaps) {
	const insights = [];

	if (multiStrategyCoins.length > 0) {
		insights.push(
			`🎯 ${multiStrategyCoins.length} monet pasuje do wielu strategii - najsilniejsze sygnały`
		);

		const topCoin = multiStrategyCoins[0];
		insights.push(
			`👑 Najlepsze multi-strategy: ${topCoin.coin.symbol} (${topCoin.strategies.join(', ')})`
		);
	}

	// Analyze overlaps
	const maxOverlap = Math.max(...Object.values(overlaps).map((o) => o.count));
	if (maxOverlap > 0) {
		const bestOverlap = Object.entries(overlaps).find(
			([_, data]) => data.count === maxOverlap
		);
		insights.push(
			`🔄 Największe nakładanie strategii: ${bestOverlap[0].replace('_', ' + ')} (${maxOverlap} monet)`
		);
	}

	if (multiStrategyCoins.length === 0) {
		insights.push(
			'📊 Każda strategia znajduje unikalne możliwości - zdywersyfikowany rynek'
		);
	}

	return insights;
}

/**
 * Calculate strategy performance metrics
 */
function calculateStrategyPerformance(coins) {
	if (!coins || coins.length === 0) {
		return {
			avgScore: 0,
			avgRisk: 0,
			topScorer: null,
			successRate: 0,
		};
	}

	const scores = coins.map((c) => parseFloat(c.momentum?.totalScore || 0));
	const risks = coins.map((c) => parseFloat(c.momentum?.riskScore || 50));

	return {
		avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
		avgRisk: risks.reduce((a, b) => a + b, 0) / risks.length,
		topScorer: coins[0],
		successRate: (scores.filter((s) => s >= 50).length / scores.length) * 100,
		strongCandidates: scores.filter((s) => s >= 60).length,
	};
}

/**
 * Calculate average momentum score
 */
function calculateAverageScore(coins) {
	if (!coins || coins.length === 0) return 0;

	const scores = coins
		.map((c) => parseFloat(c.momentum?.totalScore || 0))
		.filter((score) => score > 0);

	return scores.length > 0
		? scores.reduce((a, b) => a + b, 0) / scores.length
		: 0;
}

module.exports = {
	runScanner,
	TRADING_STRATEGIES: config.strategies,
};
