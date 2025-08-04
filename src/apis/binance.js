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
 * @param {Object} exchangeInfo - Pre-fetched exchange info
 * @returns {Promise<Object>} Listing info or null if not found
 */
async function checkIfListed(symbol, exchangeInfo) {
	try {
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
 * Pobiera szczegółowe dane rynkowe (ticker 24h) dla pojedynczej, zweryfikowanej pary.
 * @param {string} mainPair - Główna para handlowa (np. 'MATICUSDT').
 * @param {string} symbol - Symbol monety.
 * @returns {Promise<Object>} Szczegółowe dane z Binance.
 */
async function getDetailedBinanceData(mainPair, symbol) {
	const ticker = await get24hrTicker(mainPair);

	if (!ticker) {
		return {
			isListed: true, // Wiemy, że jest, bo przeszła weryfikację
			symbol: symbol.toUpperCase(),
			error: 'Nie można było pobrać danych z tickera.',
		};
	}

	return {
		isListed: true,
		symbol: symbol.toUpperCase(),
		mainPair: mainPair,
		binancePrice: ticker.lastPrice,
		binanceVolume24h: ticker.quoteVolume,
		binanceTrades24h: ticker.count,
		priceRange24h:
			(((ticker.highPrice - ticker.lowPrice) / ticker.lowPrice) * 100).toFixed(
				2
			) + '%',
	};
}

/**
 * Sprawdza wiele monet na Binance w zoptymalizowany, dwuetapowy sposób.
 * Etap 1: Szybka weryfikacja notowań dla wszystkich symboli.
 * Etap 2: Pobranie szczegółowych danych tylko dla notowanych monet.
 * @param {Array<string>} symbols - Tablica symboli monet do sprawdzenia.
 * @returns {Promise<Object>} Mapa symbol -> dane z Binance.
 */
async function checkMultipleCoins(symbols) {
	console.log(
		`🔍 Weryfikacja ${symbols.length} monet na Binance (Etap 1: Notowanie)...`
	);
	const exchangeInfo = await getExchangeInfo();
	const listingResults = verifyListingStatus(symbols, exchangeInfo);

	const listedCoins = Object.entries(listingResults)
		.filter(([, data]) => data.isListed)
		.map(([symbol, data]) => ({ symbol, mainPair: data.mainPair }));

	console.log(
		`📈 Pobieranie szczegółowych danych dla ${listedCoins.length} notowanych monet (Etap 2: Dane rynkowe)...`
	);

	const detailedDataResults = {};
	const batchSize = 10; // Przetwarzaj w partiach po 10

	for (let i = 0; i < listedCoins.length; i += batchSize) {
		const batch = listedCoins.slice(i, i + batchSize);
		const promises = batch.map((coin) =>
			getDetailedBinanceData(coin.mainPair, coin.symbol).then((data) => {
				detailedDataResults[coin.symbol.toUpperCase()] = data;
			})
		);
		await Promise.all(promises);

		if (i + batchSize < listedCoins.length) {
			await new Promise((resolve) => setTimeout(resolve, 1000)); // Krótka przerwa między partiami
		}
	}

	// Połącz wyniki
	const finalResults = {};
	for (const symbol of symbols) {
		const upperSymbol = symbol.toUpperCase();
		if (detailedDataResults[upperSymbol]) {
			finalResults[upperSymbol] = detailedDataResults[upperSymbol];
		} else {
			finalResults[upperSymbol] = { isListed: false, symbol: upperSymbol };
		}
	}

	const listedCount = Object.values(finalResults).filter(
		(r) => r.isListed
	).length;
	console.log(
		`✅ Weryfikacja Binance zakończona. Znaleziono ${listedCount} z ${symbols.length} monet.`
	);

	return finalResults;
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
		const maticData = await getDetailedBinanceData('MATIC');
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
 * Oblicza presję kupna/sprzedaży na podstawie transakcji z zadanego okresu.
 * @param {string} symbol - Para handlowa, np. 'BTCUSDT'
 * @param {number} durationMinutes - Okres analizy w minutach (np. 60 dla ostatniej godziny)
 * @returns {Promise<Object|null>}
 */
async function getBuySellPressure(symbol, durationMinutes = 60) {
	try {
		const endTime = Date.now();
		const startTime = endTime - durationMinutes * 60 * 1000;

		const response = await api.get('/api/v3/aggTrades', {
			params: { symbol, startTime, endTime, limit: 1000 },
		});

		if (!response.data || response.data.length === 0) return null;

		let buyVolume = 0;
		let sellVolume = 0;

		for (const trade of response.data) {
			const price = parseFloat(trade.p);
			const quantity = parseFloat(trade.q);
			const volume = price * quantity;

			if (trade.m) {
				// `m` is true if the buyer is the maker (traktowane jako sell-side pressure)
				sellVolume += volume;
			} else {
				buyVolume += volume;
			}
		}

		const totalVolume = buyVolume + sellVolume;
		if (totalVolume === 0) return null;

		const buyPressure = (buyVolume / totalVolume) * 100;

		return {
			buyVolume: buyVolume,
			sellVolume: sellVolume,
			totalVolume: totalVolume,
			buyPressure: buyPressure.toFixed(1),
			tradesCount: response.data.length,
		};
	} catch (error) {
		console.warn(`⚠️  Nie udało się pobrać danych o presji dla ${symbol}`);
		return null;
	}
}

/**
 * Analyze trade sizes to determine retail vs whale activity
 * @param {string} symbol - Trading pair (e.g., 'BTCUSDT')
 * @param {number} hours - How many hours back to analyze
 * @returns {Promise<Object>} Trade size analysis
 */
async function getSmartVolumeAnalysis(symbol, hours = 24) {
	try {
		const endTime = Date.now();
		const startTime = endTime - hours * 60 * 60 * 1000;

		// Get recent trades
		const response = await api.get('/api/v3/aggTrades', {
			params: {
				symbol,
				startTime,
				endTime,
				limit: 1000,
			},
		});

		if (!response.data || response.data.length === 0) return null;

		const trades = response.data;
		const currentPrice = parseFloat(trades[trades.length - 1].p);

		// Define trade size categories (in USD)
		const categories = {
			micro: { min: 0, max: 100, count: 0, volume: 0, label: 'Micro (<$100)' },
			retail: {
				min: 100,
				max: 10000,
				count: 0,
				volume: 0,
				label: 'Retail ($100-$10k)',
			},
			medium: {
				min: 10000,
				max: 50000,
				count: 0,
				volume: 0,
				label: 'Medium ($10k-$50k)',
			},
			large: {
				min: 50000,
				max: 100000,
				count: 0,
				volume: 0,
				label: 'Large ($50k-$100k)',
			},
			whale: {
				min: 100000,
				max: Infinity,
				count: 0,
				volume: 0,
				label: 'Whale (>$100k)',
			},
		};

		let totalVolume = 0;
		let totalTrades = trades.length;
		let buyVolume = 0;
		let sellVolume = 0;

		// Analyze each trade
		trades.forEach((trade) => {
			const price = parseFloat(trade.p);
			const quantity = parseFloat(trade.q);
			const volumeUSD = price * quantity;

			totalVolume += volumeUSD;

			// Categorize trade
			for (const [key, cat] of Object.entries(categories)) {
				if (volumeUSD >= cat.min && volumeUSD < cat.max) {
					cat.count++;
					cat.volume += volumeUSD;
					break;
				}
			}

			// Buy/Sell pressure
			if (trade.m) {
				sellVolume += volumeUSD;
			} else {
				buyVolume += volumeUSD;
			}
		});

		// Calculate average trade size
		const avgTradeSize = totalVolume / totalTrades;

		// Calculate percentages
		for (const cat of Object.values(categories)) {
			cat.volumePercent =
				totalVolume > 0 ? ((cat.volume / totalVolume) * 100).toFixed(2) : 0;
			cat.countPercent =
				totalTrades > 0 ? ((cat.count / totalTrades) * 100).toFixed(2) : 0;
		}

		// Determine market character
		const whalePercent = parseFloat(categories.whale.volumePercent);
		const retailPercent =
			parseFloat(categories.retail.volumePercent) +
			parseFloat(categories.micro.volumePercent);

		let marketCharacter;
		if (whalePercent > 40) {
			marketCharacter = '🐋 Dominacja wielorybów';
		} else if (whalePercent > 25) {
			marketCharacter = '🦈 Mieszane (obecność wielorybów)';
		} else if (retailPercent > 60) {
			marketCharacter = '👥 Dominacja handlu detalicznego';
		} else {
			marketCharacter = '⚖️ Rynek zrównoważony';
		}

		return {
			avgTradeSize: avgTradeSize.toFixed(2),
			avgTradeSizeFormatted: formatUSD(avgTradeSize),
			totalVolume: totalVolume.toFixed(2),
			totalVolumeFormatted: formatUSD(totalVolume),
			totalTrades,
			categories,
			marketCharacter,
			buyPressure: ((buyVolume / totalVolume) * 100).toFixed(1),
			period: `${hours}h`,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		console.warn(
			`⚠️ Could not analyze smart volume for ${symbol}: ${error.message}`
		);
		return null;
	}
}

/**
 * Get volume profile showing volume distribution across price levels
 * @param {string} symbol - Trading pair
 * @param {string} interval - Kline interval (1h, 4h, 1d)
 * @param {number} limit - Number of klines
 * @returns {Promise<Object>} Volume profile data
 */
async function getVolumeProfile(symbol, interval = '1h', limit = 24) {
	try {
		// Get klines for volume profile
		const klines = await getKlines(symbol, interval, limit);

		if (!klines || klines.length === 0) return null;

		// Find price range
		let minPrice = Infinity;
		let maxPrice = -Infinity;

		klines.forEach((k) => {
			minPrice = Math.min(minPrice, k.low);
			maxPrice = Math.max(maxPrice, k.high);
		});

		// Create price buckets (20 levels)
		const numBuckets = 20;
		const priceRange = maxPrice - minPrice;
		const bucketSize = priceRange / numBuckets;

		const volumeProfile = [];
		for (let i = 0; i < numBuckets; i++) {
			volumeProfile.push({
				priceFrom: minPrice + i * bucketSize,
				priceTo: minPrice + (i + 1) * bucketSize,
				volume: 0,
				volumePercent: 0,
				trades: 0,
			});
		}

		// Distribute volume across price levels
		let totalVolume = 0;

		klines.forEach((kline) => {
			const avgPrice = (kline.high + kline.low + kline.close + kline.open) / 4;
			const bucketIndex = Math.floor((avgPrice - minPrice) / bucketSize);

			if (bucketIndex >= 0 && bucketIndex < numBuckets) {
				volumeProfile[bucketIndex].volume += kline.quoteVolume;
				volumeProfile[bucketIndex].trades += kline.trades;
				totalVolume += kline.quoteVolume;
			}
		});

		// Calculate percentages and find POC (Point of Control)
		let maxVolumeLevel = 0;
		let pocIndex = 0;

		volumeProfile.forEach((level, index) => {
			level.volumePercent =
				totalVolume > 0 ? ((level.volume / totalVolume) * 100).toFixed(2) : 0;

			if (level.volume > maxVolumeLevel) {
				maxVolumeLevel = level.volume;
				pocIndex = index;
			}
		});

		// Find value areas (70% of volume)
		const sortedLevels = [...volumeProfile].sort((a, b) => b.volume - a.volume);
		let valueAreaVolume = 0;
		let valueAreaLevels = [];

		for (const level of sortedLevels) {
			valueAreaVolume += level.volume;
			valueAreaLevels.push(level);

			if (valueAreaVolume >= totalVolume * 0.7) break;
		}

		const valueAreaHigh = Math.max(...valueAreaLevels.map((l) => l.priceTo));
		const valueAreaLow = Math.min(...valueAreaLevels.map((l) => l.priceFrom));

		return {
			profile: volumeProfile,
			pointOfControl: {
				price:
					(volumeProfile[pocIndex].priceFrom +
						volumeProfile[pocIndex].priceTo) /
					2,
				volume: volumeProfile[pocIndex].volume,
				volumePercent: volumeProfile[pocIndex].volumePercent,
			},
			valueArea: {
				high: valueAreaHigh,
				low: valueAreaLow,
				range: valueAreaHigh - valueAreaLow,
			},
			priceRange: {
				min: minPrice,
				max: maxPrice,
				current: klines[klines.length - 1].close,
			},
			period: `${limit} x ${interval}`,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		console.warn(
			`⚠️ Could not get volume profile for ${symbol}: ${error.message}`
		);
		return null;
	}
}

/**
 * Format number as USD
 * @param {number} value - Value to format
 * @returns {string} Formatted string
 */
function formatUSD(value) {
	if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
	if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
	if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
	return `$${value.toFixed(2)}`;
}

/**
 * Szybko weryfikuje, które monety są notowane na Binance, bez pobierania danych rynkowych.
 * @param {Array<string>} symbols - Tablica symboli monet.
 * @param {Object} exchangeInfo - Wcześniej pobrane dane o giełdzie.
 * @returns {Object} Mapa symbol -> informacja o notowaniu.
 */
function verifyListingStatus(symbols, exchangeInfo) {
	const results = {};
	const allBinanceSymbols = exchangeInfo.symbols;

	for (const symbol of symbols) {
		const upperSymbol = symbol.toUpperCase();
		const pairs = allBinanceSymbols.filter(
			(s) =>
				s.baseAsset === upperSymbol &&
				s.status === 'TRADING' &&
				(s.quoteAsset === 'USDT' ||
					s.quoteAsset === 'BUSD' ||
					s.quoteAsset === 'BTC')
		);

		if (pairs.length > 0) {
			const usdtPair = pairs.find((p) => p.quoteAsset === 'USDT');
			results[upperSymbol] = {
				isListed: true,
				mainPair: (usdtPair || pairs[0]).symbol,
			};
		} else {
			results[upperSymbol] = { isListed: false };
		}
	}
	return results;
}

/**
 * Pobiera i agreguje aktywność (wolumen kupna/sprzedaży) dla kluczowych par ze stablecoinami.
 * @returns {Promise<Object|null>}
 */
async function getStablecoinActivity() {
	console.log('💧 Analizuję aktywność na parach ze stablecoinami...');
	const keyPairs = [
		'BTCUSDT',
		'ETHUSDT',
		'SOLUSDT',
		'BNBUSDT',
		'XRPUSDT',
		'DOGEUSDT',
		'ADAUSDT',
		'AVAXUSDT',
		'LINKUSDT',
		'DOTUSDT',
	];

	let totalBuyVolume = 0;
	let totalSellVolume = 0;
	let totalTrades = 0;

	const promises = keyPairs.map((pair) => getBuySellPressure(pair, 60 * 24)); // 24h
	const results = await Promise.all(promises);

	results.forEach((result) => {
		if (result) {
			totalBuyVolume += result.buyVolume;
			totalSellVolume += result.sellVolume;
			totalTrades += result.tradesCount;
		}
	});

	if (totalTrades === 0) {
		console.warn('⚠️ Nie udało się pobrać danych o aktywności stablecoinów.');
		return null;
	}

	const totalVolume = totalBuyVolume + totalSellVolume;
	console.log(
		`✅ Analiza zakończona. Całkowity wolumen: ${formatUSD(totalVolume)}, Presja kupna: ${((totalBuyVolume / totalVolume) * 100).toFixed(1)}%`
	);

	return {
		totalBuyVolume,
		totalSellVolume,
		totalVolume,
		totalTrades,
	};
}

module.exports = {
	getExchangeInfo,
	checkIfListed,
	get24hrTicker,
	getDetailedBinanceData,
	checkMultipleCoins,
	test,
	getKlines,
	getBuySellPressure,
	getSmartVolumeAnalysis,
	getVolumeProfile,
	formatUSD,
	verifyListingStatus,
	getStablecoinActivity,
};

// Run test if this file is executed directly
if (require.main === module) {
	test();
}
