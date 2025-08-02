/**
 * Advanced filtering functions for Alt Season Scanner
 * Each filter returns true if coin passes the criteria
 */

/**
 * Filter coins by price range
 * @param {Object} coin - Coin data
 * @param {number} maxPrice - Maximum price (default: 3)
 * @param {number} minPrice - Minimum price (default: 0.0001)
 * @returns {boolean}
 */
function filterByPrice(coin, maxPrice = 3, minPrice = 0.0001) {
	return coin.price >= minPrice && coin.price <= maxPrice;
}

/**
 * Filter by market cap rank
 * @param {Object} coin - Coin data
 * @param {number} maxRank - Maximum rank (default: 100)
 * @returns {boolean}
 */
function filterByMarketCapRank(coin, maxRank = 100) {
	return coin.rank <= maxRank && coin.rank > 0;
}

/**
 * Filter by volume activity (high volume = more interest)
 * @param {Object} coin - Coin data
 * @param {number} minVolumeRatio - Min volume/mcap ratio (default: 0.05 = 5%)
 * @returns {boolean}
 */
function filterByVolumeActivity(coin, minVolumeRatio = 0.05) {
	return coin.volumeToMcap >= minVolumeRatio;
}

/**
 * Filter by momentum (price performance)
 * @param {Object} coin - Coin data
 * @param {number} min7dChange - Minimum 7-day change % (default: 0)
 * @returns {boolean}
 */
function filterByMomentum(coin, min7dChange = 0) {
	return coin.priceChange7d >= min7dChange;
}

/**
 * Filter out stablecoins (USDT, USDC, DAI, etc.)
 * @param {Object} coin - Coin data
 * @returns {boolean}
 */
function filterOutStablecoins(coin) {
	const stablecoins = [
		'usdt',
		'usdc',
		'busd',
		'dai',
		'tusd',
		'usdp',
		'usdd',
		'gusd',
		'frax',
		'lusd',
		'usdn',
		'fdusd',
		'pyusd',
	];
	// Also check if name contains "USD" or "Tether"
	const nameCheck =
		coin.name.toLowerCase().includes('usd') ||
		coin.name.toLowerCase().includes('tether');
	return !stablecoins.includes(coin.symbol.toLowerCase()) && !nameCheck;
}

/**
 * Filter by "round number" proximity (psychological levels)
 * People love buying at 0.90 hoping for 1.00
 * @param {Object} coin - Coin data
 * @param {number} threshold - How close to round number (default: 0.15 = 15%)
 * @returns {boolean}
 */
function filterByRoundNumberProximity(coin, threshold = 0.15) {
	const price = coin.price;

	// Check proximity to various round numbers
	const roundNumbers = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3];

	for (const roundNum of roundNumbers) {
		const distance = Math.abs(price - roundNum) / roundNum;
		if (distance <= threshold && price < roundNum) {
			coin.nearRoundNumber = roundNum; // Add this info for later use
			return true;
		}
	}
	return false;
}

/**
 * Filter potential pumps (sudden volume + price increase)
 * @param {Object} coin - Coin data
 * @returns {boolean}
 */
function filterPotentialPumps(coin) {
	// High volume + positive 24h change + positive 7d trend
	return (
		coin.volumeToMcap > 0.1 && coin.priceChange24h > 5 && coin.priceChange7d > 0
	);
}

/**
 * Smart filter for finding "sleeping giants"
 * Low recent performance but high volume = accumulation?
 * @param {Object} coin - Coin data
 * @returns {boolean}
 */
function filterSleepingGiants(coin) {
	return (
		coin.priceChange7d < 10 &&
		coin.priceChange7d > -10 &&
		coin.volumeToMcap > 0.08
	);
}

/**
 * Apply multiple filters to a coin
 * @param {Object} coin - Coin data
 * @param {Object} criteria - Filter criteria
 * @returns {boolean}
 */
function applyFilters(coin, criteria = {}) {
	// Zawsze dołączaj BTC
	if (coin.symbol.toUpperCase() === 'BTC') {
		return true;
	}
	const {
		maxPrice = 3,
		minPrice = 0.0001,
		maxRank = 100,
		minVolumeRatio = 0.05,
		min7dChange = -20, // Allow some dips
		excludeStablecoins = true,
		checkRoundNumbers = false,
		onlyPumps = false,
		includeSleeping = false,
	} = criteria;

	// Basic filters
	if (!filterByPrice(coin, maxPrice, minPrice)) return false;
	if (!filterByMarketCapRank(coin, maxRank)) return false;
	if (!filterByVolumeActivity(coin, minVolumeRatio)) return false;
	if (!filterByMomentum(coin, min7dChange)) return false;
	if (excludeStablecoins && !filterOutStablecoins(coin)) return false;

	// Optional filters
	if (checkRoundNumbers && !filterByRoundNumberProximity(coin)) return false;
	if (onlyPumps && !filterPotentialPumps(coin)) return false;

	// Special case: if looking for sleeping giants, override momentum filter
	if (includeSleeping && filterSleepingGiants(coin)) return true;

	return true;
}

/**
 * Filter and sort coins based on criteria
 * @param {Array} coins - Array of coin data
 * @param {Object} criteria - Filter criteria
 * @param {string} sortBy - Sort field (price, volume, momentum, etc.)
 * @param {number} limit - Max results to return
 * @returns {Array} Filtered and sorted coins
 */
function filterAndSort(coins, criteria = {}, sortBy = 'momentum', limit = 20) {
	// Apply filters
	let filtered = coins.filter((coin) => applyFilters(coin, criteria));

	// Sort based on criteria
	switch (sortBy) {
		case 'momentum':
			filtered.sort((a, b) => b.priceChange7d - a.priceChange7d);
			break;
		case 'volume':
			filtered.sort((a, b) => b.volumeToMcap - a.volumeToMcap);
			break;
		case 'price':
			filtered.sort((a, b) => a.price - b.price);
			break;
		case 'rank':
			filtered.sort((a, b) => a.rank - b.rank);
			break;
		case 'pump':
			filtered.sort((a, b) => b.priceChange24h - a.priceChange24h);
			break;
		default:
			filtered.sort((a, b) => b.priceChange7d - a.priceChange7d);
	}

	return filtered.slice(0, limit);
}

/**
 * Get filter statistics for analysis
 * @param {Array} coins - Original coins array
 * @param {Array} filtered - Filtered coins array
 * @returns {Object} Statistics
 */
function getFilterStats(coins, filtered) {
	const avgPrice =
		filtered.reduce((sum, coin) => sum + coin.price, 0) / filtered.length;
	const avg7dChange =
		filtered.reduce((sum, coin) => sum + coin.priceChange7d, 0) /
		filtered.length;
	const avgVolume =
		filtered.reduce((sum, coin) => sum + coin.volumeToMcap, 0) /
		filtered.length;

	return {
		totalCoins: coins.length,
		filteredCoins: filtered.length,
		filterRate: ((filtered.length / coins.length) * 100).toFixed(2) + '%',
		averagePrice: avgPrice.toFixed(4),
		average7dChange: avg7dChange.toFixed(2) + '%',
		averageVolumeRatio: (avgVolume * 100).toFixed(2) + '%',
	};
}

module.exports = {
	filterByPrice,
	filterByMarketCapRank,
	filterByVolumeActivity,
	filterByMomentum,
	filterOutStablecoins,
	filterByRoundNumberProximity,
	filterPotentialPumps,
	filterSleepingGiants,
	applyFilters,
	filterAndSort,
	getFilterStats,
};
