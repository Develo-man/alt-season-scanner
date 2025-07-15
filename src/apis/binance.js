const axios = require('axios');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.BINANCE_BASE_URL || 'https://api.binance.com';

// Create axios instance
const api = axios.create({
	baseURL: BASE_URL,
	timeout: 10000,
});

// Cache for exchange info (to avoid repeated calls)
let exchangeInfoCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Get all trading pairs from Binance
 * @returns {Promise<Object>} Exchange info with all symbols
 */
async function getExchangeInfo() {
	try {
		// Check cache first
		if (
			exchangeInfoCache &&
			cacheTimestamp &&
			Date.now() - cacheTimestamp < CACHE_DURATION
		) {
			console.log('📦 Using cached Binance exchange info');
			return exchangeInfoCache;
		}

		console.log('🔄 Fetching fresh Binance exchange info...');
		const response = await api.get('/api/v3/exchangeInfo');

		// Update cache
		exchangeInfoCache = response.data;
		cacheTimestamp = Date.now();

		console.log(
			`✅ Fetched ${response.data.symbols.length} trading pairs from Binance`
		);
		return response.data;
	} catch (error) {
		console.error('❌ Error fetching Binance exchange info:', error.message);
		throw error;
	}
}

/**
 * Check if a coin is listed on Binance
 * @param {string} symbol - Coin symbol (e.g., 'BTC', 'ETH')
 * @returns {Promise<Object>} Listing info or null if not found
 */
async function checkIfListed(symbol) {
	try {
		const exchangeInfo = await getExchangeInfo();

		// Find all pairs for this symbol
		const pairs = exchangeInfo.symbols.filter(
			(s) =>
				s.baseAsset === symbol.toUpperCase() &&
				s.status === 'TRADING' &&
				(s.quoteAsset === 'USDT' ||
					s.quoteAsset === 'BUSD' ||
					s.quoteAsset === 'BTC')
		);

		if (pairs.length === 0) {
			return null;
		}

		// Prefer USDT pair
		const usdtPair = pairs.find((p) => p.quoteAsset === 'USDT');
		const mainPair = usdtPair || pairs[0];

		return {
			isListed: true,
			symbol: symbol.toUpperCase(),
			tradingPairs: pairs.map((p) => p.symbol),
			mainPair: mainPair.symbol,
			baseAsset: mainPair.baseAsset,
			quoteAsset: mainPair.quoteAsset,
		};
	} catch (error) {
		console.error(`❌ Error checking if ${symbol} is listed:`, error.message);
		return null;
	}
}

/**
 * Get 24h ticker data for a symbol
 * @param {string} tradingPair - Trading pair (e.g., 'BTCUSDT')
 * @returns {Promise<Object>} Ticker data
 */
async function get24hrTicker(tradingPair) {
	try {
		const response = await api.get('/api/v3/ticker/24hr', {
			params: { symbol: tradingPair },
		});

		return {
			symbol: response.data.symbol,
			priceChange: parseFloat(response.data.priceChange),
			priceChangePercent: parseFloat(response.data.priceChangePercent),
			lastPrice: parseFloat(response.data.lastPrice),
			volume: parseFloat(response.data.volume),
			quoteVolume: parseFloat(response.data.quoteVolume),
			count: parseInt(response.data.count), // Number of trades
			highPrice: parseFloat(response.data.highPrice),
			lowPrice: parseFloat(response.data.lowPrice),
		};
	} catch (error) {
		console.error(
			`❌ Error fetching ticker for ${tradingPair}:`,
			error.message
		);
		return null;
	}
}

/**
 * Get Binance-specific data for a coin
 * @param {string} symbol - Coin symbol
 * @returns {Promise<Object>} Binance data including volume
 */
