require('dotenv').config();

// Import
const { runScanner, TRADING_STRATEGIES } = require('./core/scannerLogic');

/**
 * Wyświetla ogólne warunki rynkowe w konsoli.
 * @param {Object} marketStatus - Obiekt z danymi o stanie rynku.
 */
function displayEnhancedMarketConditions(marketStatus) {
	console.log('\n📊 WARUNKI RYNKOWE');
	console.log('═'.repeat(70));
	console.log(`   Dominacja BTC: ${marketStatus.btcDominance}%`);
	console.log(`   Zmiana 24h: ${marketStatus.dominanceChange}`);

	if (marketStatus.fearAndGreed) {
		let emoji = '😐';
		const value = marketStatus.fearAndGreed.value;
		if (value > 75) emoji = '🤑';
		else if (value > 55) emoji = '🙂';
		else if (value < 25) emoji = '😨';
		else if (value < 45) emoji = '😟';
		console.log(
			`   Fear & Greed: ${value} (${emoji} ${marketStatus.fearAndGreed.classification})`
		);
	}

	console.log(`   Faza rynku: ${marketStatus.condition}`);
	console.log(`   Strategia: ${marketStatus.advice}`);

	if (marketStatus.recommendedStrategy) {
		const strategy = TRADING_STRATEGIES[marketStatus.recommendedStrategy];
		console.log(`   💡 Rekomendowana: ${strategy.emoji} ${strategy.name}`);
	}
}

function displayStrategyOverview(strategies) {
	console.log('\n🎯 PRZEGLĄD STRATEGII');
	console.log('═'.repeat(70));

	strategies.forEach((strategy, index) => {
		const recommended = strategy.isRecommended ? '⭐' : ' ';
		const performance = strategy.performance || {};

		console.log(`${recommended} ${strategy.emoji} ${strategy.name}`);
		console.log(`   📊 Kandydaci: ${strategy.binanceCandidates} monet`);
		console.log(
			`   📈 Średni Score: ${(performance.avgScore || 0).toFixed(1)}`
		);
		console.log(
			`   🔥 Wysokie Score (≥60): ${performance.strongCandidates || 0} monet`
		);
		console.log(
			`   ⚠️  Średnie Ryzyko: ${(performance.avgRisk || 0).toFixed(1)}/100`
		);
		console.log(`   💡 ${strategy.advice}`);

		if (strategy.topCoin) {
			console.log(
				`   🏆 Champion: ${strategy.topCoin.symbol} (${strategy.topCoin.momentum?.totalScore || 0})`
			);
		}

		if (index < strategies.length - 1) {
			console.log('');
		}
	});
}

/**
 * Display cross-strategy analysis
 */
function displayCrossStrategyAnalysis(crossStrategy) {
	if (!crossStrategy || !crossStrategy.multiStrategyCoins) return;

	console.log('\n🎯 ANALIZA MULTI-STRATEGY');
	console.log('═'.repeat(70));

	// Display insights
	if (crossStrategy.insights && crossStrategy.insights.length > 0) {
		console.log('📊 Kluczowe obserwacje:');
		crossStrategy.insights.forEach((insight) => {
			console.log(`   ${insight}`);
		});
		console.log('');
	}

	// Display multi-strategy coins
	if (crossStrategy.multiStrategyCoins.length > 0) {
		console.log('🏆 Multi-Strategy Champions:');
		console.log('Coin     | Score | Strategies          | 7D Change');
		console.log('-'.repeat(70));

		crossStrategy.multiStrategyCoins.slice(0, 10).forEach((entry) => {
			const coin = entry.coin;
			const symbol = coin.symbol.padEnd(8);
			const score = entry.totalScore.toFixed(0).padEnd(5);
			const strategies = entry.strategies.join(', ').padEnd(18);
			const change = `${coin.priceChange7d >= 0 ? '+' : ''}${(coin.priceChange7d || 0).toFixed(1)}%`;

			console.log(`${symbol} | ${score} | ${strategies} | ${change}`);
		});
	}
}

/**
 * Display strategy details
 */
