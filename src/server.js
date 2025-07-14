const express = require('express');
const path = require('path');
const fs = require('fs').promises; //async fs

// Imports logic
const { getFearAndGreedIndex } = require('./apis/fearAndGreed');
const { getTop100, getBTCDominance } = require('./apis/coingecko');
const { filterAndSort } = require('./utils/filters');
const { checkMultipleCoins } = require('./apis/binance');
const { rankByMomentum } = require('./utils/momentum');
const { loadHistory } = require('./apis/btcDominance');

const PORT = process.env.PORT || 3000;
const CACHE_DURATION = 5 * 60 * 1000; // 5 min
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

// Scanner logic and other support functions (bez większych zmian)
async function runScanner() {
	const btcDominance = await getBTCDominance();
	const fearAndGreed = await getFearAndGreedIndex();

	let condition, advice;
	if (btcDominance > 65) {
		condition = 'BITCOIN SEASON';
		advice = 'Alts are bleeding - good for accumulation';
	} else if (btcDominance > 60) {
		condition = 'BTC FAVORED';
		advice = 'Challenging for alts - be selective';
	} else if (btcDominance > 55) {
		condition = 'TRANSITIONING';
		advice = 'Market shifting - watch for breakouts';
	} else {
		condition = 'ALT FRIENDLY';
		advice = 'Good conditions for alt trades';
	}

	const data = await getTop100();
	const criteria = {
		maxPrice: parseFloat(process.env.MAX_PRICE) || 3,
		maxRank: 100,
		minVolumeRatio: 0.03,
		min7dChange: -20,
		excludeStablecoins: true,
	};

	const candidates = filterAndSort(data.coins, criteria, 'momentum', 50);
	const symbols = candidates.map((coin) => coin.symbol);
	const binanceData = await checkMultipleCoins(symbols);

	const coinsWithFullData = candidates
		.map((coin) => {
			const binance = binanceData[coin.symbol.toUpperCase()];
			return {
				...coin,
				binance: binance,
				isOnBinance: binance && binance.isListed,
			};
		})
		.filter((coin) => coin.isOnBinance);

	const rankedCoins = rankByMomentum(coinsWithFullData);

	const formattedCoins = rankedCoins.slice(0, 20).map((coin) => ({
		rank: coin.rank,
		symbol: coin.symbol,
		name: coin.name,
		price: coin.price,
		priceChange24h: coin.priceChange24h,
		priceChange7d: coin.priceChange7d,
		volumeToMcap: coin.volumeToMcap,
		momentum: {
			score: parseFloat(coin.momentum.totalScore),
			risk: coin.momentum.riskScore,
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
			dominanceChange: '-0.5%',
			condition,
			advice,
			fearAndGreed: fearAndGreed
				? {
						value: fearAndGreed.value,
						classification: fearAndGreed.classification,
				  }
				: null,
		},
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