async function getBinanceData(symbol) {
	try {
		const listing = await checkIfListed(symbol);

		if (!listing || !listing.isListed) {
			return {
				isListed: false,
				symbol: symbol.toUpperCase(),
				reason: 'Not listed on Binance',
			};
		}

		// Get ticker data for main trading pair
		const ticker = await get24hrTicker(listing.mainPair);

		if (!ticker) {
			return {
				isListed: true,
				symbol: symbol.toUpperCase(),
				tradingPairs: listing.tradingPairs,
				error: 'Could not fetch ticker data',
			};
		}

		return {
			isListed: true,
			symbol: symbol.toUpperCase(),
			tradingPairs: listing.tradingPairs,
			mainPair: listing.mainPair,
			binancePrice: ticker.lastPrice,
			binanceVolume24h: ticker.quoteVolume, // Volume in USDT
			binanceVolumeCoins: ticker.volume, // Volume in coins
			binancePriceChange24h: ticker.priceChangePercent,
			binanceTrades24h: ticker.count,
			high24h: ticker.highPrice,
			low24h: ticker.lowPrice,
			priceRange24h:
				(
					((ticker.highPrice - ticker.lowPrice) / ticker.lowPrice) *
					100
				).toFixed(2) + '%',
		};
	} catch (error) {
		console.error(
			`❌ Error getting Binance data for ${symbol}:`,
			error.message
		);
		return {
			isListed: false,
			symbol: symbol.toUpperCase(),
			error: error.message,
		};
	}
}

/**
 * Check multiple coins on Binance (batch operation)
 * @param {Array} symbols - Array of coin symbols
 * @returns {Promise<Object>} Map of symbol -> binance data
 */
