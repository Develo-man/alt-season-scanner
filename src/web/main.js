import {
	renderEnhancedResults,
	renderStrategies,
	renderCrossStrategyAnalysis,
	renderStrategyComparison,
	renderEnhancedMarketStatus,
	renderSectorAnalysis,
	displayError,
	setLoadingState,
	initializeStrategyHelp,
} from './ui.js';

// App State
let scannerResults = null;
let currentStrategy = 'MOMENTUM';

// DOM Elements
const elements = {
	btcDominance: document.getElementById('btc-dominance'),
	dominanceChange: document.getElementById('dominance-change'),
	fngValue: document.getElementById('fng-value'),
	fngClassification: document.getElementById('fng-classification'),
	marketCondition: document.getElementById('market-condition'),
	conditionAdvice: document.getElementById('condition-advice'),
	opportunities: document.getElementById('opportunities'),
	lastUpdate: document.getElementById('last-update'),

	// New strategy containers
	strategiesContainer: document.getElementById('strategies-container'),
	crossStrategyContainer: document.getElementById('cross-strategy-container'),
	strategyComparison: document.getElementById('strategy-comparison'),
	strategyRecommendation: document.getElementById('strategy-recommendation'),
	sectorAnalysisGrid: document.getElementById('sector-analysis-grid'),
	loading: document.getElementById('loading'),

	// Legacy (kept for compatibility)
	coinsGrid: document.getElementById('coins-grid'),
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
	loadData();
	initializeStrategyHelp();

	// Auto refresh every 5 minutes
	setInterval(loadData, 5 * 60 * 1000);
});

// Load Data from Enhanced API
async function loadData() {
	setLoadingState(true, elements);
	try {
		const response = await fetch('/api/scanner-results');
		if (!response.ok) {
			throw new Error('HTTP error! status: ' + response.status);
		}
		const data = await response.json();

		// Store results globally
		scannerResults = data;

		// Render everything using the new enhanced UI
		renderEnhancedResults(data, elements);

		// Update last update time
		elements.lastUpdate.textContent = new Date().toLocaleTimeString();

		console.log('📊 Enhanced scanner results loaded:', {
			strategies: data.strategies?.length || 0,
			totalCandidates: data.stats?.totalUniqueCandidates || 0,
			recommendedStrategy: data.marketStatus?.recommendedStrategy || 'none',
		});
	} catch (error) {
		console.error('Error loading data:', error);
		displayError(elements);
	} finally {
		setLoadingState(false, elements);
	}
}

// Strategy switching function (called from UI)
window.switchStrategy = function (strategyKey) {
	currentStrategy = strategyKey;

	// Update UI
	document.querySelectorAll('.strategy-tab').forEach((tab) => {
		tab.classList.remove('active');
	});
	document
		.querySelector('[data-strategy="' + strategyKey + '"]')
		.classList.add('active');

	document.querySelectorAll('.strategy-panel').forEach((panel) => {
		panel.classList.remove('active');
	});
	document
		.querySelector('.strategy-panel[data-strategy="' + strategyKey + '"]')
		.classList.add('active');

	// Analytics
	if (typeof gtag !== 'undefined') {
		gtag('event', 'strategy_switch', {
			strategy: strategyKey,
		});
	}
};

// Export for debugging
window.getScannerResults = () => scannerResults;
window.getCurrentStrategy = () => currentStrategy;
