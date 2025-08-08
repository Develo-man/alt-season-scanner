require('dotenv').config();

const cache = require('./cache');

const {
	getTop100,
	getGlobalMarketData,
	getCoinDeveloperData,
	getEthBtcChartData,
	getGlobalMarketHistory,
	getSSRData,
} = require('../apis/coingecko');
const {
	checkMultipleCoins,
	getBuySellPressure,
	getSmartVolumeAnalysis,
	getVolumeProfile,
	getKlines,
	getStablecoinActivity,
} = require('../apis/binance');
const { getFearAndGreedIndex } = require('../apis/fearAndGreed');
const { batchAnalyzeDEX } = require('../apis/dexAnalytics');
const { filterAndSort } = require('../utils/filters');
const { rankByMomentum } = require('../utils/momentum');
const { getSector } = require('../utils/sectors');
const { analyzeSectors } = require('../utils/analysis');
const {
	loadHistory,
	analyzeTrend,
	analyzeEthBtcTrend,
} = require('../apis/btcDominance');
const config = require('../config');
const { getOnChainData } = require('../apis/santiment');
const { analyzeStablecoinActivity } = require('../utils/stablecoinActivity');
const { getInterestRate, getDXYIndex } = require('../apis/macro');
const { getAltcoinSeasonIndex } = require('../apis/blockchaincenter');

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

/**
 * Analizuje trend kapitalizacji altcoinów (TOTAL2).
 * @param {Array} globalMarketHistory - Historia kapitalizacji całego rynku.
 * @param {Array} btcDominanceHistory - Historia dominacji BTC.
 * @returns {Object} Obiekt z interpretacją trendu.
 */
function analyzeTotal2Trend(globalMarketHistory, btcDominanceHistory) {
	if (
		!globalMarketHistory ||
		globalMarketHistory.length < 30 ||
		!btcDominanceHistory ||
		btcDominanceHistory.length < 30
	) {
		return {
			trend: 'UNKNOWN',
			description: 'Brak wystarczających danych do analizy trendu TOTAL2.',
		};
	}

	// Bierzemy dane z ostatnich 30 dni
	const last30DaysCaps = globalMarketHistory.slice(-30);
	const last30DaysDoms = btcDominanceHistory.slice(-30);

	// Obliczamy wartości TOTAL2 dla ostatniego i 7. dnia od końca
	const currentTotalCap = last30DaysCaps[last30DaysCaps.length - 1][1];
	const currentBtcDom = last30DaysDoms[last30DaysDoms.length - 1].btc;
	const currentTotal2 = currentTotalCap * (1 - currentBtcDom / 100);

	const weekAgoTotalCap = last30DaysCaps[last30DaysCaps.length - 8][1];
	const weekAgoBtcDom = last30DaysDoms[last30DaysDoms.length - 8].btc;
	const weekAgoTotal2 = weekAgoTotalCap * (1 - weekAgoBtcDom / 100);

	const change7d = ((currentTotal2 - weekAgoTotal2) / weekAgoTotal2) * 100;

	let description = 'Rynek w konsolidacji.';
	if (change7d > 10) {
		description = 'Dynamiczny wzrost. Kapitał płynie do altcoinów.';
	} else if (change7d > 3) {
		description = 'Umiarkowany wzrost. Pozytywny sentyment.';
	} else if (change7d < -10) {
		description = 'Wyraźny spadek. Kapitał odpływa z altcoinów.';
	} else if (change7d < -3) {
		description = 'Lekki spadek. Rynek wykazuje słabość.';
	}

	return {
		change7d: change7d.toFixed(1) + '%',
		description: description,
	};
}

// --- Główna funkcja skanera ---

/**
 * Uruchamia pełny proces skanowania kryptowalut i zwraca ustrukturyzowane wyniki.
 * @returns {Promise<Object>} Obiekt zawierający pełne wyniki skanowania.
 */
