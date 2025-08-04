const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Configuration
const BASE_URL =
	process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY;
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'dominance');
const HISTORY_FILE = path.join(DATA_DIR, 'btc-dominance-history.json');

// Create axios instance
const api = axios.create({
	baseURL: BASE_URL,
	timeout: 10000,
	headers: API_KEY ? { 'x-cg-demo-api-key': API_KEY } : {},
});

// Ensure data directory exists
async function ensureDataDir() {
	try {
		await fs.mkdir(DATA_DIR, { recursive: true });
	} catch (error) {
		// Directory might already exist
	}
}

/**
 * Get current BTC dominance and market data
 * @returns {Promise<Object>} Market dominance data
 */
async function getCurrentDominance() {
	try {
		const response = await api.get('/global');
		const data = response.data.data;

		return {
			btc: data.market_cap_percentage.btc,
			eth: data.market_cap_percentage.eth,
			altcoins:
				100 - data.market_cap_percentage.btc - data.market_cap_percentage.eth,
			totalMarketCap: data.total_market_cap.usd,
			totalVolume: data.total_volume.usd,
			marketCapChange24h: data.market_cap_change_percentage_24h_usd,
			timestamp: new Date().toISOString(),
			updateTime: data.updated_at,
		};
	} catch (error) {
		console.error('❌ Error fetching dominance data:', error.message);
		throw error;
	}
}

/**
 * Load historical dominance data
 * @returns {Promise<Array>} Historical data array
 */
