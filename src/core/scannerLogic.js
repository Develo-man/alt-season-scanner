// src/core/scannerLogic.js

require('dotenv').config();

// --- Importy zależności ---
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
} = require('../apis/binance');
const { getFearAndGreedIndex } = require('../apis/fearAndGreed');
const { batchAnalyzeDEX } = require('../apis/dexAnalytics');
const { filterAndSort } = require('../utils/filters');
const { rankByMomentum } = require('../utils/momentum');
const { getSector } = require('../utils/sectors');
const { analyzeSectors } = require('../utils/analysis');
const { loadHistory, analyzeTrend } = require('../apis/btcDominance');

// --- Główna funkcja skanera ---

/**
 * Uruchamia pełny proces skanowania kryptowalut i zwraca ustrukturyzowane wyniki.
 * @returns {Promise<Object>} Obiekt zawierający pełne wyniki skanowania.
 */
async function runScanner() {
	console.log('🔄 Uruchamiam rozszerzony skaner z DEX Analytics...');

	// --- Krok 1: Pobranie danych rynkowych ---
	const [btcDominance, fearAndGreed, data, history] = await Promise.all([
		getBTCDominance(),
		getFearAndGreedIndex(),
		getTop100(),
		loadHistory(),
	]);

	const trendAnalysis = analyzeTrend(history);
	const dominanceChange24h = trendAnalysis.changes['24h'];

	// --- Krok 2: Wstępne filtrowanie kandydatów ---
	const criteria = {
		maxPrice: parseFloat(process.env.MAX_PRICE) || 3,
		maxRank: 100,
		minVolumeRatio: 0.03,
		min7dChange: -20,
		excludeStablecoins: true,
	};
	const candidates = filterAndSort(data.coins, criteria, 'momentum', 50);

	// --- Krok 3: Weryfikacja na Binance i wzbogacenie o sektory ---
	const symbols = candidates.map((coin) => coin.symbol);
	const binanceData = await checkMultipleCoins(symbols);

	const coinsWithFullData = candidates
		.map((coin) => {
			const binanceInfo = binanceData[coin.symbol.toUpperCase()];
			return {
				...coin,
				sector: getSector(coin.symbol),
				binance: binanceInfo,
				isOnBinance: binanceInfo?.isListed,
			};
		})
		.filter((coin) => coin.isOnBinance);

	// --- Krok 4: DEX Analytics (NEW!) ---

	const dexAnalytics = await batchAnalyzeDEX(
		coinsWithFullData.slice(0, 20).map((coin) => ({
			symbol: coin.symbol,
			contractAddress: coin.contractAddress, // Add if available from CoinGecko
		}))
	);

	const coinsWithDEXData = coinsWithFullData.map((coin) => ({
		...coin,
		dexData: dexAnalytics[coin.symbol] || null,
	}));

	// --- Krok 5: Enhanced data enrichment ---
	console.log(
		`⚙️ Wzbogacam dane (dev, presja, wolumen) dla top ${Math.min(20, coinsWithDEXData.length)} monet...`
	);

	// Przygotowujemy listę (promises) dla każdej monety.
	const enrichmentPromises = coinsWithFullData
		.slice(0, 20)
		.map(async (coin) => {
			const promises = {
				// promises pobrania danych deweloperskich
				devData: getCoinDeveloperData(coin.id),
				pressureData: null,
				smartVolume: null,
				volumeProfile: null,
			};

			// Jeśli jest para na Binance, dodajemy promises pobrania danych z giełdy
			if (coin.binance && coin.binance.mainPair) {
				const mainPair = coin.binance.mainPair;
				promises.pressureData = getBuySellPressure(mainPair, 60);
				promises.smartVolume = getSmartVolumeAnalysis(mainPair, 24);
				promises.volumeProfile = getVolumeProfile(mainPair, '1h', 24);
			}

			// Czekamy na wszystkie promises dla DANEJ monety
			const results = await Promise.all(Object.values(promises));

			// Przypisujemy wyniki z powrotem do obiektu monety
			coin.developerData = results[0];
			coin.pressureData = results[1];
			coin.smartVolume = results[2];
			coin.volumeProfile = results[3];

			return coin;
		});

	await Promise.all(enrichmentPromises);

	// --- Krok 6: Enhanced momentum calculation with DEX ---
	const marketConditions = { btcDominance, fearAndGreed };
	const rankedCoins = rankByMomentum(coinsWithDEXData, marketConditions);
	const sectorAnalysis = analyzeSectors(rankedCoins);

	// --- Krok 7: Enhanced result formatting ---
	let condition, advice;
	if (btcDominance > 65) {
		condition = 'SEZON BITCOINA';
		advice = 'Alty krwawią - sprawdź DEX na okazje';
	} else if (btcDominance > 55) {
		condition = 'PRZEJŚCIE';
		advice = 'Zmiany na rynku - DEX może pokazać early signals';
	} else {
		condition = 'PRZYJAZNY DLA ALTÓW';
		advice = 'Doskonały czas dla DEX trading';
	}

	// Enhanced coin formatting with DEX priority
	const formattedCoins = rankedCoins.slice(0, 25).map((coin) => ({
		rank: coin.rank,
		symbol: coin.symbol,
		name: coin.name,
		price: coin.price,
		priceChange24h: coin.priceChange24h,
		priceChange7d: coin.priceChange7d,
		volumeToMcap: coin.volumeToMcap,
		sector: coin.sector,

		// Enhanced data
		developerData: coin.developerData || null,
		pressureData: coin.pressureData || null,
		smartVolume: coin.smartVolume || null,
		volumeProfile: coin.volumeProfile || null,
		dexData: coin.dexData || null,

		// Momentum with DEX
		momentum: coin.momentum,

		// Binance data
		binance: {
			trades: coin.binance.binanceTrades24h,
			pair: coin.binance.mainPair,
		},

		// Priority flags
		isDEXAlpha:
			coin.dexData?.hasDEXData &&
			coin.dexData.liquidityScore >= 70 &&
			parseFloat(coin.dexData.buyPressure) > 60,
		hasHighDEXVolume: coin.dexData?.totalVolume24h > 1000000,
	}));

	// DEX Analytics Summary
	const dexSummary = generateDEXSummary(formattedCoins);

	// --- Krok 8: Zwrócenie obiektu z wynikami ---
	return {
		marketStatus: {
			btcDominance: btcDominance.toFixed(2),
			dominanceChange: `${dominanceChange24h}%`,
			condition,
			advice,
			fearAndGreed: fearAndGreed
				? {
						value: fearAndGreed.value,
						classification: fearAndGreed.classification,
					}
				: null,
		},
		sectorAnalysis: sectorAnalysis,
		dexSummary: dexSummary,
		coins: formattedCoins,
		lastUpdate: new Date().toISOString(),
		totalAnalyzed: data.count,
		totalFiltered: candidates.length,
		totalOnBinance: coinsWithFullData.length,
		totalWithDEXData: formattedCoins.filter((c) => c.dexData?.hasDEXData)
			.length,
		stats: {
			dexAlphaOpportunities: formattedCoins.filter((c) => c.isDEXAlpha).length,
			highDEXVolumeCoins: formattedCoins.filter((c) => c.hasHighDEXVolume)
				.length,
			avgDEXLiquidity: calculateAvgDEXLiquidity(formattedCoins),
		},
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

module.exports = {
	runScanner,
};
