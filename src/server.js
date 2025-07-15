const express = require('express');
const path = require('path');
const fs = require('fs').promises; //async fs

// Imports logic
const {
	getTop100,
	getBTCDominance,
	getCoinDeveloperData,
} = require('./apis/coingecko');
const { filterAndSort } = require('./utils/filters');
const { checkMultipleCoins } = require('./apis/binance');
const { rankByMomentum } = require('./utils/momentum');
const { getFearAndGreedIndex } = require('./apis/fearAndGreed');
const { getSector } = require('./utils/sectors');
const { analyzeSectors } = require('./utils/analysis');

const {
	loadHistory,
	analyzeTrend,
	saveToHistory,
} = require('./apis/btcDominance');

const PORT = process.env.PORT || 3000;
const CACHE_DURATION = 5 * 60 * 1000; // 5 min

const DEV_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 godziny
const devDataCache = {};

// Express application initialisation
const app = express();

app.use((req, res, next) => {
	const origin = req.get('origin') || `http://localhost:${PORT}`;
	if (origin.startsWith(`http://localhost`)) {
		res.setHeader('Access-Control-Allow-Origin', origin);
	}
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	// Handling of requests preflight
	if (req.method === 'OPTIONS') {
		return res.sendStatus(204);
	}
	next();
});

const webPath = path.join(__dirname, 'web');
const resultsPath = path.join(__dirname, '..', 'results');

app.use(express.static(webPath));
app.use('/results', express.static(resultsPath));

// --- Logic app ---

// Cache for scanner results
let cachedResults = null;
let lastScanTime = null;

// --- (Routes) ---

// Homepage of the application
app.get('/', (req, res) => {
	res.sendFile(path.join(webPath, 'index.html'));
});

// Graphs page
app.get('/charts', (req, res) => {
	res.sendFile(path.join(webPath, 'charts.html'));
});

// Endpoint API for downloading scanner results
app.get('/api/scanner-results', async (req, res, next) => {
	try {
		// Cache check
		if (
			cachedResults &&
			lastScanTime &&
			Date.now() - lastScanTime < CACHE_DURATION
		) {
			return res.json(cachedResults);
		}

		console.log('🔄 Uruchamiam skaner dla zapytania web...');
		const results = await runScanner();

		// Update cache
		cachedResults = results;
		lastScanTime = Date.now();

		res.json(results);
	} catch (error) {
		console.error('Błąd podczas uruchamiania skanera:', error);
		next(error); //  Error transmission to global middleware
	}
});

// Endpoint API for retrieving BTC dominance history
app.get('/api/dominance-history', async (req, res, next) => {
	try {
		const history = await loadHistory();
		res.json(history);
	} catch (error) {
		console.error('Błąd podczas ładowania historii dominacji:', error);
		if (error.code === 'ENOENT') {
			return res.json([]);
		}
		next(error);
	}
});

// --- Global Error Handling ---
app.use((err, req, res, next) => {
	res.status(500).json({
		error: 'Wystąpił wewnętrzny błąd serwera.',
		message: 'Prosimy spróbować ponownie później.',
	});
});

// Starting server
app.listen(PORT, () => {
	console.log(`
╔═══════════════════════════════════════════════════╗
║       ALT SEASON SCANNER WEB SERVER (v. safe)      ║
╚═══════════════════════════════════════════════════╝

🌐 Serwer działa pod adresem: http://localhost:${PORT}
📊 Endpoint API: http://localhost:${PORT}/api/scanner-results

Naciśnij Ctrl+C, aby zatrzymać serwer.
    `);
});

