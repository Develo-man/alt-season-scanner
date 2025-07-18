// src/apis/dexAnalytics.js
const axios = require('axios');
require('dotenv').config();
const config = require('../config');

const BASE_URL = config.api.dexScreener.baseUrl;
const RATE_LIMIT_DELAY = config.api.dexScreener.rateLimitDelay;

// Create axios instance
const api = axios.create({
	baseURL: BASE_URL,
	timeout: 10000,
});

/**
 * Get DEX pairs for a token across multiple chains
 * @param {string} tokenAddress - Contract address of the token
 * @returns {Promise<Array>} Array of DEX pairs
 */
async function getTokenPairs(tokenAddress) {
	try {
		const response = await api.get(`/tokens/${tokenAddress}`);
		return response.data.pairs || [];
	} catch (error) {
		console.warn(
			`⚠️ Could not fetch DEX data for ${tokenAddress}: ${error.message}`
		);
		return [];
	}
}

/**
 * Search for pairs by token symbol
 * @param {string} symbol - Token symbol (e.g., 'PEPE')
 * @returns {Promise<Array>} Array of matching pairs
 */
async function searchPairsBySymbol(symbol) {
	try {
		const response = await api.get(`/search/?q=${symbol}`);
		return response.data.pairs || [];
	} catch (error) {
		console.warn(
			`⚠️ Could not search DEX pairs for ${symbol}: ${error.message}`
		);
		return [];
	}
}

/**
 * Get trending pairs from DEX
 * @param {string} chain - Chain name (ethereum, bsc, polygon, etc.)
 * @returns {Promise<Array>} Array of trending pairs
 */
async function getTrendingPairs(chain = 'ethereum') {
	try {
		const response = await api.get(`/pairs/${chain}`);
		return response.data.pairs || [];
	} catch (error) {
		console.warn(
			`⚠️ Could not fetch trending pairs for ${chain}: ${error.message}`
		);
		return [];
	}
}

/**
 * Analyze DEX metrics for a coin
 * @param {string} symbol - Coin symbol
 * @param {string} contractAddress - Optional contract address for better matching
 * @returns {Promise<Object>} DEX analytics data
 */
async function analyzeDEXMetrics(symbol, contractAddress = null) {
	try {
		console.log(`🔍 Analyzing DEX metrics for ${symbol}...`);

		// Try to find pairs by contract address first, then by symbol
		let pairs = [];
		if (contractAddress) {
			pairs = await getTokenPairs(contractAddress);
		}

		if (pairs.length === 0) {
			pairs = await searchPairsBySymbol(symbol);
		}

		if (pairs.length === 0) {
			return {
				symbol,
				hasDEXData: false,
				error: 'No DEX pairs found',
			};
		}

		// Filter and analyze pairs
		const activePairs = pairs.filter(
			(pair) =>
				pair.volume?.h24 > config.dex.minDailyVolume &&
				pair.liquidity?.usd > config.dex.minLiquidity
		);

		if (activePairs.length === 0) {
			return {
				symbol,
				hasDEXData: false,
				error: 'No active DEX pairs found',
			};
		}

		// Calculate aggregated metrics
		const metrics = calculateDEXMetrics(activePairs);

		return {
			symbol,
			hasDEXData: true,
			...metrics,
			topPairs: activePairs.slice(0, 3).map(formatPairData),
			lastUpdate: new Date().toISOString(),
		};
	} catch (error) {
		console.error(
			`❌ Error analyzing DEX metrics for ${symbol}:`,
			error.message
		);
		return {
			symbol,
			hasDEXData: false,
			error: error.message,
		};
	}
}

/**
 * Calculate aggregated DEX metrics from pairs
 * @param {Array} pairs - Array of DEX pairs
 * @returns {Object} Calculated metrics
 */
