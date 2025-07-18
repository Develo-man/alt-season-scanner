const express = require('express');
const path = require('path');
const resultsPath = path.join(__dirname, '..', 'result');
const { runScanner } = require('./core/scannerLogic');
const { loadHistory } = require('./apis/btcDominance');

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
			console.log('🔄 Zwracam wyniki z cache...');
			return res.json(cachedResults);
		}

		console.log('🔄 Uruchamiam skaner dla zapytania web...');
		const { runScanner } = require('./core/scannerLogic');
		const results = await runScanner();

		// Update cache
		cachedResults = results;
		lastScanTime = Date.now();

		console.log('✅ Enhanced scanner completed:', {
			strategies: results.strategies?.length || 0,
			totalCandidates: results.stats?.totalUniqueCandidates || 0,
			recommendedStrategy: results.marketStatus?.recommendedStrategy || 'none',
		});

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
	console.log(`🌐 Serwer działa pod adresem: http://localhost:${PORT}
		
		Naciśnij Ctrl+C, aby zatrzymać serwer.`);
});

// Handling correct closure
process.on('SIGINT', () => {
	console.log('\n\n👋 Zamykanie serwera...');
	process.exit(0);
});