async function runScanner() {
	const btcDominance = await getBTCDominance();
	const fearAndGreed = await getFearAndGreedIndex();
	const data = await getTop100();

	const coinsWithSectors = data.coins.map((coin) => {
		const sector = coin.symbol ? getSector(coin.symbol) : 'Unknown';
		return {
			...coin,
			sector: sector,
		};
	});

	// We save the current reading to history so that we have the most recent data
	await saveToHistory({
		btc: btcDominance,
		timestamp: new Date().toISOString(),
	});

	// Read the history and analyse the trend
	const history = await loadHistory();
	const trendAnalysis = analyzeTrend(history);

	// We extract the dynamically calculated 24h change
	const dominanceChange24h = trendAnalysis.changes['24h'];

	let condition, advice;
	if (btcDominance > 65) {
		condition = 'SEZON BITCOINA';
		advice = 'Alty krwawią - dobre dla akumulacji';
	} else if (btcDominance > 60) {
		condition = 'BTC FAWORYZOWANY';
		advice = 'Wyzwanie dla altów - wybieraj mądrze';
	} else if (btcDominance > 55) {
		condition = 'PRZEJŚCIE';
		advice = 'Zmiany na rynku - wypatruj wybić';
	} else {
		condition = 'PRZYJAZNY DLA ALTÓW';
		advice = 'Dobre warunki dla transakcji altami';
	}

	const criteria = {
		maxPrice: parseFloat(process.env.MAX_PRICE) || 3,
		maxRank: 100,
		minVolumeRatio: 0.03,
		min7dChange: -20,
		excludeStablecoins: true,
	};

	const candidates = filterAndSort(data.coins, criteria, 'momentum', 50);

	console.log(
		`💻 Wzbogacam dane o aktywność deweloperską dla ${candidates.length} monet...`
	);

	for (const coin of candidates) {
		const now = Date.now();
		const cacheEntry = devDataCache[coin.id];

		if (cacheEntry && now - cacheEntry.timestamp < DEV_CACHE_DURATION) {
			coin.developerData = cacheEntry.data;
		} else {
			// Pobierz nowe dane i zaktualizuj cache
			const devData = await getCoinDeveloperData(coin.id);
			coin.developerData = devData;
			devDataCache[coin.id] = {
				data: devData,
				timestamp: now,
			};
			await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 sekundy opóźnienia
		}
	}

	console.log('📊 Analizuję presję kupna/sprzedaży...');
	for (const coin of candidates.slice(0, 20)) {
		if (coin.binance && coin.binance.mainPair) {
			const pressureData = await getBuySellPressure(coin.binance.mainPair, 60); // Ostatnie 60 minut
			if (pressureData) {
				coin.pressureData = pressureData;
				console.log(
					`✅ [${coin.symbol}] Presja kupna: ${pressureData.buyPressure}%`
				);
			} else {
				console.log(
					`⚪️ [${coin.symbol}] Brak danych o presji w ostatniej godzinie.`
				);
			}
		}
	}

	const symbols = candidates.map((coin) => coin.symbol);
	const binanceData = await checkMultipleCoins(symbols);
	const coinsWithFullData = candidates
		.map((coin) => {
			const binance = binanceData[coin.symbol.toUpperCase()];
			return {
				sector: getSector(coin.symbol),
				binance: binanceData[coin.symbol.toUpperCase()],
				isOnBinance: binanceData[coin.symbol.toUpperCase()]?.isListed,
			};
		})
		.filter((coin) => coin.isOnBinance);

	const marketConditions = {
		btcDominance,
		fearAndGreed,
	};

	const rankedCoins = rankByMomentum(coinsWithFullData, marketConditions);
	const sectorAnalysis = analyzeSectors(rankedCoins);

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
		momentum: {
			score: parseFloat(coin.momentum.totalScore),
			risk: coin.momentum.riskScore,
			devScore: coin.momentum.devScore,
			category: coin.momentum.category,
			signals: coin.momentum.signals.slice(0, 3),
		},
		binance: {
			trades: coin.binance.binanceTrades24h,
			pair: coin.binance.mainPair,
		},
	}));

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

// Handling correct closure
process.on('SIGINT', () => {
	console.log('\n\n👋 Zamykanie serwera...');
	process.exit(0);
});
