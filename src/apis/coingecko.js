const axios = require('axios');
const { getDevData, setDevData } = require('../core/cache');
const cache = require('../core/cache');

require('dotenv').config();

// Configuration
const BASE_URL =
	process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY;

// Rate limiting - CoinGecko free tier allows 10-30 calls/minute
const RATE_LIMIT_DELAY = 2000; // 2 seconds between calls to be safe

const MARKET_DATA_CACHE_TTL = 15 * 60 * 1000; //  (15 minut)

// Create axios instance with default config
const api = axios.create({
	baseURL: BASE_URL,
	timeout: 10000,
	headers: API_KEY ? { 'x-cg-demo-api-key': API_KEY } : {},
});

// Helper function to handle rate limiting
const rateLimitedCall = async (fn) => {
	const result = await fn();
	await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
	return result;
};

/**
 * Get top coins by market cap
 * @param {number} limit - Number of coins to fetch (max 250)
 * @param {string} currency - Currency for price data (default: usd)
 * @returns {Promise<Array>} Array of coin data
 */
async function getTopCoins(limit = 100, currency = 'usd') {
	try {
		console.log(`📊 Fetching top ${limit} coins from CoinGecko...`);

		const response = await rateLimitedCall(() =>
			api.get('/coins/markets', {
				params: {
					vs_currency: currency,
					order: 'market_cap_desc',
					per_page: limit,
					page: 1,
					sparkline: false,
					price_change_percentage: '24h,7d',
				},
			})
		);

		console.log(`✅ Fetched ${response.data.length} coins successfully`);
		return response.data;
	} catch (error) {
		console.error('❌ Error fetching top coins:', error.message);
		if (error.response) {
			console.error('Response status:', error.response.status);
			console.error('Response data:', error.response.data);
		}
		throw error;
	}
}

/**
 * Get global market data, including BTC dominance and total market cap.
 * @returns {Promise<Object>} Global market data
 */
async function getGlobalMarketData() {
	try {
		const response = await rateLimitedCall(() => api.get('/global'));
		const globalData = response.data.data;

		console.log(
			`📈 Current BTC Dominance: ${globalData.market_cap_percentage.btc.toFixed(2)}%`
		);
		console.log(
			`💰 Total Market Cap: $${globalData.total_market_cap.usd.toLocaleString()}`
		);

		return globalData; // Zwracamy cały obiekt
	} catch (error) {
		console.error('❌ Error fetching global market data:', error.message);
		throw error;
	}
}

/**
 * Format coin data for our scanner
 * @param {Object} coin - Raw coin data from CoinGecko
 * @returns {Object} Formatted coin data
 */
function formatCoinData(coin) {
	return {
		id: coin.id,
		symbol: coin.symbol.toUpperCase(),
		name: coin.name,
		rank: coin.market_cap_rank,
		price: coin.current_price,
		marketCap: coin.market_cap,
		volume24h: coin.total_volume,
		priceChange24h: coin.price_change_percentage_24h,
		priceChange7d: coin.price_change_percentage_7d_in_currency || 0,
		circulatingSupply: coin.circulating_supply,
		// Volume to Market Cap ratio - good for finding active coins
		volumeToMcap: coin.total_volume / coin.market_cap,
		lastUpdated: coin.last_updated,
	};
}

/**
 * Main function to get top 100 coins with our required data
 * @returns {Promise<Array>} Array of formatted coin data
 */
async function getTop100() {
	try {
		// Get coin data
		const coins = await getTopCoins(100);

		// Format the data
		const formattedCoins = coins.map(formatCoinData);

		// Get BTC dominance for context
		const btcDominance = await getGlobalMarketData();

		return {
			coins: formattedCoins,
			btcDominance,
			timestamp: new Date().toISOString(),
			count: formattedCoins.length,
		};
	} catch (error) {
		console.error('❌ Failed to get top 100 coins:', error.message);
		throw error;
	}
}