function displayStrategyDetails(strategy) {
	console.log(`\n${strategy.emoji} ${strategy.name.toUpperCase()}`);
	console.log('═'.repeat(70));
	console.log(`📝 ${strategy.description}`);
	console.log(`💡 ${strategy.advice}`);
	console.log('');

	// Top coins table
	if (strategy.topCoins && strategy.topCoins.length > 0) {
		console.log('🏆 TOP OKAZJE:');
		console.log('Rank | Symbol   | Score | 7D Change | Price     | Sektor');
		console.log('-'.repeat(70));

		strategy.topCoins.slice(0, 10).forEach((coin) => {
			const rank = `#${coin.rank}`.padEnd(4);
			const symbol = coin.symbol.padEnd(8);
			const score = (coin.momentum?.totalScore || 0).toFixed(0).padEnd(5);
			const change =
				`${coin.priceChange7d >= 0 ? '+' : ''}${(coin.priceChange7d || 0).toFixed(1)}%`.padEnd(
					9
				);
			const price = `${coin.price.toFixed(4)}`.padEnd(9);
			const sector = coin.sector || 'Unknown';

			console.log(
				`${rank} | ${symbol} | ${score} | ${change} | ${price} | ${sector}`
			);
		});
	}
}

/**
 * Display sector analysis
 */
