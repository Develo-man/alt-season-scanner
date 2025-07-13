// Test script for momentum calculator
// Run with: node test-momentum.js

const { calculateMomentumScore } = require('./src/utils/momentum');

console.log('🧪 Testing Momentum Calculator...\n');

// Mock coin data for testing
const testCoins = [
	{
		name: 'Hot Momentum Coin',
		symbol: 'HOT',
		price: 0.5,
		rank: 45,
		priceChange24h: 15,
		priceChange7d: 65,
		volumeToMcap: 0.25,
		binance: {
			isListed: true,
			binanceTrades24h: 1500000,
			priceRange24h: '22.5%',
		},
	},
	{
		name: 'Steady Grower',
		symbol: 'STEADY',
		price: 1.25,
		rank: 35,
		priceChange24h: 3,
		priceChange7d: 18,
		volumeToMcap: 0.08,
		binance: {
			isListed: true,
			binanceTrades24h: 450000,
			priceRange24h: '8.2%',
		},
	},
	{
		name: 'Risky Pump',
		symbol: 'RISK',
		price: 0.0045,
		rank: 95,
		priceChange24h: -15,
		priceChange7d: 120,
		volumeToMcap: 0.45,
		binance: {
			isListed: true,
			binanceTrades24h: 8000,
			priceRange24h: '45%',
		},
	},
	{
		name: 'Sleeping Giant',
		symbol: 'SLEEP',
		price: 0.89,
		rank: 60,
		priceChange24h: -2,
		priceChange7d: 5,
		volumeToMcap: 0.12,
		nearRoundNumber: 1.0,
		binance: {
			isListed: true,
			binanceTrades24h: 250000,
			priceRange24h: '6%',
		},
	},
];

// Test each coin
console.log('Testing different coin profiles:\n');

testCoins.forEach((coin) => {
	const score = calculateMomentumScore(coin);

	console.log(`${score.emoji} ${coin.symbol} - ${coin.name}`);
	console.log(`   Total Score: ${score.totalScore} (${score.category})`);
	console.log('   Breakdown:');
	console.log(`   - Price Momentum: ${score.breakdown.priceMomentum}`);
	console.log(`   - Volume Activity: ${score.breakdown.volumeActivity}`);
	console.log(`   - Market Position: ${score.breakdown.marketPosition}`);
	console.log(`   - Risk Factor: ${score.breakdown.riskFactor}`);

	if (score.signals.length > 0) {
		console.log('   Signals:');
		score.signals.forEach((signal) => {
			console.log(`   ${signal}`);
		});
	}
	console.log('\n' + '-'.repeat(50) + '\n');
});

// Price Momentum (Impet cenowy) – jak szybko i jak mocno zmienia się cena; wskazuje, czy trend się nasila.
// Volume Activity (Aktywność wolumenu) – jak dużo się handluje danym aktywem; duży wolumen = większe zainteresowanie.
// Market Position (Pozycja na rynku) – miejsce danej kryptowaluty względem innych (np. top 10, ogólna dominacja itp.).
// Risk Factor (Współczynnik ryzyka) – jak bardzo ryzykowna jest inwestycja według danych analitycznych.



// Test coin not on Binance
console.log('Testing coin not on Binance:');
const notListedCoin = {
	name: 'Not Listed ',
	symbol: 'NOPE',
	price: 0.5,
	binance: { isListed: false },
};

const notListedScore = calculateMomentumScore(notListedCoin);
console.log(
	`Result: Score = ${notListedScore.totalScore}, Not Listed = ${notListedScore.notListed}`
);

console.log('\n✅ Momentum calculator tests completed!');
