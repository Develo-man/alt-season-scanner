/**
 * Centralny plik konfiguracyjny dla Alt Season Scanner.
 * Wszystkie "magiczne liczby" i parametry do dostosowania powinny być tutaj.
 */
const config = {
	// --- Ustawienia API ---
	api: {
		coingecko: {
			baseUrl: 'https://api.coingecko.com/api/v3',
			// Klucz API jest nadal w .env dla bezpieczeństwa
		},
		binance: {
			baseUrl: 'https://api.binance.com',
		},
		fearAndGreed: {
			baseUrl: 'https://api.alternative.me/fng/',
		},
		dexScreener: {
			baseUrl: 'https://api.dexscreener.com/latest/dex',
			rateLimitDelay: 1000, // ms
		},
	},

	// --- Ogólne ustawienia skanera ---
	scanner: {
		topNCoins: 100, // Liczba monet do analizy z CoinGecko
		maxResultsPerStrategy: 12, // Ile monet pokazać na strategię
	},

	// --- Ustawienia strategii tradingowych ---
	strategies: {
		MOMENTUM: {
			name: '🚀 MOMENTUM LEADERS',
			description: 'Monety w silnym trendzie wzrostowym',
			emoji: '🚀',
			criteria: {
				maxPrice: 3,
				maxRank: 100,
				minVolumeRatio: 0.04,
				min7dChange: 15,
				max7dChange: 200,
			},
			advice: 'Momentum trading - wskakuj na trendy, ale uważaj na FOMO',
		},
		VALUE: {
			name: '💎 VALUE HUNTERS',
			description: 'Okazje po spadkach - potencjalne odbicia',
			emoji: '💎',
			criteria: {
				maxPrice: 3,
				maxRank: 100,
				minVolumeRatio: 0.03,
				min7dChange: -25,
				max7dChange: 5,
			},
			advice:
				'Value investing - kupuj gdy inni sprzedają, ale sprawdź fundamenty',
		},
		BALANCED: {
			name: '⚖️ BALANCED PLAYS',
			description: 'Stabilne monety w konsolidacji',
			emoji: '⚖️',
			criteria: {
				maxPrice: 3,
				maxRank: 100,
				minVolumeRatio: 0.03,
				min7dChange: -10,
				max7dChange: 20,
			},
			advice: 'Balanced approach - niższe ryzyko, stabilny wzrost',
		},
		HIGH_CAP_GEMS: {
			name: '💎 HIGH-CAP GEMS',
			description:
				'Droższe alty (> $3), które mogą przyciągać kapitał, gdy rynek jest niepewny.',
			emoji: '💎',
			criteria: {
				minPrice: 3,
				maxPrice: 10000,
				maxRank: 75,
				minVolumeRatio: 0.02,
				min7dChange: -15,
				max7dChange: 100,
			},
			advice:
				'Szukaj siły u liderów rynku, gdy altcoiny o niskiej kapitalizacji są zbyt ryzykowne.',
		},
	},

	// Definiuje, które strategie uruchomić w zależności od fazy rynku
	marketPhases: {
		BITCOIN_SEASON: ['VALUE', 'BALANCED', 'HIGH_CAP_GEMS'], // Dominacja > 65%
		TRANSITION: ['BALANCED', 'MOMENTUM', 'VALUE'], // 55% < Dominacja < 65%
		ALT_SEASON: ['MOMENTUM', 'VALUE', 'BALANCED'], // Dominacja < 55%
	},

	// --- Ustawienia monitora dominacji BTC ---
	dominanceMonitor: {
		alertThreshold: 1, // Próg alertu dla zmiany dominacji w 24h (%)
		historyFile: './data/dominance/btc-dominance-history.json',
	},

	// --- Ustawienia analizy DEX ---
	dex: {
		minDailyVolume: 1000, // Minimum $1k dziennego wolumenu
		minLiquidity: 5000, // Minimum $5k płynności
	},
};

module.exports = config;