function displaySectorAnalysis(sectorData) {
	if (!sectorData || sectorData.length === 0) return;

	console.log('\n📈 ANALIZA SEKTORÓW');
	console.log('═'.repeat(70));
	console.log('Sektor            | Śr. Wynik | Monety | Gorące | Lider');
	console.log('-'.repeat(70));

	sectorData.forEach((sector) => {
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
 * Interactive strategy menu
 */
function displayInteractiveMenu(strategies) {
	console.log('\n🎮 INTERAKTYWNY TRYB - Wybierz strategię:');
	console.log('═'.repeat(50));

	strategies.forEach((strategy, index) => {
		const recommended = strategy.isRecommended ? '⭐' : ' ';
		console.log(
			`${recommended} ${index + 1}. ${strategy.emoji} ${strategy.name} (${strategy.binanceCandidates} monet)`
		);
	});

	console.log('');
	console.log('4. 🎯 Multi-Strategy Analysis');
	console.log('5. 📊 Strategy Comparison');
	console.log('6. 📈 Sector Analysis');
	console.log('0. Exit');
	console.log('');
}

/**
 * Handle user input for interactive mode
 */
function handleUserChoice(choice, strategies, crossStrategy, sectorAnalysis) {
	const choiceNum = parseInt(choice);

	switch (choiceNum) {
		case 1:
		case 2:
		case 3:
			if (strategies[choiceNum - 1]) {
				displayStrategyDetails(strategies[choiceNum - 1]);
			}
			break;
		case 4:
			displayCrossStrategyAnalysis(crossStrategy);
			break;
		case 5:
			displayStrategyComparison(strategies);
			break;
		case 6:
			displaySectorAnalysis(sectorAnalysis);
			break;
		case 0:
			console.log('\n👋 Dziękuję za użycie Alt Season Scanner!');
			process.exit(0);
			break;
		default:
			console.log('❌ Nieprawidłowy wybór. Spróbuj ponownie.');
	}
}

/**
 * Display strategy comparison
 */
function displayStrategyComparison(strategies) {
	console.log('\n📊 PORÓWNANIE STRATEGII');
	console.log('═'.repeat(80));

	console.log(
		'Strategy          | Kandydaci | Śr.Score | Wysokie | Śr.Ryzyko | Status'
	);
	console.log('-'.repeat(80));

	strategies.forEach((strategy) => {
		const name = strategy.name.padEnd(17);
		const candidates = String(strategy.binanceCandidates).padEnd(9);
		const avgScore = (strategy.performance?.avgScore || 0).toFixed(1).padEnd(8);
		const strongCandidates = String(
			strategy.performance?.strongCandidates || 0
		).padEnd(7);
		const avgRisk = (strategy.performance?.avgRisk || 0).toFixed(1).padEnd(9);
		const status = strategy.isRecommended ? '⭐ Rekomendowana' : '';

		console.log(
			`${name} | ${candidates} | ${avgScore} | ${strongCandidates} | ${avgRisk} | ${status}`
		);
	});

	console.log('\n💡 Interpretacja:');
	console.log('• Kandydaci: Liczba monet spełniających kryteria strategii');
	console.log('• Śr.Score: Średni momentum score (0-100)');
	console.log('• Wysokie: Monety z score ≥60 (najlepsze okazje)');
	console.log('• Śr.Ryzyko: Średni wskaźnik ryzyka (0-100, niższe = lepsze)');
}

/**
 * Enhanced main function with interactive mode
 */
async function main() {
	const args = process.argv.slice(2);
	const interactive = args.includes('--interactive') || args.includes('-i');
	const strategy = args
		.find((arg) => arg.startsWith('--strategy='))
		?.split('=')[1];

	const startTime = Date.now();

	console.log(`
╔═══════════════════════════════════════════════════╗
║     ALT SEASON SCANNER v2.0 - TRIPLE STRATEGY    ║
╚═══════════════════════════════════════════════════╝
    `);

	try {
		// Run enhanced scanner
		const results = await runScanner();

		// Display market conditions
		displayEnhancedMarketConditions(results.marketStatus);

		// Display strategy overview
		displayStrategyOverview(results.strategies);

		// Display cross-strategy analysis
		displayCrossStrategyAnalysis(results.crossStrategy);

		// Show execution stats
		const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`\n📊 STATYSTYKI WYKONANIA`);
		console.log('═'.repeat(50));
		console.log(`⏱️  Czas wykonania: ${executionTime}s`);
		console.log(`🔍 Przeanalizowano: ${results.stats.totalAnalyzed} monet`);
		console.log(
			`🎯 Unikalne kandydaci: ${results.stats.totalUniqueCandidates}`
		);
		console.log(`🏪 Z danymi DEX: ${results.stats.totalWithDEXData}`);
		console.log(`📈 Średnie score według strategii:`);

		Object.entries(results.stats.avgMomentumByStrategy).forEach(
			([strategyKey, avgScore]) => {
				const strategy = TRADING_STRATEGIES[strategyKey];
				if (strategy) {
					console.log(
						`   ${strategy.emoji} ${strategyKey}: ${avgScore.toFixed(1)}`
					);
				}
			}
		);

		// Interactive mode
		if (interactive) {
			const readline = require('readline');
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			const askQuestion = () => {
				displayInteractiveMenu(results.strategies);

				rl.question('Wybierz opcję (0-6): ', (answer) => {
					handleUserChoice(
						answer,
						results.strategies,
						results.crossStrategy,
						results.sectorAnalysis
					);

					if (answer !== '0') {
						console.log('\nNaciśnij Enter aby kontynuować...');
						rl.question('', () => {
							askQuestion();
						});
					} else {
						rl.close();
					}
				});
			};

			askQuestion();
		}
		// Strategy-specific display
		else if (strategy) {
			const selectedStrategy = results.strategies.find(
				(s) => s.key.toLowerCase() === strategy.toLowerCase()
			);

			if (selectedStrategy) {
				displayStrategyDetails(selectedStrategy);
			} else {
				console.log(`\n❌ Strategia '${strategy}' nie została znaleziona.`);
				console.log('Dostępne strategie: momentum, value, balanced');
			}
		}
		// Default: show summary
		else {
			console.log('\n💡 PORADNIK UŻYCIA:');
			console.log(
				'• Uruchom z --interactive aby przejść do trybu interaktywnego'
			);
			console.log(
				'• Użyj --strategy=momentum/value/balanced aby zobaczyć konkretną strategię'
			);
			console.log('• Uruchom npm run web aby zobaczyć interfejs webowy');
			console.log('\nPrzykłady:');
			console.log('  npm run scan -- --interactive');
			console.log('  npm run scan -- --strategy=momentum');
			console.log('  npm run scan -- --strategy=value');
		}
	} catch (error) {
		console.error('\n❌ WYSTĄPIŁ KRYTYCZNY BŁĄD:');
		console.error(error.message);

		console.log('\n🔧 DEBUGOWANIE:');
		console.log('• Sprawdź połączenie internetowe');
		console.log('• Zweryfikuj klucze API w pliku .env');
		console.log('• Sprawdź czy wszystkie zależności są zainstalowane');
		console.log('• Uruchom testy: npm run test:all');

		process.exit(1);
	}
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
	displayHelp();
	process.exit(0);
}

// Run the enhanced scanner
main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});

// Export for testing
module.exports = {
	displayEnhancedMarketConditions,
	displayStrategyOverview,
	displayCrossStrategyAnalysis,
	displayStrategyDetails,
	displayStrategyComparison,
};