async function loadHistory() {
	try {
		await ensureDataDir();
		const data = await fs.readFile(HISTORY_FILE, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		// File doesn't exist yet
		return [];
	}
}

/**
 * Save dominance data point to history
 * @param {Object} dataPoint - Dominance data to save
 */
async function saveToHistory(dataPoint) {
	try {
		const history = await loadHistory();
		history.push(dataPoint);

		// Keep only last 30 days of hourly data (720 points)
		if (history.length > 720) {
			history.splice(0, history.length - 720);
		}

		await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
	} catch (error) {
		console.error('❌ Error saving history:', error.message);
	}
}

/**
 * Analyze dominance trend
 * @param {Array} history - Historical data points
 * @returns {Object} Trend analysis
 */
function analyzeTrend(history) {
	if (history.length < 2) {
		return {
			trend: 'UNKNOWN',
			strength: 0,
			description: 'Not enough data',
		};
	}

	// Get data for different time periods
	const now = history[history.length - 1];
	const hour1 = history[history.length - 2] || now;
	const hours24 = history[Math.max(0, history.length - 24)] || history[0];
	const days7 = history[Math.max(0, history.length - 168)] || history[0];

	// Calculate changes
	const change1h = now.btc - hour1.btc;
	const change24h = now.btc - hours24.btc;
	const change7d = now.btc - days7.btc;

	// Determine trend
	let trend, strength, description;

	if (change7d < -3) {
		trend = 'STRONG_DOWN';
		strength = Math.abs(change7d);
		description = 'BTC dominance falling rapidly - Alt season approaching!';
	} else if (change7d < -1) {
		trend = 'DOWN';
		strength = Math.abs(change7d);
		description = 'BTC dominance declining - Good for alts';
	} else if (change7d > 3) {
		trend = 'STRONG_UP';
		strength = change7d;
		description = 'BTC dominance rising fast - Alts bleeding';
	} else if (change7d > 1) {
		trend = 'UP';
		strength = change7d;
		description = 'BTC dominance increasing - Challenging for alts';
	} else {
		trend = 'SIDEWAYS';
		strength = Math.abs(change7d);
		description = 'BTC dominance stable - Market in balance';
	}

	return {
		trend,
		strength,
		description,
		changes: {
			'1h': change1h.toFixed(2),
			'24h': change24h.toFixed(2),
			'7d': change7d.toFixed(2),
		},
		currentLevel: now.btc.toFixed(2),
	};
}

/**
 * Get market phase based on dominance
 * @param {number} btcDominance - Current BTC dominance
 * @returns {Object} Market phase analysis
 */
function getMarketPhase(btcDominance) {
	if (btcDominance > 70) {
		return {
			phase: 'BITCOIN_WINTER',
			emoji: '🥶',
			description: 'Extreme BTC dominance - Alts in deep winter',
			altStrategy: 'Accumulate quality alts at discount',
			risk: 'LOW',
			opportunity: 'HIGH',
		};
	} else if (btcDominance > 65) {
		return {
			phase: 'BITCOIN_SEASON',
			emoji: '🟡',
			description: 'Strong BTC dominance - Bitcoin leading',
			altStrategy: 'Wait for better entries, focus on majors',
			risk: 'MEDIUM',
			opportunity: 'LOW',
		};
	} else if (btcDominance > 60) {
		return {
			phase: 'BTC_FAVORED',
			emoji: '🟠',
			description: 'BTC still dominant but weakening',
			altStrategy: 'Start positioning in strong alts',
			risk: 'MEDIUM',
			opportunity: 'MEDIUM',
		};
	} else if (btcDominance > 55) {
		return {
			phase: 'TRANSITION',
			emoji: '🟢',
			description: 'Market transitioning - Watch closely',
			altStrategy: 'Increase alt exposure gradually',
			risk: 'MEDIUM',
			opportunity: 'HIGH',
		};
	} else if (btcDominance > 50) {
		return {
			phase: 'BALANCED',
			emoji: '⚖️',
			description: 'Balanced market - Both BTC and alts perform',
			altStrategy: 'Diversify between BTC and alts',
			risk: 'LOW',
			opportunity: 'HIGH',
		};
	} else if (btcDominance > 45) {
		return {
			phase: 'ALT_SEASON',
			emoji: '🚀',
			description: 'Alt season in progress!',
			altStrategy: 'Ride the wave but set stop losses',
			risk: 'HIGH',
			opportunity: 'EXTREME',
		};
	} else {
		return {
			phase: 'PEAK_EUPHORIA',
			emoji: '🎯',
			description: 'Extreme alt dominance - Be careful!',
			altStrategy: 'Take profits, market might be topping',
			risk: 'EXTREME',
			opportunity: 'LOW',
		};
	}
}

/**
 * Get historical extremes for context
 * @param {Array} history - Historical data
 * @returns {Object} Historical extremes
 */
function getHistoricalExtremes(history) {
	if (history.length === 0) return null;

	let min = 100,
		max = 0;
	let minDate = '',
		maxDate = '';

	history.forEach((point) => {
		if (point.btc < min) {
			min = point.btc;
			minDate = point.timestamp;
		}
		if (point.btc > max) {
			max = point.btc;
			maxDate = point.timestamp;
		}
	});

	return {
		minimum: {
			value: min.toFixed(2),
			date: new Date(minDate).toLocaleDateString(),
		},
		maximum: {
			value: max.toFixed(2),
			date: new Date(maxDate).toLocaleDateString(),
		},
		range: (max - min).toFixed(2),
	};
}

/**
 * Generate dominance report
 * @returns {Promise<Object>} Comprehensive dominance report
 */
async function generateDominanceReport() {
	try {
		console.log('📊 Generating BTC Dominance Report...\n');

		// Get current data
		const current = await getCurrentDominance();

		// Save to history
		await saveToHistory(current);

		// Load history for analysis
		const history = await loadHistory();

		// Analyze
		const trend = analyzeTrend(history);
		const phase = getMarketPhase(current.btc);
		const extremes = getHistoricalExtremes(history);

		// Generate signals
		const signals = generateSignals(current, trend, phase);

		return {
			current,
			trend,
			phase,
			extremes,
			signals,
			dataPoints: history.length,
			lastUpdate: new Date().toISOString(),
		};
	} catch (error) {
		console.error('❌ Error generating report:', error.message);
		throw error;
	}
}

/**
 * Generate trading signals based on dominance
 * @param {Object} current - Current dominance data
 * @param {Object} trend - Trend analysis
 * @param {Object} phase - Market phase
 * @returns {Array} Trading signals
 */
function generateSignals(current, trend, phase) {
	const signals = [];

	// Trend-based signals
	if (trend.trend === 'STRONG_DOWN' && current.btc < 60) {
		signals.push({
			type: 'BULLISH',
			strength: 'STRONG',
			message: '🟢 BTC dominance falling fast - Strong alt season signal!',
		});
	} else if (trend.trend === 'DOWN' && current.btc < 65) {
		signals.push({
			type: 'BULLISH',
			strength: 'MODERATE',
			message: '🟢 BTC dominance declining - Favorable for alts',
		});
	} else if (trend.trend === 'STRONG_UP' && current.btc > 60) {
		signals.push({
			type: 'BEARISH',
			strength: 'STRONG',
			message: '🔴 BTC dominance surging - Consider reducing alt exposure',
		});
	}

	// Phase-based signals
	if (phase.phase === 'TRANSITION' && trend.trend.includes('DOWN')) {
		signals.push({
			type: 'BULLISH',
			strength: 'STRONG',
			message: '⚡ Market entering alt-friendly phase - Position early!',
		});
	}

	if (phase.phase === 'PEAK_EUPHORIA') {
		signals.push({
			type: 'WARNING',
			strength: 'EXTREME',
			message: '⚠️ Extreme low BTC dominance - Market may be overheated',
		});
	}

	// Volume-based signals
	if (current.marketCapChange24h > 5 && trend.trend.includes('DOWN')) {
		signals.push({
			type: 'BULLISH',
			strength: 'MODERATE',
			message:
				'📈 Market cap growing with falling BTC dominance - Healthy alt growth',
		});
	}

	return signals;
}

/**
 * Display dominance report in console
 * @param {Object} report - Dominance report
 */
function displayReport(report) {
	console.log('╔═══════════════════════════════════════════════════╗');
	console.log('║          BTC DOMINANCE ANALYSIS REPORT            ║');
	console.log('╚═══════════════════════════════════════════════════╝\n');

	console.log(`📊 CURRENT DOMINANCE`);
	console.log(`   BTC: ${report.current.btc.toFixed(2)}%`);
	console.log(`   ETH: ${report.current.eth.toFixed(2)}%`);
	console.log(`   Altcoins: ${report.current.altcoins.toFixed(2)}%\n`);

	console.log(`📈 TREND ANALYSIS`);
	console.log(`   Direction: ${report.trend.trend}`);
	console.log(`   Strength: ${report.trend.strength.toFixed(2)}`);
	console.log(
		`   Changes: 1h: ${report.trend.changes['1h']}% | 24h: ${report.trend.changes['24h']}% | 7d: ${report.trend.changes['7d']}%`
	);
	console.log(`   ${report.trend.description}\n`);

	console.log(`${report.phase.emoji} MARKET PHASE: ${report.phase.phase}`);
	console.log(`   ${report.phase.description}`);
	console.log(`   Strategy: ${report.phase.altStrategy}`);
	console.log(`   Risk Level: ${report.phase.risk}`);
	console.log(`   Opportunity: ${report.phase.opportunity}\n`);

	if (report.extremes) {
		console.log(`📊 HISTORICAL CONTEXT (Last 30 days)`);
		console.log(
			`   Minimum: ${report.extremes.minimum.value}% on ${report.extremes.minimum.date}`
		);
		console.log(
			`   Maximum: ${report.extremes.maximum.value}% on ${report.extremes.maximum.date}`
		);
		console.log(`   Range: ${report.extremes.range}%\n`);
	}

	if (report.signals.length > 0) {
		console.log(`🎯 TRADING SIGNALS`);
		report.signals.forEach((signal) => {
			console.log(`   ${signal.message}`);
		});
		console.log('');
	}

	console.log(
		`📅 Data points: ${report.dataPoints} | Last update: ${new Date(
			report.lastUpdate
		).toLocaleString()}`
	);
}

/**
 * Analizuje trend dla pary ETH/BTC.
 * @param {Array} history - Dane historyczne w formacie [timestamp, price].
 * @returns {Object} Obiekt z analizą trendu.
 */
function analyzeEthBtcTrend(history) {
	if (!history || history.length < 30) {
		return {
			trend: 'UNKNOWN',
			description: 'Za mało danych do analizy ETH/BTC',
		};
	}

	const now = history[history.length - 1][1];
	const day7 = history[history.length - 8][1];
	const day30 = history[history.length - 31][1];

	const change7d = ((now - day7) / day7) * 100;
	const change30d = ((now - day30) / day30) * 100;

	let trend, description;

	if (change7d > 5 && change30d > 10) {
		trend = 'STRONG_UP';
		description =
			'ETH wyraźnie umacnia się względem BTC. Bardzo dobry sygnał dla altów.';
	} else if (change7d > 2 && change30d > 5) {
		trend = 'UP';
		description = 'ETH zyskuje na sile. Pozytywny sygnał dla altcoinów.';
	} else if (change7d < -5 && change30d < -10) {
		trend = 'STRONG_DOWN';
		description = 'ETH mocno traci do BTC. Zły sygnał dla altów.';
	} else if (change7d < -2 && change30d < -5) {
		trend = 'DOWN';
		description = 'ETH osłabia się. Kapitał może wracać do BTC.';
	} else {
		trend = 'SIDEWAYS';
		description = 'ETH/BTC w konsolidacji. Rynek czeka na kierunek.';
	}

	return {
		trend,
		description,
		change7d: change7d.toFixed(2) + '%',
		change30d: change30d.toFixed(2) + '%',
		currentValue: now.toFixed(5) + ' BTC',
	};
}

// Export functions
module.exports = {
	getCurrentDominance,
	loadHistory,
	saveToHistory,
	analyzeTrend,
	getMarketPhase,
	getHistoricalExtremes,
	generateDominanceReport,
	displayReport,
	analyzeEthBtcTrend,
};

// Run report if executed directly
if (require.main === module) {
	generateDominanceReport()
		.then((report) => displayReport(report))
		.catch((error) => console.error('Error:', error.message));
}
