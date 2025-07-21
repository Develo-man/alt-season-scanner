/**
 * ACTION SIGNALS - konkretne akcje do wykonania
 * "Kup teraz" / "Poczekaj na dip" / "Skip"
 */

/**
 * GŁÓWNA FUNKCJA - generuje konkretny sygnał akcji
 */
function generateActionSignal(coin, marketConditions) {
	const momentum = coin.momentum || {};
	const timing = momentum.timing || {};
	const momentumScore = parseFloat(momentum.totalScore || 0);
	const timingScore = timing.timingScore || 50;
	const riskScore = momentum.riskScore || 50;

	// Zbierz wszystkie czynniki
	const factors = analyzeFactors(
		coin,
		marketConditions,
		momentumScore,
		timingScore,
		riskScore
	);

	// Podejmij decyzję
	const decision = makeDecision(factors);

	// Wygeneruj szczegóły
	const details = generateActionDetails(decision, factors, coin);

	return {
		action: decision.action,
		signal: decision.signal,
		confidence: decision.confidence,
		reasoning: details.reasoning,
		entryStrategy: details.entryStrategy,
		exitStrategy: details.exitStrategy,
		positionSize: details.positionSize,
		timeframe: details.timeframe,
		warnings: details.warnings,
	};
}

/**
 * ANALIZA CZYNNIKÓW
 */
function analyzeFactors(
	coin,
	marketConditions,
	momentumScore,
	timingScore,
	riskScore
) {
	const factors = {
		// Scores
		momentum: momentumScore,
		timing: timingScore,
		risk: riskScore,

		// Market conditions
		btcDominance: parseFloat(marketConditions.btcDominance || 60),
		fearGreed: marketConditions.fearAndGreed?.value || 50,

		// Coin specifics
		priceChange7d: coin.priceChange7d || 0,
		priceChange24h: coin.priceChange24h || 0,
		volumeRatio: coin.volumeToMcap || 0,
		rank: coin.rank || 999,

		// Technical
		nearSupport: isNearSupport(coin),
		nearResistance: isNearResistance(coin),
		hasVolume: (coin.volumeToMcap || 0) > 0.05,

		// Flags
		isOverheated: (coin.priceChange7d || 0) > 40,
		isOversold: (coin.priceChange7d || 0) < -20,
		isStable: Math.abs(coin.priceChange24h || 0) < 5,

		// Quality
		isTopTier: coin.rank <= 50,
		hasLiquidity: (coin.volumeToMcap || 0) > 0.03,
		onBinance: coin.binance?.isListed || false,
	};

	return factors;
}

/**
 * PODEJMIJ DECYZJĘ
 */
function makeDecision(f) {
	// 🟢 BUY NOW - wszystko się zgadza
	if (f.momentum > 65 && f.timing > 65 && f.risk < 50 && !f.isOverheated) {
		return {
			action: 'BUY_NOW',
			signal: '🟢 KUP TERAZ',
			confidence: 'HIGH',
		};
	}

	// 🟢 BUY - dobre warunki ale nie idealne
	if (f.momentum > 55 && f.timing > 55 && f.risk < 60 && f.hasLiquidity) {
		return {
			action: 'BUY',
			signal: '🟢 MOŻNA KUPIĆ',
			confidence: 'MEDIUM',
		};
	}

	// 🟡 WAIT_FOR_DIP - dobry coin ale zły timing
	if (
		f.momentum > 60 &&
		(f.timing < 50 || f.isOverheated || f.nearResistance)
	) {
		return {
			action: 'WAIT_FOR_DIP',
			signal: '🟡 POCZEKAJ NA DIP',
			confidence: 'MEDIUM',
		};
	}

	// 🟡 WAIT_BETTER_TIMING - wszystko OK ale timing zły
	if (f.momentum > 50 && f.timing < 40 && f.btcDominance > 65) {
		return {
			action: 'WAIT_BETTER_TIMING',
			signal: '🟡 POCZEKAJ NA LEPSZY MOMENT',
			confidence: 'MEDIUM',
		};
	}

	// 🔴 SKIP_HIGH_RISK - za ryzykowne
	if (f.risk > 70 || !f.onBinance || !f.hasLiquidity) {
		return {
			action: 'SKIP_HIGH_RISK',
			signal: '🔴 POMIŃ - ZA RYZYKOWNE',
			confidence: 'HIGH',
		};
	}

	// 🔴 SKIP_WEAK - słabe fundamenty
	if (f.momentum < 40 || (f.timing < 40 && f.momentum < 50)) {
		return {
			action: 'SKIP_WEAK',
			signal: '🔴 POMIŃ - SŁABE SYGNAŁY',
			confidence: 'HIGH',
		};
	}

	// 🟡 Default - obserwuj
	return {
		action: 'WATCH',
		signal: '🟡 OBSERWUJ',
		confidence: 'LOW',
	};
}

/**
 * GENERUJ SZCZEGÓŁY AKCJI
 */
