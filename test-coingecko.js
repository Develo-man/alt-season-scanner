// Quick test script for CoinGecko API
// Run with: node test-coingecko.js

require('dotenv').config();
const { test } = require('./src/apis/coingecko');

console.log('🔧 Testing CoinGecko Integration...\n');

// Check if API key is set
if (!process.env.COINGECKO_API_KEY) {
	console.log('⚠️  Warning: No CoinGecko API key found in .env');
	console.log('   The API will work but with stricter rate limits\n');
}

// Run the test
test()
	.then(() => {
		console.log('\n🎉 CoinGecko integration is working!');
		console.log('📝 You can now run: npm run scan');
	})
	.catch((error) => {
		console.error('\n❌ Test failed:', error.message);
		console.log('\n🔍 Troubleshooting tips:');
		console.log('1. Check your internet connection');
		console.log('2. Verify API key in .env file');
		console.log('3. Try again in a few seconds (rate limit)');
	});
