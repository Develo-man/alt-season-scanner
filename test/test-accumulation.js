require('dotenv').config();
const { getKlines, getWhaleActivity } = require('../src/apis/binance');
const { calculateAccumulationScore } = require('../src/utils/accumulation');

async function testAccumulation() {
	console.log('🧪 Testing Accumulation Detection...\n');

	// Test coin
	const testSymbol = 'MATICUSDT';
	const testCoin = {
		symbol: 'MATIC',
		priceChange24h: 1.5,
		priceChange7d: 5.2,
		volumeToMcap: 0.08,
	};

	try {
		// Fetch data
		console.log(`Fetching data for ${testSymbol}...`);
		const klines = await getKlines(testSymbol, '1d', 14);
		const whaleData = await getWhaleActivity(testSymbol, 500);

		console.log('\n📊 Kline data:', klines.length, 'candles');
		console.log('🐋 Whale data:', whaleData);

		// Calculate accumulation
		const accumulation = calculateAccumulationScore(
			testCoin,
			klines,
			whaleData
		);

		console.log('\n🎯 Accumulation Analysis:');
		console.log('Score:', accumulation.score);
		console.log('Category:', accumulation.category);
		console.log('Breakdown:', accumulation.breakdown);
		console.log('\nSignals:');
		accumulation.signals.forEach((signal) => console.log(`  ${signal}`));

		console.log('\n✅ Test completed successfully!');
	} catch (error) {
		console.error('❌ Test failed:', error.message);
	}
}

testAccumulation();