/**
 * Pobiera dane deweloperskie dla pojedynczej monety.
 * @param {string} coinId - ID monety z CoinGecko
 * @returns {Promise<Object|null>} Obiekt z danymi deweloperskimi lub null w przypadku błędu.
 */
async function getCoinDeveloperData(coinId) {
	// Krok 1: Sprawdź cache
	const cachedData = getDevData(coinId);
	if (cachedData) {
		console.log(`✅ Pobrano dane deweloperskie dla ${coinId} z CACHE.`);
	}

	// Krok 2: Jeśli nie ma w cache'u, pobierz z API
	try {
		const response = await rateLimitedCall(() =>
			api.get(`/coins/${coinId}`, {
				params: {
					localization: false,
					tickers: false,
					market_data: false,
					community_data: false,
					developer_data: true,
					sparkline: false,
				},
			})
		);

		if (response.data && response.data.developer_data) {
			const devData = {
				forks: response.data.developer_data.forks,
				stars: response.data.developer_data.stars,
				subscribers: response.data.developer_data.subscribers,
				pull_request_contributors:
					response.data.developer_data.pull_request_contributors,
				commit_count_4_weeks: response.data.developer_data.commit_count_4_weeks,
			};
			// Krok 3: Zapisz pobrane dane w cache'u
			setDevData(coinId, devData);
			return devData;
		}
		return null;
	} catch (error) {
		console.warn(
			`⚠️ Nie udało się pobrać danych deweloperskich dla ${coinId}: ${error.message}`
		);
		return null;
	}
}

// Test function
async function test() {
	console.log('🧪 Testing CoinGecko API...\n');

	try {
		// Test 1: Get top 5 coins
		console.log('Test 1: Fetching top 5 coins...');
		const top5 = await getTopCoins(5);
		console.log('Top 5 coins by market cap:');
		top5.forEach((coin) => {
			console.log(`- ${coin.symbol.toUpperCase()}: $${coin.current_price}`);
		});

		// Test 2: Get BTC dominance
		console.log('\nTest 2: Fetching BTC dominance...');
		await getGlobalMarketData();

		// Test 3: Format data
		console.log('\nTest 3: Testing data formatting...');
		const formatted = formatCoinData(top5[0]);
		console.log('Formatted data sample:', formatted);

		console.log('\n✅ All tests passed!');
	} catch (error) {
		console.error('\n❌ Test failed:', error.message);
	}
}

/**
 * Pobiera dane historyczne dla pary ETH/BTC.
 * @param {number} days - Liczba dni do pobrania.
 * @returns {Promise<Array|null>} Tablica z danymi [timestamp, price] lub null.
 */
async function getEthBtcChartData(days = 90) {
	const cacheKey = `eth_btc_chart_${days}d`;
	const cachedData = cache.get(cacheKey);
	if (cachedData) {
		console.log(`✅ Pobrano dane ETH/BTC z CACHE.`);
		return cachedData;
	}

	try {
		console.log(`📊 Pobieram dane historyczne dla ETH/BTC...`);
		const response = await rateLimitedCall(() =>
			api.get('/coins/ethereum/market_chart', {
				params: {
					vs_currency: 'btc',
					days: days,
					interval: 'daily',
				},
			})
		);

		if (response.data && response.data.prices) {
			cache.set(cacheKey, response.data.prices, MARKET_DATA_CACHE_TTL);
			return response.data.prices;
		}
		return null;
	} catch (error) {
		console.error('❌ Błąd podczas pobierania danych ETH/BTC:', error.message);
		return null;
	}
}

// Export functions
module.exports = {
	getTopCoins,
	getGlobalMarketData,
	formatCoinData,
	getTop100,
	test,
	getCoinDeveloperData,
	getEthBtcChartData,
};

// Run test if this file is executed directly
if (require.main === module) {
	test();
}
