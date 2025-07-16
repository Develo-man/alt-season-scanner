#!/usr/bin/env node

require('dotenv').config();
const {
	getSmartVolumeAnalysis,
	getVolumeProfile,
} = require('../src/apis/binance');

async function testSmartVolume() {
	console.log('🧪 Testing Smart Volume Analysis...\n');

	// Test coins with different characteristics
	const testPairs = [
		{ symbol: 'BTCUSDT', name: 'Bitcoin' },
		{ symbol: 'ETHUSDT', name: 'Ethereum' },
		{ symbol: 'MATICUSDT', name: 'Polygon' },
		{ symbol: 'PEPEUSDT', name: 'Pepe (meme)' },
	];

	for (const pair of testPairs) {
		console.log(`\n📊 Analyzing ${pair.name} (${pair.symbol})`);
		console.log('='.repeat(50));

		try {
			// Smart Volume Analysis
			console.log('\n1️⃣ Smart Volume Analysis (24h):');
			const smartVolume = await getSmartVolumeAnalysis(pair.symbol, 24);

			if (smartVolume) {
				console.log(`   Market Character: ${smartVolume.marketCharacter}`);
				console.log(
					`   Average Trade Size: ${smartVolume.avgTradeSizeFormatted}`
				);
				console.log(`   Total Volume: ${smartVolume.totalVolumeFormatted}`);
				console.log(
					`   Total Trades: ${smartVolume.totalTrades.toLocaleString()}`
				);
				console.log(`   Buy Pressure: ${smartVolume.buyPressure}%`);

				console.log('\n   Trade Size Distribution:');
				Object.entries(smartVolume.categories).forEach(([key, cat]) => {
					if (cat.count > 0) {
						console.log(
							`   - ${cat.label}: ${cat.volumePercent}% volume (${cat.count} trades)`
						);
					}
				});
			} else {
				console.log('   ❌ Could not fetch smart volume data');
			}

			// Volume Profile
			console.log('\n2️⃣ Volume Profile (24x1h):');
			const volumeProfile = await getVolumeProfile(pair.symbol, '1h', 24);

			if (volumeProfile) {
				console.log(
					`   Point of Control: $${volumeProfile.pointOfControl.price.toFixed(
						2
					)} (${volumeProfile.pointOfControl.volumePercent}% volume)`
				);
				console.log(
					`   Value Area: $${volumeProfile.valueArea.low.toFixed(
						2
					)} - $${volumeProfile.valueArea.high.toFixed(2)}`
				);
				console.log(
					`   Current Price: $${volumeProfile.priceRange.current.toFixed(2)}`
				);
				console.log(
					`   Price Range: $${volumeProfile.priceRange.min.toFixed(
						2
					)} - $${volumeProfile.priceRange.max.toFixed(2)}`
				);

				// Show top 3 volume levels
				console.log('\n   Top Volume Levels:');
				const sortedProfile = [...volumeProfile.profile]
					.sort((a, b) => b.volume - a.volume)
					.slice(0, 3);
				sortedProfile.forEach((level, i) => {
					const midPrice = (level.priceFrom + level.priceTo) / 2;
					console.log(
						`   ${i + 1}. $${midPrice.toFixed(2)} (${
							level.volumePercent
						}% volume)`
					);
				});
			} else {
				console.log('   ❌ Could not fetch volume profile');
			}

			// Small delay between requests
			await new Promise((resolve) => setTimeout(resolve, 2000));
		} catch (error) {
			console.error(`❌ Error analyzing ${pair.name}:`, error.message);
		}
	}

	console.log('\n\n✅ Smart Volume Analysis test completed!');
	console.log('\n💡 Interpretacja wyników:');
	console.log('- 🐋 Whale Dominated = Duże transakcje dominują (ostrożnie!)');
	console.log('- 👥 Retail Dominated = Małe transakcje, często FOMO');
	console.log(
		'- POC (Point of Control) = Poziom z największym wolumenem (wsparcie/opór)'
	);
	console.log('- Value Area = Zakres "fair value" gdzie było 70% obrotu');
}

// Run the test
testSmartVolume().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
