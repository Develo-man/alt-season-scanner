// Quick test script for Binance API
// Run with: node test-binance.js

require('dotenv').config();
const { test } = require('./src/apis/binance');

console.log('🔧 Testing Binance Integration...\n');

// Note: Binance public API doesn't require API keys for market data
console.log('ℹ️  Note: Using Binance public API (no authentication needed)\n');

// Run the test
test().then(() => {
    console.log('\n🎉 Binance integration is working!');
    console.log('📝 You can now run the full scanner with Binance verification');
}).catch(error => {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔍 Troubleshooting tips:');
    console.log('1. Check your internet connection');
    console.log('2. Binance API might be temporarily down');
    console.log('3. Try again in a few seconds');
});