function generateActionDetails(decision, factors, coin) {
	const details = {
		reasoning: [],
		entryStrategy: '',
		exitStrategy: '',
		positionSize: '0%',
		timeframe: '',
		warnings: [],
	};

	switch (decision.action) {
		case 'BUY_NOW':
			details.reasoning = [
				`Wysokie momentum (${factors.momentum}/100)`,
				`Doskonały timing (${factors.timing}/100)`,
				`Akceptowalne ryzyko (${factors.risk}/100)`,
			];
			details.entryStrategy =
				'Market order lub limit lekko powyżej aktualnej ceny';
			details.exitStrategy = `Take profit: +25-40%, Stop loss: -15%`;
			details.positionSize = factors.isTopTier ? '3-5%' : '2-4%';
			details.timeframe = '2-8 tygodni';

			if (factors.isOverheated) {
				details.warnings.push('Coin niedawno rósł - może potrzebować korekty');
			}
			break;

		case 'BUY':
			details.reasoning = [
				`Dobre momentum (${factors.momentum}/100)`,
				`OK timing (${factors.timing}/100)`,
				'Fundamenty w porządku',
			];
			details.entryStrategy = 'Limit order przy support lub na niewielkim dip';
			details.exitStrategy = `Take profit: +20-30%, Stop loss: -12%`;
			details.positionSize = factors.isTopTier ? '2-3%' : '1-2%';
			details.timeframe = '3-10 tygodni';
			break;

		case 'WAIT_FOR_DIP':
			details.reasoning = [
				'Dobry coin ale może być przegrzany',
				factors.nearResistance ? 'Blisko resistance level' : '',
				factors.isOverheated
					? `Duży wzrost (+${factors.priceChange7d.toFixed(1)}% w tygodniu)`
					: '',
			].filter(Boolean);
			details.entryStrategy = `Czekaj na spadek do ${estimateGoodEntry(coin)}`;
			details.exitStrategy = 'Standardowe level - zależy od entry';
			details.positionSize = 'Przygotuj 2-4% ale czekaj';
			details.timeframe = 'Czekaj 1-3 tygodnie na korektę';

			details.warnings.push('Ustaw alerty cenowe zamiast kupować teraz');
			break;

		case 'WAIT_BETTER_TIMING':
			details.reasoning = [
				'Coin OK ale warunki rynkowe słabe',
				`BTC dominance za wysoka (${factors.btcDominance.toFixed(1)}%)`,
				'Lepiej poczekać na alt season',
			];
			details.entryStrategy = 'Czekaj aż BTC dominance spadnie poniżej 58%';
			details.positionSize = 'Na razie 0% - dodaj do watchlist';
			details.timeframe = 'Może kilka miesięcy';
			break;

		case 'SKIP_HIGH_RISK':
			details.reasoning = [
				factors.risk > 70 ? `Bardzo wysokie ryzyko (${factors.risk}/100)` : '',
				!factors.onBinance ? 'Nie ma na Binance' : '',
				!factors.hasLiquidity ? 'Słaba płynność' : '',
				factors.rank > 200 ? `Niska pozycja (#${factors.rank})` : '',
			].filter(Boolean);
			details.entryStrategy = 'Nie wchodź';
			details.positionSize = '0%';
			details.timeframe = 'Znajdź lepszą okazję';

			details.warnings.push('Za dużo czerwonych flag - pomiń');
			break;

		case 'SKIP_WEAK':
			details.reasoning = [
				`Słabe momentum (${factors.momentum}/100)`,
				`Zły timing (${factors.timing}/100)`,
				'Brak przekonujących sygnałów',
			];
			details.entryStrategy = 'Nie wchodź';
			details.positionSize = '0%';
			details.timeframe = 'Poszukaj innych okazji';
			break;

		case 'WATCH':
		default:
			details.reasoning = ['Mieszane sygnały', 'Potrzeba więcej danych'];
			details.entryStrategy = 'Obserwuj, nie działaj';
			details.positionSize = '0%';
			details.timeframe = 'Czekaj na clearer signals';
			break;
	}

	return details;
}

/**
 * HELPER FUNCTIONS
 */
function isNearSupport(coin) {
	if (!coin.volumeProfile) return false;

	const currentPrice = coin.price;
	const valueAreaLow = coin.volumeProfile.valueArea.low;
	const pocPrice = coin.volumeProfile.pointOfControl.price;

	// Blisko value area low lub POC
	return (
		Math.abs((currentPrice - valueAreaLow) / valueAreaLow) < 0.05 ||
		Math.abs((currentPrice - pocPrice) / pocPrice) < 0.03
	);
}

function isNearResistance(coin) {
	if (!coin.volumeProfile) return false;

	const currentPrice = coin.price;
	const valueAreaHigh = coin.volumeProfile.valueArea.high;

	// Blisko value area high
	return Math.abs((currentPrice - valueAreaHigh) / valueAreaHigh) < 0.05;
}

function estimateGoodEntry(coin) {
	const currentPrice = coin.price;
	const change7d = coin.priceChange7d || 0;

	// Jeśli mocno urósł, szacuj korektę 15-25%
	if (change7d > 30) {
		const correctionPrice = currentPrice * 0.8; // -20%
		return `$${correctionPrice.toFixed(4)}`;
	}

	// Jeśli ma volume profile, użyj POC
	if (coin.volumeProfile) {
		const pocPrice = coin.volumeProfile.pointOfControl.price;
		if (pocPrice < currentPrice) {
			return `$${pocPrice.toFixed(4)} (POC level)`;
		}
	}

	// Default - 10% taniej
	return `$${(currentPrice * 0.9).toFixed(4)}`;
}

module.exports = {
	generateActionSignal,
};