async function checkMultipleCoins(symbols) {
	console.log(`🔍 Checking ${symbols.length} coins on Binance...`);

	const results = {};
	const batchSize = 10; // Process 10 at a time to avoid rate limits

	for (let i = 0; i < symbols.length; i += batchSize) {
		const batch = symbols.slice(i, i + batchSize);
		const promises = batch.map((symbol) =>
			getBinanceData(symbol)
				.then((data) => {
					results[symbol.toUpperCase()] = data;
				})
				.catch((error) => {
					results[symbol.toUpperCase()] = {
						isListed: false,
						error: error.message,
					};
				})
		);

		await Promise.all(promises);

		// Small delay between batches
		if (i + batchSize < symbols.length) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	const listedCount = Object.values(results).filter((r) => r.isListed).length;
	console.log(
		`✅ Found ${listedCount} out of ${symbols.length} coins on Binance`
	);

	return results;
}

/**
 * Get top movers on Binance (bonus feature)
 * @returns {Promise<Array>} Top gaining coins
 */
async function getTopMovers() {
	try {
		console.log('📈 Fetching Binance top movers...');
		const response = await api.get('/api/v3/ticker/24hr');

		// Filter USDT pairs and sort by price change
		const movers = response.data
			.filter((t) => t.symbol.endsWith('USDT'))
			.map((t) => ({
				symbol: t.symbol.replace('USDT', ''),
				priceChangePercent: parseFloat(t.priceChangePercent),
				volume: parseFloat(t.quoteVolume),
				price: parseFloat(t.lastPrice),
			}))
			.sort((a, b) => b.priceChangePercent - a.priceChangePercent)
			.slice(0, 10);

		return movers;
	} catch (error) {
		console.error('❌ Error fetching top movers:', error.message);
		return [];
	}
}

// Test function
async function test() {
	console.log('🧪 Testing Binance API...\n');

	try {
		// Test 1: Check if API is accessible
		console.log('Test 1: API Connection');
		const info = await getExchangeInfo();
		console.log(`✅ Connected! Found ${info.symbols.length} trading pairs\n`);

		// Test 2: Check specific coins
		console.log('Test 2: Check if coins are listed');
		const testCoins = ['BTC', 'ETH', 'MATIC', 'FAKECOIN'];
		for (const coin of testCoins) {
			const result = await checkIfListed(coin);
			console.log(`${coin}: ${result ? 'Listed ✅' : 'Not listed ❌'}`);
		}

		// Test 3: Get detailed data
		console.log('\nTest 3: Get detailed Binance data for MATIC');
		const maticData = await getBinanceData('MATIC');
		console.log('MATIC data:', JSON.stringify(maticData, null, 2));

		console.log('\n✅ All tests passed!');
	} catch (error) {
		console.error('\n❌ Test failed:', error.message);
	}
}

/**
 * Get klines (candlestick) data for volatility calculation
 * @param {string} symbol - Trading pair (e.g., 'MATICUSDT')
 * @param {string} interval - Kline interval (1d, 4h, 1h, etc.)
 * @param {number} limit - Number of klines to fetch
 * @returns {Promise<Array>} Kline data
 */
async function getKlines(symbol, interval = '1d', limit = 14) {
	try {
		const response = await api.get('/api/v3/klines', {
			params: {
				symbol: symbol,
				interval: interval,
				limit: limit,
			},
		});

		return response.data.map((kline) => ({
			openTime: kline[0],
			open: parseFloat(kline[1]),
			high: parseFloat(kline[2]),
			low: parseFloat(kline[3]),
			close: parseFloat(kline[4]),
			volume: parseFloat(kline[5]),
			closeTime: kline[6],
			quoteVolume: parseFloat(kline[7]),
			trades: kline[8],
		}));
	} catch (error) {
		console.error(`❌ Error fetching klines for ${symbol}:`, error.message);
		return null;
	}
}

/**
 * Get aggregate trades to detect whale activity
 * @param {string} symbol - Trading pair
 * @param {number} limit - Number of trades (max 1000)
 * @returns {Promise<Object>} Whale activity analysis
 */
async function getWhaleActivity(symbol, limit = 500) {
	try {
		const response = await api.get('/api/v3/aggTrades', {
			params: {
				symbol: symbol,
				limit: limit,
			},
		});

		const trades = response.data;
		const currentPrice = parseFloat(trades[trades.length - 1].p);

		// Analyze trades
		let largeBuys = 0;
		let largeSells = 0;
		let totalLargeVolume = 0;
		const LARGE_TRADE_USD = 50000; // $50k threshold

		trades.forEach((trade) => {
			const price = parseFloat(trade.p);
			const quantity = parseFloat(trade.q);
			const valueUSD = price * quantity;

			if (valueUSD >= LARGE_TRADE_USD) {
				totalLargeVolume += valueUSD;
				// 'm' field indicates if buyer was maker
				if (trade.m) {
					largeSells++;
				} else {
					largeBuys++;
				}
			}
		});

		const totalLargeTrades = largeBuys + largeSells;
		const buyPressure =
			totalLargeTrades > 0 ? largeBuys / totalLargeTrades : 0.5;

		return {
			largeBuys,
			largeSells,
			totalLargeTrades,
			buyPressure,
			avgLargeTradeSize:
				totalLargeTrades > 0 ? totalLargeVolume / totalLargeTrades : 0,
			period: `Last ${limit} trades`,
		};
	} catch (error) {
		console.error(
			`❌ Error analyzing whale activity for ${symbol}:`,
			error.message
		);
		return null;
	}
}
async function batchProcess(items, batchSize, delayMs, processFn) {
	const results = [];
	
	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		const batchResults = await Promise.all(batch.map(processFn));
		results.push(...batchResults);
		
		if (i + batchSize < items.length) {
			await new Promise(resolve => setTimeout(resolve, delayMs));
		}
	}
	
	return results;
}

module.exports = {
	getExchangeInfo,
	checkIfListed,
	get24hrTicker,
	getBinanceData,
	checkMultipleCoins,
	getTopMovers,
	test,
	getKlines,
	getWhaleActivity,
};

// Run test if this file is executed directly
if (require.main === module) {
	test();
}
