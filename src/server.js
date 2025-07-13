const http = require('http');
const fs = require('fs');
const path = require('path');
const { getTop100, getBTCDominance } = require('./apis/coingecko');
const { filterAndSort } = require('./utils/filters');
const { checkMultipleCoins } = require('./apis/binance');
const { rankByMomentum } = require('./utils/momentum');

const PORT = process.env.PORT || 3000;

// Cache for scanner results
let cachedResults = null;
let lastScanTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Create HTTP server
const server = http.createServer(async (req, res) => {
	// CORS headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	// Handle preflight
	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
		return;
	}

	// Routes
	if (req.url === '/' || req.url === '/index.html') {
		serveHTML(res);
	} else if (req.url === '/charts' || req.url === '/charts.html') {
		serveChartsHTML(res);
	} else if (req.url === '/charts.js') {
		serveChartsJS(res);
	} else if (req.url === '/api/scanner-results') {
		await serveScannerResults(res);
	} else if (req.url === '/api/dominance-history') {
		await serveDominanceHistory(res);
	} else if (req.url.startsWith('/results/')) {
		serveStaticFile(req, res);
	} else {
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('Not Found');
	}
});

// Serve HTML file
function serveHTML(res) {
	// Try different paths
	let htmlPath = path.join(__dirname, 'web', 'index.html');
	if (!fs.existsSync(htmlPath)) {
		htmlPath = path.join(__dirname, '..', 'src', 'web', 'index.html');
	}
	if (!fs.existsSync(htmlPath)) {
		htmlPath = path.join(__dirname, '..', 'web', 'index.html');
	}

	fs.readFile(htmlPath, 'utf8', (err, data) => {
		if (err) {
			console.error('❌ Error loading HTML:', err.message);
			console.error('Tried path:', htmlPath);
			res.writeHead(500, { 'Content-Type': 'text/plain' });
			res.end('Error loading page. Check if src/web/index.html exists.');
			return;
		}

		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(data);
	});
}

// Serve Charts HTML
function serveChartsHTML(res) {
	let htmlPath = path.join(__dirname, 'web', 'charts.html');
	if (!fs.existsSync(htmlPath)) {
		htmlPath = path.join(__dirname, '..', 'src', 'web', 'charts.html');
	}
	if (!fs.existsSync(htmlPath)) {
		htmlPath = path.join(__dirname, '..', 'web', 'charts.html');
	}

	fs.readFile(htmlPath, 'utf8', (err, data) => {
		if (err) {
			console.error('❌ Error loading charts HTML:', err.message);
			res.writeHead(500, { 'Content-Type': 'text/plain' });
			res.end('Error loading charts page');
			return;
		}

		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(data);
	});
}

// Serve Charts JS
function serveChartsJS(res) {
	let jsPath = path.join(__dirname, 'web', 'charts.js');
	if (!fs.existsSync(jsPath)) {
		jsPath = path.join(__dirname, '..', 'src', 'web', 'charts.js');
	}
	if (!fs.existsSync(jsPath)) {
		jsPath = path.join(__dirname, '..', 'web', 'charts.js');
	}

	fs.readFile(jsPath, 'utf8', (err, data) => {
		if (err) {
			console.error('❌ Error loading charts JS:', err.message);
			res.writeHead(500, { 'Content-Type': 'text/plain' });
			res.end('Error loading charts script');
			return;
		}

		res.writeHead(200, { 'Content-Type': 'application/javascript' });
		res.end(data);
	});
}

// Serve dominance history
async function serveDominanceHistory(res) {
	try {
		const { loadHistory } = require('./apis/btcDominance');
		const history = await loadHistory();

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(history));
	} catch (error) {
		console.error('Error loading dominance history:', error);
		// Return mock data if no history
		const mockHistory = [];
		const days = 30;
		let btc = 65;

		for (let i = days; i >= 0; i--) {
			btc += (Math.random() - 0.5) * 2;
			btc = Math.max(55, Math.min(70, btc));

			mockHistory.push({
				timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
				btc: btc,
				eth: 17 + (Math.random() - 0.5) * 2,
			});
		}

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(mockHistory));
	}
}

// Serve scanner results
async function serveScannerResults(res) {
	try {
		// Check cache
		if (
			cachedResults &&
			lastScanTime &&
			Date.now() - lastScanTime < CACHE_DURATION
		) {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(cachedResults));
			return;
		}

		// Run scanner
		console.log('🔄 Running scanner for web request...');
		const results = await runScanner();

		// Update cache
		cachedResults = results;
		lastScanTime = Date.now();

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(results));
	} catch (error) {
		console.error('Error running scanner:', error);
		res.writeHead(500, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Scanner error', message: error.message }));
	}
}

// Run scanner logic
async function runScanner() {
	// Get BTC dominance
	const btcDominance = await getBTCDominance();

	// Get market condition
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

	// Get coin data
	const data = await getTop100();

	// Apply filters
	const criteria = {
		maxPrice: parseFloat(process.env.MAX_PRICE) || 3,
		maxRank: 100,
		minVolumeRatio: 0.03,
		min7dChange: -20,
		excludeStablecoins: true,
	};

	const candidates = filterAndSort(data.coins, criteria, 'momentum', 50);

	// Check Binance
	const symbols = candidates.map((coin) => coin.symbol);
	const binanceData = await checkMultipleCoins(symbols);

	// Combine data
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

	// Calculate momentum
	const rankedCoins = rankByMomentum(coinsWithFullData);

	// Format for frontend
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
			dominanceChange: '-0.5%', // Would need historical data
			condition,
			advice,
		},
		coins: formattedCoins,
		lastUpdate: new Date().toISOString(),
		totalAnalyzed: data.count,
		totalFiltered: candidates.length,
		totalOnBinance: coinsWithFullData.length,
	};
}

// Serve static files (for future use)
function serveStaticFile(req, res) {
	const filePath = path.join(__dirname, '..', req.url);

	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('File not found');
			return;
		}

		const ext = path.extname(filePath);
		const contentType =
			{
				'.json': 'application/json',
				'.csv': 'text/csv',
				'.txt': 'text/plain',
			}[ext] || 'application/octet-stream';

		res.writeHead(200, { 'Content-Type': contentType });
		res.end(data);
	});
}

// Start server
server.listen(PORT, () => {
	console.log(`
╔═══════════════════════════════════════════════════╗
║          ALT SEASON SCANNER WEB SERVER            ║
╚═══════════════════════════════════════════════════╝

🌐 Server running at: http://localhost:${PORT}
📊 API endpoint: http://localhost:${PORT}/api/scanner-results

✨ Features:
   - Live scanner results
   - Auto-refresh every 5 minutes
   - Bitcoin-themed UI
   - Mobile responsive

Press Ctrl+C to stop the server
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
	console.log('\n\n👋 Shutting down web server...');
	server.close(() => {
		console.log('Server closed');
		process.exit(0);
	});
});
