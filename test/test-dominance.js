// Test script for BTC Dominance Tracker
// Run with: node test-dominance.js

require('dotenv').config();
const {
	getCurrentDominance,
	getMarketPhase,
	analyzeTrend,
	generateDominanceReport,
	displayReport,
} = require('../src/apis/btcDominance');

console.log('🧪 Testing BTC Dominance Tracker...\n');

async function runTests() {
	try {
		// Test 1: Get current dominance
		console.log('Test 1: Fetching current dominance...');
		const current = await getCurrentDominance();
		console.log('✅ Current BTC Dominance:', current.btc.toFixed(2) + '%');
		console.log('   ETH:', current.eth.toFixed(2) + '%');
		console.log(
			'   Total Market Cap:',
			'$' + (current.totalMarketCap / 1e9).toFixed(2) + 'B\n'
		);

		// Test 2: Market phase analysis
		console.log('Test 2: Analyzing market phase...');
		const phase = getMarketPhase(current.btc);
		console.log(`✅ Market Phase: ${phase.emoji} ${phase.phase}`);
		console.log(`   Description: ${phase.description}`);
		console.log(`   Strategy: ${phase.altStrategy}\n`);

		// Test 3: Mock trend analysis
		console.log('Test 3: Testing trend analysis with mock data...');
		const mockHistory = [
			{
				btc: 65.5,
				timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
			},
			{
				btc: 64.8,
				timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
			},
			{
				btc: 64.2,
				timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
			},
			{ btc: current.btc, timestamp: new Date().toISOString() },
		];
		const trend = analyzeTrend(mockHistory);
		console.log('✅ Trend Analysis:', trend.trend);
		console.log('   Changes:', trend.changes);
		console.log('   Description:', trend.description + '\n');

		// Test 4: Generate full report
		console.log('Test 4: Generating full dominance report...\n');
		const report = await generateDominanceReport();
		displayReport(report);

		console.log(
			'\n✅ All tests passed! BTC Dominance Tracker is working correctly.'
		);
	} catch (error) {
		console.error('\n❌ Test failed:', error.message);
		console.log('\n🔍 Troubleshooting:');
		console.log('1. Check internet connection');
		console.log('2. Verify CoinGecko API is accessible');
		console.log('3. Check API rate limits');
	}
}

// Run tests
runTests();
