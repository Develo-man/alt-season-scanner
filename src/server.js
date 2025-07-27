const express = require('express');
const path = require('path');
const fs = require('fs');
const { runScanner } = require('./core/scannerLogic');
const { loadHistory } = require('./apis/btcDominance');

const PORT = process.env.PORT || 3000;
const CACHE_DURATION = 5 * 60 * 1000; // 5 min

// Express application initialisation
const app = express();
app.use(express.static(webPath));

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
const LATEST_RESULTS_FILE = path.join(resultsPath, 'latest.json');

app.use('/results', express.static(resultsPath));

// Cache for scanner results
let cachedResults = null;
let lastScanTime = null;
let isScanning = false;

async function loadInitialCache() {
	try {
		const data = await fs.readFile(LATEST_RESULTS_FILE, 'utf8');
		cachedResults = JSON.parse(data);
		lastScanTime = new Date(cachedResults.lastUpdate).getTime();
		console.log('✅ Wczytano ostatnie wyniki z pliku do cache.');
	} catch (error) {
		console.log(
			'ℹ️ Nie znaleziono pliku z ostatnimi wynikami. Pierwsze uruchomienie będzie pełnym skanem.'
		);
	}
}

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
		// Sprawdź cache
		if (
			cachedResults &&
			lastScanTime &&
			Date.now() - lastScanTime < CACHE_DURATION
		) {
			console.log('🔄 Zwracam wyniki z cache...');
			return res.json(cachedResults);
		}

		// Sprawdź, czy skanowanie już trwa
		if (isScanning) {
			console.log('⏳ Skanowanie już w toku. Oczekuję na wyniki...');
			// Prosty mechanizm oczekiwania, aby kolejne zapytania dostały świeże dane
			const waitForScan = setInterval(() => {
				if (!isScanning && cachedResults) {
					clearInterval(waitForScan);
					console.log('✅ Zakończono oczekiwanie, zwracam świeże wyniki.');
					res.json(cachedResults);
				}
			}, 2000); // Sprawdzaj co 2 sekundy
			return;
		}

		console.log('🚀 Uruchamiam nowy, pojedynczy skan dla zapytania web...');
		isScanning = true; // ZABLOKUJ kolejne wywołania

		const results = await runScanner();

		// Zaktualizuj cache
		cachedResults = results;
		lastScanTime = Date.now();
		isScanning = false; // ODBLOKUJ po zakończeniu

		console.log('✅ Skaner zakończył pracę, wyniki zapisane w cache.');
		res.json(results);
	} catch (error) {
		console.error('Błąd podczas uruchamiania skanera:', error);
		isScanning = false; // Zawsze odblokuj w razie błędu
		next(error);
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
app.listen(PORT, async () => {
	try {
		await fs.mkdir(resultsPath, { recursive: true });
		await loadInitialCache();
	} catch (error) {
		console.error('Błąd podczas inicjalizacji serwera:', error);
	}
	console.log(
		`🌐 Serwer działa pod adresem: http://localhost:${PORT}\n\n\tNaciśnij Ctrl+C, aby zatrzymać serwer.`
	);
});

// Handling correct closure
process.on('SIGINT', () => {
	console.log('\n\n👋 Zamykanie serwera...');
	process.exit(0);
});
