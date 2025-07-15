// src/core/scannerLogic.js

require('dotenv').config();

// --- Importy zależności ---
const {
	getTop100,
	getBTCDominance,
	getCoinDeveloperData,
} = require('../apis/coingecko');
const { checkMultipleCoins, getBuySellPressure } = require('../apis/binance');
const { getFearAndGreedIndex } = require('../apis/fearAndGreed');
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
	console.log('🔄 Uruchamiam scentralizowany skaner...');

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

	// --- Krok 4: Wzbogacanie o dane deweloperskie (dla top 20 kandydatów) ---
	console.log(
		`💻 Wzbogacam dane o aktywność deweloperską dla ${Math.min(
			20,
			coinsWithFullData.length
		)} monet...`
	);
	for (const coin of coinsWithFullData.slice(0, 20)) {
		const devData = await getCoinDeveloperData(coin.id);
		coin.developerData = devData;
		await new Promise((resolve) => setTimeout(resolve, 1500)); // Opóźnienie, aby nie przekroczyć limitu API
	}

	// --- Krok 5: Analiza presji kupna/sprzedaży (dla top 10) ---
	console.log('📊 Analizuję presję kupna/sprzedaży...');
	for (const coin of coinsWithFullData.slice(0, 10)) {
		if (coin.binance && coin.binance.mainPair) {
			const pressureData = await getBuySellPressure(coin.binance.mainPair, 60); // Ostatnie 60 minut
			coin.pressureData = pressureData;
		}
	}

	// --- Krok 6: Analiza momentum i sektorów ---
	const marketConditions = { btcDominance, fearAndGreed };
	const rankedCoins = rankByMomentum(coinsWithFullData, marketConditions);
	const sectorAnalysis = analyzeSectors(rankedCoins);

	// --- Krok 7: Formatowanie ostatecznych wyników ---
	let condition, advice;
	if (btcDominance > 65) {
		condition = 'SEZON BITCOINA';
		advice = 'Alty krwawią - dobre dla akumulacji';
	} else if (btcDominance > 55) {
		condition = 'PRZEJŚCIE';
		advice = 'Zmiany na rynku - wypatruj wybić';
	} else {
		condition = 'PRZYJAZNY DLA ALTÓW';
		advice = 'Dobre warunki dla transakcji altami';
	}

	const formattedCoins = rankedCoins.slice(0, 20).map((coin) => ({
		rank: coin.rank,
		symbol: coin.symbol,
		name: coin.name,
		price: coin.price,
		priceChange24h: coin.priceChange24h,
		priceChange7d: coin.priceChange7d,
		volumeToMcap: coin.volumeToMcap,
		sector: coin.sector,
		developerData: coin.developerData || null,
		pressureData: coin.pressureData || null,
		momentum: coin.momentum,
		binance: {
			trades: coin.binance.binanceTrades24h,
			pair: coin.binance.mainPair,
		},
	}));

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
		coins: formattedCoins,
		lastUpdate: new Date().toISOString(),
		totalAnalyzed: data.count,
		totalFiltered: candidates.length,
		totalOnBinance: coinsWithFullData.length,
	};
}

module.exports = {
	runScanner,
};
