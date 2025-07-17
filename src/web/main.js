import {
	updateMarketStatus,
	renderSectorAnalysis,
	renderCoins,
	displayError,
	setLoadingState,
} from './ui.js';

// App State
let allCoinsData = [];
let currentFilter = 'all';

// DOM Elements
const elements = {
	btcDominance: document.getElementById('btc-dominance'),
	dominanceChange: document.getElementById('dominance-change'),
	fngValue: document.getElementById('fng-value'),
	fngClassification: document.getElementById('fng-classification'),
	marketCondition: document.getElementById('market-condition'),
	conditionAdvice: document.getElementById('condition-advice'),
	opportunities: document.getElementById('opportunities'),
	sectorAnalysisGrid: document.getElementById('sector-analysis-grid'),
	lastUpdate: document.getElementById('last-update'),
	coinsGrid: document.getElementById('coins-grid'),
	loading: document.getElementById('loading'),
	filterButtons: document.querySelectorAll('.filter-btn'),
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
	loadData();
	setupEventListeners();
	// Auto refresh every 5 minutes
	setInterval(loadData, 5 * 60 * 1000);
});

// Setup Event Listeners
function setupEventListeners() {
	elements.filterButtons.forEach((btn) => {
		btn.addEventListener('click', (e) => {
			currentFilter = e.currentTarget.dataset.filter;
			elements.filterButtons.forEach((b) => b.classList.remove('active'));
			e.currentTarget.classList.add('active');
			displayFilteredCoins();
		});
	});
}

// Load Data from API
async function loadData() {
	setLoadingState(true, elements);
	try {
		const response = await fetch('/api/scanner-results');
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();

		allCoinsData = data.coins;
		updateMarketStatus(data.marketStatus, elements, allCoinsData);
		renderSectorAnalysis(data.sectorAnalysis, elements);
		displayFilteredCoins();

		elements.lastUpdate.textContent = new Date().toLocaleTimeString();
	} catch (error) {
		console.error('Error loading data:', error);
		// Zamiast używać danych mockowych, wyświetl błąd
		displayError(elements);
	} finally {
		setLoadingState(false, elements);
	}
}

// Filter and display coins based on the current filter
function displayFilteredCoins() {
    const filteredCoins = filterCoins(allCoinsData); 
    renderCoins(filteredCoins, elements);
}

// Filter Coins Logic
function filterCoins(coins) {
	switch (currentFilter) {
		case 'hot':
			return coins.filter((c) => c.momentum.totalScore >= 60);
		case 'safe':
			return coins.filter((c) => c.momentum.riskScore < 40);
		case 'value':
			return coins.filter((c) => c.price < 1);
		default:
			return coins;
	}
}
