/**
 * Analyses and groups coins by sector, calculating key metrics.
 * @param {Array} rankedCoins - Sorted coin array with momentum data.
 * @returns {Array} - An array of analysed sectors, sorted by score.
 */
function analyzeSectors(rankedCoins) {
	const sectors = {};

	for (const coin of rankedCoins) {
		if (coin.sector === 'Unknown') continue;

		if (!sectors[coin.sector]) {
			sectors[coin.sector] = {
				coins: [],
				totalScore: 0,
				hotCoins: 0, //  Coins with score > 60
			};
		}

		sectors[coin.sector].coins.push(coin);
		sectors[coin.sector].totalScore += parseFloat(coin.momentum.totalScore);
		if (parseFloat(coin.momentum.totalScore) >= 60) {
			sectors[coin.sector].hotCoins++;
		}
	}

	const sectorArray = Object.entries(sectors).map(([name, data]) => {
		const coinCount = data.coins.length;
		const averageScore = data.totalScore / coinCount;
		return {
			name,
			coinCount,
			averageScore,
			hotCoins: data.hotCoins,
			topCoin: data.coins[0], // First coin is best in sector
		};
	});

	// Sort sectors by average score
	return sectorArray.sort((a, b) => b.averageScore - a.averageScore);
}

module.exports = {
	analyzeSectors,
};
