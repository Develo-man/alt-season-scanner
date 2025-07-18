require('dotenv').config();
const { getKlines } = require('../src/apis/binance');
const { calculateAccumulationScore } = require('../src/utils/accumulation'); // Zmieniono import

async function testAccumulation() {
	console.log('🧪 Testing Accumulation Detection...\n');
	const testSymbol = 'MATICUSDT';
	const testCoin = {
		/* ... */
	};

	try {
		console.log(`Fetching data for ${testSymbol}...`);
		const klines = await getKlines(testSymbol, '1d', 14);
		// Zakładając, że whaleData jest opcjonalne lub pobierane w inny sposób
		const whaleData = null;

		const accumulation = calculateAccumulationScore(
			testCoin,
			klines,
			whaleData
		);

		console.log('\n🎯 Accumulation Analysis:');
		console.log('Score:', accumulation.score);
		// ... (reszta bez zmian)
		console.log('\n✅ Test completed successfully!');
	} catch (error) {
		console.error('❌ Test failed:', error.message);
	}
}

testAccumulation();
