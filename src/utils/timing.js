/**
 * GŁÓWNA FUNKCJA - sprawdza timing dla konkretnego coina
 */
function calculateTimingScore(coin, marketConditions, allCoins = []) {
	console.log(`⏰ Sprawdzam timing dla ${coin.symbol}...`);

	// 1. MACRO TIMING - czy w ogóle czas na alty?
	const macroScore = calculateMacroTiming(marketConditions);

	// 2. COIN TIMING - czy ten konkretny coin w dobrym momencie?
	const coinScore = calculateCoinTiming(coin);

	// 3. SECTOR TIMING - czy sektor w trendzie?
	const sectorScore = calculateSectorTiming(coin, allCoins);

	// 4. TECHNICAL TIMING - poziomy techniczne
	const technicalScore = calculateTechnicalTiming(coin);

	// Średnia ważona
	const finalScore =
		macroScore * 0.3 + // Warunki ogólne (waga bez zmian)
		coinScore * 0.2 + // Kondycja monety (mniejsza waga)
		sectorScore * 0.15 + // Kondycja sektora (mniejsza waga)
		technicalScore * 0.35; // Technika (większa waga)

	const signals = generateTimingSignals(
		macroScore,
		coinScore,
		sectorScore,
		technicalScore
	);
	const recommendation = getTimingRecommendation(finalScore);

	return {
		timingScore: Math.round(finalScore),
		recommendation: recommendation,
		signals: signals,
		breakdown: {
			macro: Math.round(macroScore),
			coin: Math.round(coinScore),
			sector: Math.round(sectorScore),
			technical: Math.round(technicalScore),
		},
	};
}

/**
 * 1. MACRO TIMING - warunki całego rynku
 */
function calculateMacroTiming(marketConditions) {
	let score = 50; // Start neutralny

	const btcDominance = parseFloat(marketConditions.btcDominance || 60);

	const ssrValue = marketConditions.ssrValue || 20; // Domyślna neutralna/niedźwiedzia wartość

	// BTC Dominance - kluczowy wskaźnik
	if (btcDominance < 45) {
		score += 25; // Peak alt season
	} else if (btcDominance < 52) {
		score += 15; // Alt season
	} else if (btcDominance < 58) {
		score += 10; // OK dla altów
	} else if (btcDominance > 68) {
		score -= 20; // BTC dominuje
	} else if (btcDominance > 62) {
		score -= 10; // Trudno dla altów
	}

	// Fear & Greed - contrarian approach
	if (marketConditions.fearAndGreed) {
		const fng = marketConditions.fearAndGreed.value;
		if (fng < 20)
			score += 15; // Extreme fear = opportunity
		else if (fng < 35)
			score += 10; // Fear = good
		else if (fng > 80)
			score -= 20; // Extreme greed = danger
		else if (fng > 70) score -= 10; // Greed = caution
	}

	//  Analiza Siły Nabywczej (SSR)
	if (ssrValue < 10) {
		score += 20; // Bardzo duża siła nabywcza (bardzo byczo)
	} else if (ssrValue < 15) {
		score += 10; // Dobra siła nabywcza (byczo)
	} else if (ssrValue > 25) {
		score -= 15; // Niska siła nabywcza (niedźwiedzio)
	}

	// Trend dominacji BTC
	const dominanceChange = marketConditions.dominanceChange;
	if (dominanceChange) {
		const change = parseFloat(dominanceChange.replace('%', ''));
		if (change < -1)
			score += 10; // Dominacja spada = good for alts
		else if (change > 1) score -= 10; // Dominacja rośnie = bad for alts
	}

	// Altcoin Season Index
	if (marketConditions.altcoinIndex && marketConditions.altcoinIndex.value) {
		const indexValue = marketConditions.altcoinIndex.value;
		if (indexValue > 75)
			score += 25; // Potwierdzony Altcoin Season
		else if (indexValue > 50) score += 10;
		else if (indexValue < 25) score -= 25; // Sezon Bitcoina
	}

	// Trend ETH/BTC
	if (marketConditions.ethBtcTrend) {
		const trend = marketConditions.ethBtcTrend.trend;
		if (trend === 'STRONG_UP') score += 20;
		else if (trend === 'UP') score += 10;
		else if (trend === 'STRONG_DOWN') score -= 20;
		else if (trend === 'DOWN') score -= 10;
	}

	return Math.max(0, Math.min(100, score));
}

