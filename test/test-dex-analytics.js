#!/usr/bin/env node

// test/test-dex-analytics.js
require('dotenv').config();
const {
	test,
	analyzeDEXMetrics,
	batchAnalyzeDEX,
} = require('../src/apis/dexAnalytics');

async function testDEXAnalytics() {
	console.log('🧪 Testing DEX Analytics Integration...\n');

	try {
		// Test 1: Basic API functionality
		console.log('Test 1: Basic DEX Analytics API');
		console.log('='.repeat(50));
		await test();

		// Test 2: Analyze specific tokens
		console.log('\nTest 2: Analyzing specific tokens');
		console.log('='.repeat(50));

		const testTokens = [
			{ symbol: 'PEPE', name: 'Pepe (Meme coin)' },
			{ symbol: 'SHIB', name: 'Shiba Inu' },
			{ symbol: 'UNI', name: 'Uniswap' },
			{ symbol: 'MATIC', name: 'Polygon' },
		];

		for (const token of testTokens) {
			console.log(`\n📊 Analyzing ${token.name} (${token.symbol})`);
			console.log('-'.repeat(40));

			const dexMetrics = await analyzeDEXMetrics(token.symbol);

			if (dexMetrics.hasDEXData) {
				console.log(`✅ DEX Data Found:`);
				console.log(
					`   Total Volume 24h: ${dexMetrics.metrics.volume24hFormatted}`
				);
				console.log(
					`   Total Liquidity: ${dexMetrics.metrics.liquidityFormatted}`
				);
				console.log(`   Buy Pressure: ${dexMetrics.buyPressure}%`);
				console.log(`   Liquidity Score: ${dexMetrics.liquidityScore}/100`);
				console.log(`   Volume Quality: ${dexMetrics.volumeQualityScore}/100`);
				console.log(`   Unique DEXes: ${dexMetrics.uniqueDEXes}`);
				console.log(`   Active Pairs: ${dexMetrics.activePairsCount}`);

				if (dexMetrics.topPairs && dexMetrics.topPairs.length > 0) {
					console.log(`\n   Top DEX Pairs:`);
					dexMetrics.topPairs.slice(0, 2).forEach((pair, i) => {
						console.log(
							`   ${i + 1}. ${pair.dex} (${pair.chain}): ${pair.volume24h} volume, ${pair.liquidity} liquidity`
						);
					});
				}
			} else {
				console.log(`❌ No DEX data: ${dexMetrics.error}`);
			}

			// Small delay to respect rate limits
			await new Promise((resolve) => setTimeout(resolve, 1500));
		}

		// Test 3: Batch analysis
		console.log('\n\nTest 3: Batch DEX Analysis');
		console.log('='.repeat(50));

		const batchCoins = [
			{ symbol: 'LINK' },
			{ symbol: 'AAVE' },
			{ symbol: 'SUSHI' },
		];

		console.log(`Batch analyzing ${batchCoins.length} coins...`);
		const batchResults = await batchAnalyzeDEX(batchCoins);

		console.log('\nBatch Results Summary:');
		Object.entries(batchResults).forEach(([symbol, data]) => {
			if (data.hasDEXData) {
				console.log(
					`✅ ${symbol}: ${data.metrics.volume24hFormatted} volume, ${data.uniqueDEXes} DEXes`
				);
			} else {
				console.log(`❌ ${symbol}: No DEX data`);
			}
		});

		// Test 4: DEX Scoring Integration
		console.log('\n\nTest 4: DEX Scoring Integration');
		console.log('='.repeat(50));

		// Import DEX scoring functions
		const {
			calculateDEXScore,
			generateDEXSignals,
		} = require('../src/utils/dexScoring');

		// Test with PEPE data
		const pepeData = batchResults['PEPE'] || (await analyzeDEXMetrics('PEPE'));

		if (pepeData.hasDEXData) {
			const dexScore = calculateDEXScore(pepeData);
			const dexSignals = generateDEXSignals(pepeData, { symbol: 'PEPE' });

			console.log(`PEPE DEX Score: ${dexScore}/100`);
			console.log(`DEX Signals:`);
			dexSignals.forEach((signal) => console.log(`  ${signal}`));
		}

		console.log('\n✅ All DEX Analytics tests completed successfully!');

		console.log('\n💡 Next Steps:');
		console.log('1. Update .env with any DEX API keys if needed');
		console.log('2. Run: npm run scan to test full integration');
		console.log('3. Check web interface for DEX data display');
		console.log('4. Monitor DEX Analytics performance');
	} catch (error) {
		console.error('\n❌ DEX Analytics test failed:', error.message);
		console.log('\n🔍 Troubleshooting:');
		console.log('1. Check internet connection');
		console.log('2. Verify DEXScreener API is accessible');
		console.log('3. Check for API rate limits');
		console.log('4. Try again in a few minutes');
	}
}

// Performance test
async function performanceTest() {
	console.log('\n🚀 DEX Analytics Performance Test');
	console.log('='.repeat(50));

	const startTime = Date.now();

	// Test batch processing of 10 coins
	const testCoins = [
		'BTC',
		'ETH',
		'MATIC',
		'UNI',
		'LINK',
		'AAVE',
		'SUSHI',
		'PEPE',
		'SHIB',
		'DOGE',
	].map((symbol) => ({ symbol }));

	console.log(`Testing batch analysis of ${testCoins.length} coins...`);

	try {
		const results = await batchAnalyzeDEX(testCoins);
		const endTime = Date.now();
		const duration = (endTime - startTime) / 1000;

		const successCount = Object.values(results).filter(
			(r) => r.hasDEXData
		).length;

		console.log(`\n📊 Performance Results:`);
		console.log(`   Total time: ${duration.toFixed(2)} seconds`);
		console.log(
			`   Average per coin: ${(duration / testCoins.length).toFixed(2)} seconds`
		);
		console.log(
			`   Success rate: ${successCount}/${testCoins.length} (${((successCount / testCoins.length) * 100).toFixed(1)}%)`
		);
		console.log(`   Failed coins: ${testCoins.length - successCount}`);

		if (duration > 60) {
			console.log('\n⚠️  Consider optimizing batch size or adding more delays');
		} else {
			console.log('\n✅ Performance looks good!');
		}
	} catch (error) {
		console.error('Performance test failed:', error.message);
	}
}

// Main execution
async function main() {
	await testDEXAnalytics();

	// Ask user if they want to run performance test
	console.log('\n❓ Run performance test? (This will take ~1-2 minutes)');
	console.log('   Press Ctrl+C to skip, or wait 5 seconds to continue...');

	// Wait 5 seconds, then run performance test
	await new Promise((resolve) => setTimeout(resolve, 5000));
	await performanceTest();
}

// Run the tests
main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
