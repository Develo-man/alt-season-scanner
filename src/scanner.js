require('dotenv').config();
const { getFearAndGreedIndex } = require('./apis/fearAndGreed');
const { getTop100, getBTCDominance } = require('./apis/coingecko');
const { filterAndSort } = require('./utils/filters');
const { checkMultipleCoins } = require('./apis/binance');
const { rankByMomentum } = require('./utils/momentum');

// ASCII Art Banner
console.log(`
╔═══════════════════════════════════════════════════╗
║          ALT SEASON SCANNER v1.2.0                ║
║          Smart Crypto Opportunity Finder          ║
╚═══════════════════════════════════════════════════╝
`);

// Configuration from environment
const CONFIG = {
	maxPrice: parseFloat(process.env.MAX_PRICE) || 3,
	topNCoins: parseInt(process.env.TOP_N_COINS) || 100,
	minVolumeRatio: 0.03,
	min7dChange: -20,
	maxResults: 10,
};

async function main() {
	const startTime = Date.now();

	try {
		// Step 1: Market Overview
		console.log('📊 MARKET ANALYSIS');
		console.log('═'.repeat(50));

		const btcDominance = await getBTCDominance();
		const fearAndGreed = await getFearAndGreedIndex();
		displayMarketConditions(btcDominance, fearAndGreed);

		// Step 2: Fetch and filter data
		console.log('\n📡 DATA COLLECTION');
		console.log('═'.repeat(50));

		const data = await getTop100();
		console.log(`✅ Analyzed ${data.count} top cryptocurrencies`);

		// Apply smart filters
		const criteria = {
			maxPrice: CONFIG.maxPrice,
			maxRank: CONFIG.topNCoins,
			minVolumeRatio: CONFIG.minVolumeRatio,
			min7dChange: CONFIG.min7dChange,
			excludeStablecoins: true,
		};

		const candidates = filterAndSort(data.coins, criteria, 'momentum', 50);
		console.log(`✅ ${candidates.length} coins meet initial criteria`);

		// Step 3: Binance verification
		console.log('\n🔍 EXCHANGE VERIFICATION');
		console.log('═'.repeat(50));

		const symbols = candidates.map((coin) => coin.symbol);
		const binanceData = await checkMultipleCoins(symbols);

		// Combine all data
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

		console.log(`✅ ${coinsWithFullData.length} coins available on Binance`);

		// Step 4: Calculate momentum and rank
		console.log('\n🎯 MOMENTUM ANALYSIS');
		console.log('═'.repeat(50));

		const rankedCoins = rankByMomentum(coinsWithFullData);

		// Display results
		displayTopOpportunities(rankedCoins);
		displayQuickPicks(coinsWithFullData);
		displayMarketSummary(rankedCoins, btcDominance);

		// Execution time
		const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`\n⏱️  Scan completed in ${executionTime} seconds`);
		console.log(`📅 ${new Date().toLocaleString()}\n`);
	} catch (error) {
		console.error('\n❌ ERROR:', error.message);
		console.error('Please check your internet connection and API keys');
		process.exit(1);
	}
}

function displayMarketConditions(btcDominance, fearAndGreed) {
	console.log(`\nBitcoin Dominance: ${btcDominance.toFixed(2)}%`);

	if (fearAndGreed) {
		let emoji = '😐';
		if (fearAndGreed.value > 75) emoji = '🤑';
		else if (fearAndGreed.value > 55) emoji = '🙂';
		else if (fearAndGreed.value < 25) emoji = '😨';
		else if (fearAndGreed.value < 45) emoji = '😟';

		console.log(
			`Fear & Greed Index: ${fearAndGreed.value} (${emoji} ${fearAndGreed.classification})`
		);
	}
	let condition, emoji, advice;

	if (btcDominance > 65) {
		condition = 'BITCOIN SEASON';
		emoji = '🟡';
		advice = 'Alts are bleeding - good for accumulation';
	} else if (btcDominance > 60) {
		condition = 'BTC FAVORED';
		emoji = '🟠';
		advice = 'Challenging for alts - be selective';
	} else if (btcDominance > 55) {
		condition = 'TRANSITIONING';
		emoji = '🟢';
		advice = 'Market shifting - watch for breakouts';
	} else if (btcDominance > 50) {
		condition = 'BALANCED';
		emoji = '🟢';
		advice = 'Good conditions for alt trades';
	} else {
		condition = 'ALT SEASON!';
		emoji = '🚀';
		advice = 'Alts outperforming - ride the wave!';
	}

	console.log(`${emoji} Market Condition: ${condition}`);
	console.log(`💡 Strategy: ${advice}`);
}