/**
 * 2. COIN TIMING - czy ten konkretny coin w dobrym momencie?
 */
function calculateCoinTiming(coin) {
	let score = 50; // Start neutralny

	const change24h = Math.abs(coin.priceChange24h || 0);
	const change7d = coin.priceChange7d || 0;

	// Sprawdź czy nie jest overheated
	if (change7d > 50) {
		score -= 25; // Za duży pump, może potrzebuje korekty
	} else if (change7d > 30) {
		score -= 15; // Duży pump, ostrożnie
	} else if (change7d > 15) {
		score -= 5; // Umiarkowany pump
	}

	// Sprawdź czy nie jest oversold
	if (change7d < -30) {
		score += 20; // Duży dip, może odbije
	} else if (change7d < -15) {
		score += 10; // Spadek, może okazja
	}

	// Volatility check - czy nie za szalone wahania
	if (change24h > 25) {
		score -= 15; // Za duże wahania = unpredictable
	} else if (change24h < 5 && Math.abs(change7d) < 10) {
		score += 10; // Stabilne = dobry moment na wejście
	}

	// Volume momentum
	const volumeRatio = coin.volumeToMcap || 0;
	if (volumeRatio > 0.2) {
		score += 15; // Duży volume = interest
	} else if (volumeRatio < 0.02) {
		score -= 10; // Mały volume = brak zainteresowania
	}

	return Math.max(0, Math.min(100, score));
}

/**
 * 3. SECTOR TIMING - czy sektor ma momentum? (z analizą trendu)
 */
function calculateSectorTiming(coin, allCoins) {
	if (!coin.sector || coin.sector === 'Unknown' || !allCoins.length) {
		return 50; // Neutral jeśli nie ma danych
	}

	const sectorCoins = allCoins.filter((c) => c.sector === coin.sector);
	if (sectorCoins.length < 3) return 50;

	const sectorPerformance7d =
		sectorCoins.reduce((sum, c) => sum + (c.priceChange7d || 0), 0) /
		sectorCoins.length;
	const sectorPerformance24h =
		sectorCoins.reduce((sum, c) => sum + (c.priceChange24h || 0), 0) /
		sectorCoins.length;

	let score = 50;

	// Istniejąca logika dla 7d performance
	if (sectorPerformance7d > 20) score += 25;
	else if (sectorPerformance7d > 10) score += 15;
	else if (sectorPerformance7d < -15) score -= 20;
	else if (sectorPerformance7d < -5) score -= 10;

	// Bonus za przyspieszający trend
	// Sprawdzamy, czy średni dzienny wzrost z ostatniej doby jest lepszy niż średni dzienny z całego tygodnia
	if (
		sectorPerformance24h > sectorPerformance7d / 7 &&
		sectorPerformance7d > 5
	) {
		score += 15;
	}

	//  Kara za zwalniający trend
	// Jeśli sektor był na plusie w skali tygodnia, ale ostatnia doba jest na minusie
	if (sectorPerformance24h < 0 && sectorPerformance7d > 10) {
		score -= 15;
	}

	// Lider vs maruder (bez zmian)
	const coinPerformance = coin.priceChange7d || 0;
	const relativePerfromance = coinPerformance - sectorPerformance7d;
	if (relativePerfromance < -10) score += 10;
	else if (relativePerfromance > 15) score -= 10;

	return Math.max(0, Math.min(100, score));
}

/**
 * 4. TECHNICAL TIMING - poziomy techniczne
 */
