require('dotenv').config();

// Import
const { runScanner } = require('./core/scannerLogic');

/**
 * Wyświetla ogólne warunki rynkowe w konsoli.
 * @param {Object} marketStatus - Obiekt z danymi o stanie rynku.
 */
function displayMarketConditions(marketStatus) {
	console.log('\n📊 WARUNKI RYNKOWE');
	console.log('═'.repeat(50));
	console.log(`   Dominacja BTC: ${marketStatus.btcDominance}%`);
	if (marketStatus.fearAndGreed) {
		let emoji = '😐';
		if (marketStatus.fearAndGreed.value > 75) emoji = '🤑';
		else if (marketStatus.fearAndGreed.value > 55) emoji = '🙂';
		else if (marketStatus.fearAndGreed.value < 25) emoji = '😨';
		else if (marketStatus.fearAndGreed.value < 45) emoji = '😟';
		console.log(
			`   Fear & Greed: ${marketStatus.fearAndGreed.value} (${emoji} ${marketStatus.fearAndGreed.classification})`
		);
	}
	console.log(`   Faza rynku: ${marketStatus.condition}`);
	console.log(`   Porada strategiczna: ${marketStatus.advice}`);
}

/**
 * Wyświetla analizę sektorów w formie tabeli.
 * @param {Array} sectorAnalysis - Posortowana tablica z danymi o sektorach.
 */
function displaySectorAnalysis(sectorAnalysis) {
	if (!sectorAnalysis || sectorAnalysis.length === 0) return;
	console.log('\n📈 ANALIZA SEKTORÓW');
	console.log('═'.repeat(70));
	console.log('Sektor            | Śr. Wynik | Monety | Gorące | Lider');
	console.log('─'.repeat(70));

	sectorAnalysis.forEach((sector) => {
		const name = sector.name.padEnd(17);
		const avgScore = sector.averageScore.toFixed(2).padEnd(9);
		const coinCount = String(sector.coinCount).padEnd(6);
		const hotCoins = String(sector.hotCoins).padEnd(6);
		const topPerformer = `${sector.topCoin.symbol} (${parseFloat(sector.topCoin.momentum.totalScore).toFixed(0)})`;

		console.log(
			`${name} | ${avgScore} | ${coinCount} | ${hotCoins} | ${topPerformer}`
		);
	});
}

/**
 * Wyświetla sformatowaną listę najlepszych kryptowalut.
 * @param {Array} coins - Tablica z danymi monet do wyświetlenia.
 */
function displayTopOpportunities(coins) {
	console.log('\n🏆 GŁÓWNE OKAZJE (TOP 10)');
	console.log('═'.repeat(80));
	console.log(
		'Rank | Symbol   | Cena       | Zmiana 7D | Wynik Mom. | Kategoria     | Sygnały'
	);
	console.log('─'.repeat(80));

	coins.slice(0, 10).forEach((coin, index) => {
		const rank = String(index + 1).padEnd(4);
		const symbol = coin.symbol.padEnd(8);
		const price = `$${coin.price.toFixed(4)}`.padEnd(10);
		const change7d =
			`${coin.priceChange7d >= 0 ? '+' : ''}${coin.priceChange7d.toFixed(1)}%`.padEnd(
				11
			);
		const score = coin.momentum.totalScore.padEnd(10);
		const category = `${coin.momentum.emoji} ${coin.momentum.category}`.padEnd(
			13
		);

		console.log(
			`${rank} | ${symbol} | ${price} | ${change7d} | ${score} | ${category} |`
		);

		// Wyświetl do 2 sygnałów dla każdej monety
		if (coin.momentum.signals && coin.momentum.signals.length > 0) {
			const topSignals = coin.momentum.signals.slice(0, 2);
			topSignals.forEach((signal) => {
				console.log(`     └─ ${signal}`);
			});
		}
	});
}

/**
 * Główna funkcja uruchamiająca skaner z linii komend.
 */
async function main() {
	const startTime = Date.now();
	console.log(`
╔═══════════════════════════════════════════════════╗
║        ALT SEASON SCANNER v1.3.0 (CLI Mode)       ║
╚═══════════════════════════════════════════════════╝
    `);

	try {
		// Uruchomienie scentralizowanej logiki
		const results = await runScanner();

		// Przekazanie wyników do funkcji wyświetlających
		console.log('\n✅ Skanowanie zakończone. Oto podsumowanie:');
		displayMarketConditions(results.marketStatus);
		displaySectorAnalysis(results.sectorAnalysis);
		displayTopOpportunities(results.coins);

		const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(
			`\nStats: Przeanalizowano ${results.totalAnalyzed}, odfiltrowano ${results.totalFiltered}, na Binance ${results.totalOnBinance}.`
		);
		console.log(`\n⏱️  Całe skanowanie zajęło ${executionTime} sekund.`);
	} catch (error) {
		console.error('\n❌ WYSTĄPIŁ KRYTYCZNY BŁĄD:');
		console.error(error.message);
		process.exit(1);
	}
}

// Uruchomienie głównej funkcji
main();