function displayTopOpportunities(coins) {
	console.log('\n🏆 TOP OPPORTUNITIES BY MOMENTUM SCORE');
	console.log('═'.repeat(70));
	console.log(
		'Rank | Score | Coin    | Price      | 7d %    | Category    | Signals'
	);
	console.log('─'.repeat(70));

	const top10 = coins.slice(0, CONFIG.maxResults);

	top10.forEach((coin, index) => {
		const rank = String(index + 1).padEnd(4);
		const score = coin.momentum.totalScore.padEnd(5);
		const symbol = coin.symbol.padEnd(7);
		const price = `$${coin.price.toFixed(4)}`.padEnd(10);
		const change7d = `${
			coin.priceChange7d >= 0 ? '+' : ''
		}${coin.priceChange7d.toFixed(1)}%`.padEnd(8);
		const category = `${coin.momentum.emoji} ${coin.momentum.category}`.padEnd(
			11
		);

		console.log(
			`${rank} | ${score} | ${symbol} | ${price} | ${change7d} | ${category} |`
		);

		// Show top 2 signals for each coin
		if (coin.momentum.signals.length > 0) {
			const topSignals = coin.momentum.signals.slice(0, 2);
			topSignals.forEach((signal) => {
				console.log(`     └─ ${signal}`);
			});
		}
	});
}

function displayQuickPicks(coins) {
	console.log('\n⚡ QUICK PICKS BY STRATEGY');
	console.log('═'.repeat(50));

	// Best momentum with good risk/reward
	const balanced = coins
		.filter(
			(c) =>
				c.momentum && c.momentum.totalScore > 40 && c.momentum.riskScore < 40
		)
		.slice(0, 3);

	if (balanced.length > 0) {
		console.log('\n📊 Balanced Risk/Reward:');
		balanced.forEach((coin) => {
			console.log(
				`   ${coin.symbol} - Score: ${coin.momentum.totalScore}, Risk: ${coin.momentum.riskScore}/100`
			);
		});
	}

	// Potential reversal plays
	const reversals = coins
		.filter(
			(c) =>
				c.priceChange24h < -5 && c.priceChange7d > 10 && c.volumeToMcap > 0.1
		)
		.slice(0, 3);

	if (reversals.length > 0) {
		console.log('\n🔄 Potential Reversal Plays:');
		reversals.forEach((coin) => {
			console.log(
				`   ${coin.symbol} - 24h: ${coin.priceChange24h.toFixed(
					1
				)}%, 7d: ${coin.priceChange7d.toFixed(1)}%`
			);
		});
	}

	// Volume anomalies
	const volumeSpikes = coins.filter((c) => c.volumeToMcap > 0.3).slice(0, 3);

	if (volumeSpikes.length > 0) {
		console.log('\n💥 Unusual Volume Activity:');
		volumeSpikes.forEach((coin) => {
			console.log(
				`   ${coin.symbol} - Volume/MCap: ${(coin.volumeToMcap * 100).toFixed(
					1
				)}%`
			);
		});
	}
}

function displayMarketSummary(coins, btcDominance) {
	console.log('\n📈 MARKET SUMMARY');
	console.log('═'.repeat(50));

	// Calculate market stats
	const avgScore =
		coins.reduce((sum, c) => sum + parseFloat(c.momentum.totalScore), 0) /
		coins.length;
	const bullishCoins = coins.filter((c) => c.priceChange7d > 20).length;
	const oversoldCoins = coins.filter((c) => c.priceChange24h < -10).length;

	console.log(`\n📊 Key Metrics:`);
	console.log(`   • Average Momentum Score: ${avgScore.toFixed(1)}/100`);
	console.log(`   • Strongly Bullish (>20% 7d): ${bullishCoins} coins`);
	console.log(`   • Oversold Today (<-10% 24h): ${oversoldCoins} coins`);
	console.log(`   • BTC Dominance: ${btcDominance.toFixed(2)}%`);

	// Market recommendation
	console.log(`\n💡 Market Recommendation:`);
	if (avgScore < 40 && btcDominance > 60) {
		console.log(`   ⚠️  Difficult conditions - Be very selective`);
		console.log(
			`   📌 Focus on: High volume reversals, strong projects on dips`
		);
	} else if (avgScore > 50 && btcDominance < 55) {
		console.log(`   ✅ Good conditions - Multiple opportunities`);
		console.log(`   📌 Focus on: Momentum plays, sector rotations`);
	} else {
		console.log(`   ➡️  Neutral market - Look for specific setups`);
		console.log(
			`   📌 Focus on: Quality over quantity, wait for confirmations`
		);
	}

	// Risk warning
	console.log(`\n⚠️  Risk Reminder:`);
	console.log(`   • Never invest more than you can afford to lose`);
	console.log(`   • This is not financial advice - DYOR`);
	console.log(`   • Use stop losses and manage position sizes`);
}

// Add cleanup for graceful exit
process.on('SIGINT', () => {
	console.log('\n\n👋 Scanner stopped by user');
	process.exit(0);
});

// Run the scanner
main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