function calculateTechnicalTiming(coin) {
	let score = 50; // Start neutralny

	// Volume Profile analysis
	if (coin.volumeProfile) {
		const vp = coin.volumeProfile;
		const currentPrice = coin.price;
		const pocPrice = vp.pointOfControl.price;
		const valueAreaHigh = vp.valueArea.high;
		const valueAreaLow = vp.valueArea.low;

		// Distance from POC
		const distanceFromPOC =
			Math.abs((currentPrice - pocPrice) / pocPrice) * 100;

		if (distanceFromPOC < 2) {
			score += 20; // Very close to POC = strong level
		} else if (distanceFromPOC < 5) {
			score += 10; // Close to POC
		}

		// Position in Value Area
		if (currentPrice >= valueAreaLow && currentPrice <= valueAreaHigh) {
			score += 15; // In value area = fair price
		} else if (currentPrice < valueAreaLow) {
			score += 10; // Below value area = potential support
		} else if (currentPrice > valueAreaHigh) {
			score -= 10; // Above value area = potential resistance
		}
	}

	// Smart Volume analysis
	if (coin.smartVolume) {
		const sv = coin.smartVolume;
		const whalePercent = parseFloat(sv.categories?.whale?.volumePercent || 0);
		const buyPressure = parseFloat(sv.buyPressure || 50);

		// Whale activity + low price movement = accumulation
		if (whalePercent > 40 && Math.abs(coin.priceChange24h || 0) < 5) {
			score += 15; // Silent accumulation
		}

		// Buy pressure
		if (buyPressure > 60) {
			score += 10; // More buying than selling
		} else if (buyPressure < 40) {
			score -= 10; // More selling than buying
		}
	}

	// Pressure data
	if (coin.pressureData) {
		const buyPressure = parseFloat(coin.pressureData.buyPressure || 50);

		if (buyPressure > 65) {
			score += 10; // Strong buy pressure
		} else if (buyPressure < 35) {
			score -= 10; // Strong sell pressure
		}
	}

	return Math.max(0, Math.min(100, score));
}

/**
 * GENERUJ SYGNAŁY TIMING
 */
function generateTimingSignals(
	macroScore,
	coinScore,
	sectorScore,
	technicalScore
) {
	const signals = [];

	// Macro signals
	if (macroScore > 75) {
		signals.push('🚀 Doskonałe warunki rynkowe dla altcoinów');
	} else if (macroScore < 30) {
		signals.push('⛔ Słabe warunki rynkowe - Bitcoin dominuje');
	}

	// Coin signals
	if (coinScore > 70) {
		signals.push('✅ Coin w dobrym momencie dla wejścia');
	} else if (coinScore < 35) {
		signals.push('⚠️ Coin może być overheated lub w downtrend');
	}

	// Sector signals
	if (sectorScore > 70) {
		signals.push('📈 Sektor ma strong momentum');
	} else if (sectorScore < 35) {
		signals.push('📉 Sektor słaby - może lepszy timing później');
	}

	// Technical signals
	if (technicalScore > 70) {
		signals.push('🎯 Dobra pozycja techniczna dla entry');
	} else if (technicalScore < 35) {
		signals.push('📊 Słaba pozycja techniczna - poczekaj na lepszy poziom');
	}

	return signals;
}

/**
 * REKOMENDACJA TIMING
 */
function getTimingRecommendation(score) {
	if (score > 75) {
		return {
			action: 'BUY NOW',
			confidence: 'HIGH',
			reason: 'Wszystkie czynniki timing wskazują na dobry moment',
		};
	} else if (score > 60) {
		return {
			action: 'GOOD TO BUY',
			confidence: 'MEDIUM',
			reason: 'Dobre warunki timing, można wchodzić',
		};
	} else if (score > 40) {
		return {
			action: 'WAIT FOR BETTER',
			confidence: 'LOW',
			reason: 'Neutralny timing - może lepiej poczekać',
		};
	} else {
		return {
			action: 'AVOID NOW',
			confidence: 'HIGH',
			reason: 'Zły timing - poczekaj na lepsze warunki',
		};
	}
}

/**
 * TIMING MULTIPLIER dla głównego momentum score
 */
function getTimingMultiplier(timingScore) {
	if (timingScore > 80) return 1.3; // Boost +30%
	if (timingScore > 70) return 1.2; // Boost +20%
	if (timingScore > 60) return 1.1; // Boost +10%
	if (timingScore < 30) return 0.7; // Penalty -30%
	if (timingScore < 40) return 0.8; // Penalty -20%
	if (timingScore < 50) return 0.9; // Penalty -10%
	return 1.0; // Neutral
}

// Export functions
module.exports = {
	calculateTimingScore,
	getTimingMultiplier,
	calculateMacroTiming,
	calculateCoinTiming,
	calculateSectorTiming,
	calculateTechnicalTiming,
};