async function runScanner() {
	console.log('🔄 Uruchamiam rozszerzony skaner z DEX Analytics...');

	// --- Krok 1: Pobranie danych rynkowych ---
	let globalMarketData = cache.get('globalMarketData');
	let fearAndGreed = cache.get('fearAndGreed');
	let top100Data = cache.get('top100Data');
	let stablecoinActivity = cache.get('stablecoinActivity');
	let ssrData = cache.get('ssrData');
	let altcoinIndex = cache.get('altcoinIndex');

	if (
		globalMarketData &&
		fearAndGreed &&
		top100Data &&
		stablecoinActivity &&
		ssrData &&
		altcoinIndex
	) {
		console.log(
			'✅ Pobrano podstawowe dane rynkowe, aktywność stablecoinów i SSR z CACHE.'
		);
	} else {
		console.log('📊 Pobieram świeże dane rynkowe z API...');
		const [
			fetchedDominance,
			fetchedFnG,
			fetchedTop100,
			fetchedActivity,
			fetchedSsrData,
			fetchedAltcoinIndex,
		] = await Promise.all([
			getGlobalMarketData(),
			getFearAndGreedIndex(),
			getTop100(),
			getStablecoinActivity(),
			getSSRData(),
			getAltcoinSeasonIndex(),
		]);

		cache.set('globalMarketData', fetchedDominance, MARKET_DATA_CACHE_TTL);
		cache.set('fearAndGreed', fetchedFnG, MARKET_DATA_CACHE_TTL);
		cache.set('top100Data', fetchedTop100.coins, MARKET_DATA_CACHE_TTL);
		cache.set('stablecoinActivity', fetchedActivity, MARKET_DATA_CACHE_TTL);
		cache.set('ssrData', fetchedSsrData, MARKET_DATA_CACHE_TTL);
		cache.set('altcoinIndex', fetchedAltcoinIndex, MARKET_DATA_CACHE_TTL);

		globalMarketData = fetchedDominance;
		fearAndGreed = fetchedFnG;
		top100Data = fetchedTop100.coins;
		stablecoinActivity = fetchedActivity;
		ssrData = fetchedSsrData;
		altcoinIndex = fetchedAltcoinIndex;
	}

	console.log('📈 Pobieram dane makroekonomiczne...');
	const [interestRate, dxyIndex] = await Promise.all([
		getInterestRate(),
		getDXYIndex(),
	]);

	const btcDominance = globalMarketData.market_cap_percentage.btc;
	const totalMarketCap = globalMarketData.total_market_cap.usd;
	const total2MarketCap = totalMarketCap * (1 - btcDominance / 100);

	const marketActivity = analyzeStablecoinActivity(stablecoinActivity);

	const history = await loadHistory();
	const trendAnalysis = analyzeTrend(history);
	const dominanceChange24h = trendAnalysis.changes['24h'];

	const ethBtcHistory = await getEthBtcChartData();
	const ethBtcTrend = analyzeEthBtcTrend(ethBtcHistory);

	const globalMarketHistory = await getGlobalMarketHistory();
	const total2Trend = analyzeTotal2Trend(globalMarketHistory, history);

	// --- Krok 2: Określenie warunków rynkowych i wybór strategii ---
	console.log('🎯 Określam warunki rynkowe i wybieram aktywne strategie...');
	let condition, advice, recommendedStrategy, activeStrategies;

	if (btcDominance < 55 && ethBtcTrend.trend.includes('UP')) {
		condition = 'POTWIERDZONY ALT SEASON';
		advice =
			'Dominacja BTC niska, ETH rośnie. Idealne warunki dla strategii MOMENTUM.';
		recommendedStrategy = 'MOMENTUM';
		activeStrategies = config.marketPhases.ALT_SEASON;
	} else if (btcDominance < 58) {
		condition = 'POCZĄTEK ALT SEZONU';
		advice = 'Dominacja BTC spada. Szukaj okazji pod MOMENTUM i BALANCED.';
		recommendedStrategy = 'MOMENTUM';
		activeStrategies = config.marketPhases.ALT_SEASON;
	} else if (btcDominance > 65) {
		condition = 'SEZON BITCOINA';
		advice =
			'Trudny czas dla altów. Szukaj okazji w strategii VALUE i obserwuj ETH/BTC.';
		recommendedStrategy = 'VALUE';
		activeStrategies = config.marketPhases.BITCOIN_SEASON;
	} else {
		// Pomiędzy 58 a 65
		condition = 'FAZA PRZEJŚCIOWA';
		advice =
			'Zmienny rynek. Najlepsze podejście to BALANCED, ale obserwuj siłę ETH.';
		recommendedStrategy = 'BALANCED';
		activeStrategies = config.marketPhases.TRANSITION;
	}

	console.log(
		`Aktualna faza: ${condition}. Aktywne strategie: ${activeStrategies.join(', ')}`
	);

	// --- Krok 3: Filtrowanie według aktywnych strategii ---
	console.log('🎯 Uruchamiam filtrowanie według aktywnych strategii...');
	const strategyResults = {};
	const allCandidates = new Set();

	for (const key of activeStrategies) {
		const strategy = config.strategies[key];
		if (!strategy) continue;

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

		candidates.forEach((coin) => allCandidates.add(coin.symbol));
		console.log(`   └─ Znaleziono ${candidates.length} kandydatów`);
	}

	console.log(`\n📊 Podsumowanie strategii:`);
	Object.keys(strategyResults).forEach((key) => {
		const strategy = strategyResults[key];
		console.log(`${strategy.emoji} ${strategy.name}: ${strategy.count} monet`);
	});
	console.log(`🎯 Unikalne monety do dalszej analizy: ${allCandidates.size}`);

	// --- Krok 4: Weryfikacja na Binance dla wszystkich kandydatów ---
	const uniqueSymbols = Array.from(allCandidates);
	const binanceData = await checkMultipleCoins(uniqueSymbols);

	// --- Krok 5: Wzbogacenie danych dla każdej strategii ---
	for (const [key, strategy] of Object.entries(strategyResults)) {
		const enrichedCandidates = strategy.candidates
			.map((coin) => {
				const binanceInfo = binanceData[coin.symbol.toUpperCase()];
				return {
					...coin,
					sector: getSector(coin.symbol),
					binance: binanceInfo,
					isOnBinance: binanceInfo?.isListed,
					strategy: key,
				};
			})
			.filter((coin) => coin.isOnBinance);

		strategyResults[key].enrichedCandidates = enrichedCandidates;
		strategyResults[key].binanceCount = enrichedCandidates.length;
	}

	// --- Krok 6: Zbierz unikalne monety do wzbogacenia ---
	const allEnrichedCoins = getAllCoinsFromStrategies(strategyResults);
	const uniqueCoinsToEnrich = new Map();
	allEnrichedCoins.forEach((coin) => {
		if (!uniqueCoinsToEnrich.has(coin.symbol)) {
			uniqueCoinsToEnrich.set(coin.symbol, coin);
		}
	});
	const coinsToEnrichList = Array.from(uniqueCoinsToEnrich.values());
	console.log(
		`⚙️ Wzbogacam dane dla ${coinsToEnrichList.length} unikalnych monet...`
	);

	// --- Krok 7: Zoptymalizowane wzbogacanie danych (DEX, Klines, Santiment itp.) ---
	const dexAnalytics = await batchAnalyzeDEX(
		coinsToEnrichList.map((c) => ({
			symbol: c.symbol,
			contractAddress: c.contractAddress,
		}))
	);

	const enrichmentPromises = coinsToEnrichList.map(async (coin) => {
		coin.dexData = dexAnalytics[coin.symbol] || null;

		const promises = {
			klines: null,
			devData: getCoinDeveloperData(coin.id),
			pressureData: null,
			smartVolume: null,
			volumeProfile: null,
			flowData: process.env.SANTIMENT_API_KEY
				? getOnChainData(coin.id)
				: Promise.resolve(null),
		};

		if (coin.binance && coin.binance.mainPair) {
			const mainPair = coin.binance.mainPair;
			promises.klines = getKlines(mainPair, '1d', 14);
			promises.pressureData = getBuySellPressure(mainPair, 60);
			promises.smartVolume = getSmartVolumeAnalysis(mainPair, 24);
			promises.volumeProfile = getVolumeProfile(mainPair, '1h', 24);
		}

		const results = await Promise.all(Object.values(promises));
		coin.klines = results[0];
		coin.developerData = results[1];
		coin.pressureData = results[2];
		coin.smartVolume = results[3];
		coin.volumeProfile = results[4];
		coin.flowData = results[5];

		return coin;
	});

	const fullyEnrichedCoinsList = await Promise.all(enrichmentPromises);
	const fullyEnrichedCoinsMap = new Map(
		fullyEnrichedCoinsList.map((c) => [c.symbol, c])
	);

	Object.values(strategyResults).forEach((strategy) => {
		strategy.enrichedCandidates.forEach((coin, index) => {
			if (fullyEnrichedCoinsMap.has(coin.symbol)) {
				strategy.enrichedCandidates[index] = fullyEnrichedCoinsMap.get(
					coin.symbol
				);
			}
		});
	});

	// --- Krok 8: Obliczenia momentum i ranking ---
	const marketConditions = {
		btcDominance,
		fearAndGreed,
		dominanceChange: dominanceChange24h,
	};

	for (const [key, strategy] of Object.entries(strategyResults)) {
		const rankedCoins = rankByMomentum(
			strategy.enrichedCandidates,
			marketConditions,
			{ allCoins: getAllCoinsFromStrategies(strategyResults) }
		);
		strategyResults[key].rankedCoins = rankedCoins;
		strategyResults[key].topCoin = rankedCoins[0] || null;
	}

	// --- Krok 9: Analiza między-strategiczna ---
	const crossStrategyAnalysis = analyzeCrossStrategies(strategyResults);

	// --- Krok 10: Generowanie finalnych wyników ---
	return {
		marketStatus: {
			btcDominance: btcDominance.toFixed(2),
			total2MarketCap: total2MarketCap,
			dominanceChange: `${dominanceChange24h}%`,
			ethBtcTrend: ethBtcTrend,
			condition,
			advice,
			recommendedStrategy,
			fearAndGreed: fearAndGreed
				? {
						value: fearAndGreed.value,
						classification: fearAndGreed.classification,
					}
				: null,
			stablecoinActivity: marketActivity,
			total2Trend: total2Trend,
			interestRate: interestRate,
			dxyIndex: dxyIndex,
			ssrData: ssrData,
			altcoinSeasonIndex: altcoinIndex,
		},
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
		crossStrategy: crossStrategyAnalysis,
		sectorAnalysis: analyzeSectors(
			Object.values(strategyResults)
				.flatMap((s) => s.rankedCoins || [])
				.slice(0, 50)
		),
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

			if (coin.momentum?.totalScore) {
				entry.totalScore = Math.max(
					entry.totalScore,
					parseFloat(coin.momentum.totalScore)
				);
			}
		});
	});

	const multiStrategyCoins = Array.from(coinOccurrences.values())
		.filter((entry) => entry.strategies.length > 1)
		.sort((a, b) => b.totalScore - a.totalScore)
		.slice(0, 10);

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
				coins: intersection.slice(0, 5),
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