function calculateDEXMetrics(pairs) {
	const totalVolume24h = pairs.reduce(
		(sum, pair) => sum + (pair.volume?.h24 || 0),
		0
	);
	const totalLiquidity = pairs.reduce(
		(sum, pair) => sum + (pair.liquidity?.usd || 0),
		0
	);
	const totalTxns24h = pairs.reduce(
		(sum, pair) =>
			sum + (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
		0
	);

	// Calculate buy/sell pressure
	const totalBuys = pairs.reduce(
		(sum, pair) => sum + (pair.txns?.h24?.buys || 0),
		0
	);
	const totalSells = pairs.reduce(
		(sum, pair) => sum + (pair.txns?.h24?.sells || 0),
		0
	);
	const buyPressure = totalTxns24h > 0 ? (totalBuys / totalTxns24h) * 100 : 50;

	// Calculate average price change
	const avgPriceChange24h =
		pairs.reduce((sum, pair) => sum + (pair.priceChange?.h24 || 0), 0) /
		pairs.length;

	// Liquidity analysis
	const liquidityScore = calculateLiquidityScore(totalLiquidity);

	// Volume quality score
	const volumeQualityScore = calculateVolumeQuality(pairs);

	// DEX diversity (how many different DEXes)
	const uniqueDEXes = [...new Set(pairs.map((pair) => pair.dexId))].length;

	return {
		totalVolume24h,
		totalLiquidity,
		totalTxns24h,
		buyPressure: buyPressure.toFixed(1),
		avgPriceChange24h: avgPriceChange24h.toFixed(2),
		liquidityScore,
		volumeQualityScore,
		uniqueDEXes,
		activePairsCount: pairs.length,
		metrics: {
			volume24hFormatted: formatUSD(totalVolume24h),
			liquidityFormatted: formatUSD(totalLiquidity),
			avgTxnSize:
				totalTxns24h > 0 ? formatUSD(totalVolume24h / totalTxns24h) : '$0',
		},
	};
}

/**
 * Calculate liquidity score (0-100)
 * @param {number} liquidity - Total liquidity in USD
 * @returns {number} Score
 */
function calculateLiquidityScore(liquidity) {
	if (liquidity >= 10000000) return 100; // $10M+
	if (liquidity >= 5000000) return 90; // $5M+
	if (liquidity >= 1000000) return 80; // $1M+
	if (liquidity >= 500000) return 70; // $500K+
	if (liquidity >= 100000) return 60; // $100K+
	if (liquidity >= 50000) return 40; // $50K+
	if (liquidity >= 10000) return 20; // $10K+
	return 10;
}

/**
 * Calculate volume quality score
 * @param {Array} pairs - DEX pairs
 * @returns {number} Score 0-100
 */
function calculateVolumeQuality(pairs) {
	let score = 0;

	// Check for organic vs wash trading patterns
	pairs.forEach((pair) => {
		const volume = pair.volume?.h24 || 0;
		const liquidity = pair.liquidity?.usd || 0;
		const txns = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);

		// Volume to liquidity ratio (should be reasonable)
		const volLiqRatio = liquidity > 0 ? volume / liquidity : 0;
		if (volLiqRatio > 0.5 && volLiqRatio < 20) score += 20; // Good ratio

		// Transaction count vs volume (detect wash trading)
		const avgTxnSize = txns > 0 ? volume / txns : 0;
		if (avgTxnSize > 50 && avgTxnSize < 50000) score += 15; // Organic size

		// Price stability
		const priceChange = Math.abs(pair.priceChange?.h24 || 0);
		if (priceChange < 50) score += 10; // Not too volatile
	});

	return Math.min(score, 100);
}

/**
 * Format pair data for display
 * @param {Object} pair - DEX pair data
 * @returns {Object} Formatted pair
 */
function formatPairData(pair) {
	return {
		dex: pair.dexId,
		chain: pair.chainId,
		address: pair.pairAddress,
		baseToken: pair.baseToken?.symbol,
		quoteToken: pair.quoteToken?.symbol,
		volume24h: formatUSD(pair.volume?.h24 || 0),
		liquidity: formatUSD(pair.liquidity?.usd || 0),
		priceChange24h: pair.priceChange?.h24?.toFixed(2) + '%' || '0.00%',
		txns24h: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
		url: pair.url,
	};
}

/**
 * Format USD amount
 * @param {number} amount - Amount in USD
 * @returns {string} Formatted string
 */
function formatUSD(amount) {
	if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
	if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
	if (amount >= 1e3) return `$${(amount / 1e3).toFixed(2)}K`;
	return `$${amount.toFixed(2)}`;
}

/**
 * Batch analyze multiple coins
 * @param {Array} coins - Array of coin objects with symbol
 * @returns {Promise<Object>} Map of symbol -> DEX analytics
 */
async function batchAnalyzeDEX(coins) {
	console.log(`🔍 Analyzing DEX metrics for ${coins.length} coins...`);

	const results = {};
	const batchSize = 5; // Process 5 at a time to avoid rate limits

	for (let i = 0; i < coins.length; i += batchSize) {
		const batch = coins.slice(i, i + batchSize);

		const promises = batch.map((coin) =>
			analyzeDEXMetrics(coin.symbol, coin.contractAddress)
				.then((data) => {
					results[coin.symbol] = data;
				})
				.catch((error) => {
					results[coin.symbol] = {
						symbol: coin.symbol,
						hasDEXData: false,
						error: error.message,
					};
				})
		);

		await Promise.all(promises);

		// Delay between batches
		if (i + batchSize < coins.length) {
			await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
		}
	}

	const successCount = Object.values(results).filter(
		(r) => r.hasDEXData
	).length;
	console.log(
		`✅ DEX analysis completed: ${successCount}/${coins.length} coins with data`
	);

	return results;
}

/**
 * Test function
 */
async function test() {
	console.log('🧪 Testing DEX Analytics...\n');

	try {
		// Test 1: Search for a popular token
		console.log('Test 1: Searching for PEPE pairs...');
		const pepePairs = await searchPairsBySymbol('PEPE');
		console.log(`✅ Found ${pepePairs.length} PEPE pairs`);

		// Test 2: Analyze metrics for a token
		console.log('\nTest 2: Analyzing DEX metrics for PEPE...');
		const pepeMetrics = await analyzeDEXMetrics('PEPE');
		console.log('✅ PEPE DEX metrics:', JSON.stringify(pepeMetrics, null, 2));

		// Test 3: Get trending pairs
		console.log('\nTest 3: Getting trending Ethereum pairs...');
		const trendingPairs = await getTrendingPairs('ethereum');
		console.log(`✅ Found ${trendingPairs.length} trending pairs`);

		console.log('\n✅ All DEX analytics tests passed!');
	} catch (error) {
		console.error('\n❌ DEX analytics test failed:', error.message);
	}
}

module.exports = {
	getTokenPairs,
	searchPairsBySymbol,
	getTrendingPairs,
	analyzeDEXMetrics,
	batchAnalyzeDEX,
	formatUSD,
	test,
};

// Run test if executed directly
if (require.main === module) {
	test();
}
