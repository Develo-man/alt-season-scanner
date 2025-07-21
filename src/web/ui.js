/**
 * IMPROVED UI.JS - User-Friendly Interface for Alt Season Scanner
 * Focus: Clean, understandable, progressive disclosure
 */

// ========================================
// CONSTANTS AND CONFIGURATION
// ========================================

const UI_CONFIG = {
	animations: {
		enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
		duration: 300,
		stagger: 100,
	},
	thresholds: {
		excellentScore: 70,
		goodScore: 50,
		averageScore: 30,
		highRisk: 70,
		mediumRisk: 40,
	},
	colors: {
		excellent: 'var(--accent-green)',
		good: 'var(--primary-blue)',
		average: 'var(--accent-yellow)',
		poor: 'var(--accent-red)',
	},
};

const STRATEGY_CONFIG = {
	MOMENTUM: {
		name: 'Momentum Leaders',
		emoji: '🚀',
		description: 'Monety w silnym trendzie wzrostowym',
		explanation: 'Szukamy monet, które już rosną i mogą kontynuować wzrost',
		color: 'var(--accent-green)',
		icon: '🚀',
	},
	VALUE: {
		name: 'Value Hunters',
		emoji: '💎',
		description: 'Okazje po spadkach - potencjalne odbicia',
		explanation: 'Szukamy monet po spadkach, które mogą się odbić',
		color: 'var(--accent-yellow)',
		icon: '💎',
	},
	BALANCED: {
		name: 'Balanced Plays',
		emoji: '⚖️',
		description: 'Stabilne monety w konsolidacji',
		explanation: 'Szukamy stabilnych monet z dobrym potencjałem',
		color: 'var(--primary-blue)',
		icon: '⚖️',
	},
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Format numbers in user-friendly way
 */
function formatNumber(num, type = 'default') {
	if (typeof num !== 'number' || isNaN(num)) return '--';

	switch (type) {
		case 'price':
			if (num < 0.001) return num.toFixed(6);
			if (num < 1) return num.toFixed(4);
			if (num < 100) return num.toFixed(3);
			return num.toFixed(2);
		case 'percentage':
			return (num >= 0 ? '+' : '') + num.toFixed(1) + '%';
		case 'score':
			return Math.round(num);
		case 'currency':
			if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
			if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
			if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
			return num.toFixed(0);
		default:
			return num.toLocaleString();
	}
}

/**
 * Get user-friendly interpretation of scores and metrics
 */
function getScoreInterpretation(score, type = 'momentum') {
	switch (type) {
		case 'momentum':
			if (score >= UI_CONFIG.thresholds.excellentScore) {
				return {
					level: 'excellent',
					text: 'Bardzo silny',
					color: 'success',
					emoji: '🔥',
				};
			} else if (score >= UI_CONFIG.thresholds.goodScore) {
				return { level: 'good', text: 'Dobry', color: 'primary', emoji: '👍' };
			} else if (score >= UI_CONFIG.thresholds.averageScore) {
				return {
					level: 'average',
					text: 'Średni',
					color: 'warning',
					emoji: '😐',
				};
			} else {
				return { level: 'poor', text: 'Słaby', color: 'danger', emoji: '👎' };
			}
		case 'risk':
			if (score >= UI_CONFIG.thresholds.highRisk) {
				return {
					level: 'high',
					text: 'Wysokie ryzyko',
					color: 'danger',
					emoji: '⚠️',
					advice: 'Handluj ostrożnie!',
				};
			} else if (score >= UI_CONFIG.thresholds.mediumRisk) {
				return {
					level: 'medium',
					text: 'Średnie ryzyko',
					color: 'warning',
					emoji: '⚡',
					advice: 'Rozważ pozycję',
				};
			} else {
				return {
					level: 'low',
					text: 'Niskie ryzyko',
					color: 'success',
					emoji: '✅',
					advice: 'Akceptowalne',
				};
			}
		default:
			return {
				level: 'unknown',
				text: 'Nieznane',
				color: 'secondary',
				emoji: '❓',
			};
	}
}

/**
 * Get market phase interpretation
 */
function getMarketPhaseInfo(dominance) {
	if (dominance < 50) {
		return {
			phase: 'Alt Season',
			emoji: '🚀',
			color: 'success',
			description: 'Świetny czas na altcoiny!',
			advice: 'Altcoiny rządzą - szukaj dobrych okazji',
		};
	} else if (dominance < 55) {
		return {
			phase: 'Alt Friendly',
			emoji: '📈',
			color: 'primary',
			description: 'Dobre warunki dla altcoinów',
			advice: 'Altcoiny mają przewagę - wybieraj ostrożnie',
		};
	} else if (dominance < 65) {
		return {
			phase: 'BTC Favored',
			emoji: '⚖️',
			color: 'warning',
			description: 'Bitcoin ma przewagę',
			advice: 'Trudne warunki dla altcoinów - bądź selektywny',
		};
	} else {
		return {
			phase: 'BTC Season',
			emoji: '🏔️',
			color: 'danger',
			description: 'Bitcoin dominuje',
			advice: 'Bardzo trudne warunki - rozważ BTC zamiast altcoinów',
		};
	}
}

// ========================================
// PROGRESSIVE DISCLOSURE FUNCTIONS
// ========================================

/**
 * Render strategy preview cards for the strategy picker
 */
function renderStrategyPreviews(strategies) {
	const container = document.getElementById('strategies-preview');
	if (!container || !strategies) return;

	const previewsHTML = strategies
		.map((strategy) => {
			const config = STRATEGY_CONFIG[strategy.key] || {};
			const performance = strategy.performance || {};

			return `
			<div class="strategy-preview-card" onclick="selectStrategy('${strategy.key}')">
				<div class="strategy-header">
					<div class="strategy-emoji">${config.emoji || '📊'}</div>
					<div class="strategy-info">
						<h3>${config.name || strategy.name}</h3>
						<p class="strategy-description">${config.explanation || strategy.description}</p>
					</div>
				</div>
				
				<div class="strategy-stats">
					<div class="stat-item">
						<span class="stat-value">${strategy.binanceCandidates || 0}</span>
						<span class="stat-label">Monet</span>
					</div>
					<div class="stat-item">
						<span class="stat-value">${formatNumber(performance.avgScore || 0, 'score')}</span>
						<span class="stat-label">Śr. Score</span>
					</div>
					<div class="stat-item">
						<span class="stat-value">${performance.strongCandidates || 0}</span>
						<span class="stat-label">Top (≥60)</span>
					</div>
				</div>
				
				<button class="strategy-action">
					Sprawdź ${config.name || strategy.name} →
				</button>
				
				${strategy.isRecommended ? '<div class="recommended-badge">Rekomendowana</div>' : ''}
			</div>
		`;
		})
		.join('');

	container.innerHTML = previewsHTML;
}

function createCoinTableRow(coin, strategy) {
	const momentum = coin.momentum || {};
	const score = parseFloat(momentum.totalScore || 0);
	const scoreInfo = getScoreInterpretation(score, 'momentum');
	const timing = momentum.timing || {};
	const actionSignal = momentum.actionSignal || {};

	return `
        <tr class="coin-row" data-symbol="${coin.symbol}">
            <td>
                <div class="coin-info">
                    <span class="coin-rank">#${coin.rank || '?'}</span>
                    <div class="coin-icon">${coin.symbol.charAt(0)}</div>
                    <div class="coin-details">
                        <span class="coin-symbol">${coin.symbol}</span>
                        <span class="coin-name">${coin.name || 'Unknown'}</span>
                    </div>
                </div>
            </td>
            <td>
                <span class="score-badge score-${scoreInfo.level}" title="Momentum Score: ${score}/100">
                    ${scoreInfo.emoji} ${formatNumber(score, 'score')}
                </span>
            </td>
            <td class="price-cell">$${formatNumber(coin.price, 'price')}</td>
            <td class="${coin.priceChange24h >= 0 ? 'change-positive' : 'change-negative'}">
                ${formatNumber(coin.priceChange24h || 0, 'percentage')}
            </td>
            <td class="${coin.priceChange7d >= 0 ? 'change-positive' : 'change-negative'}">
                ${formatNumber(coin.priceChange7d || 0, 'percentage')}
            </td>
            <td class="hide-mobile">
                <div>${formatNumber((coin.volumeToMcap || 0) * 100, 'percentage')}</div>
                <div class="volume-bar">
                    <div class="volume-fill" style="width: ${Math.min((coin.volumeToMcap || 0) * 500, 100)}%"></div>
                </div>
            </td>
            <td class="hide-mobile">
                <span class="risk-${getRiskLevel(momentum.riskScore)}" title="${generateRiskTooltip(coin)}">
                    ${getRiskIcon(momentum.riskScore)} ${getRiskText(momentum.riskScore)} (${momentum.riskScore || 0})
                </span>
            </td>
            <td class="hide-mobile">
                <div class="timing-signal timing-${getTimingClass(actionSignal)}" title="${actionSignal.entryStrategy || 'Brak strategii'}">
                    ${actionSignal.signal || '🟡 OBSERWUJ'}
                </div>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn primary" onclick="showCoinDetails('${coin.symbol}')">
                        📊 Szczegóły
                    </button>
                    ${
											coin.dexData?.hasDEXData
												? `<button class="action-btn secondary" onclick="showDEXInfo('${coin.symbol}')">🏪 DEX</button>`
												: `<button class="action-btn secondary" disabled title="Brak danych DEX">🏪 DEX</button>`
										}
                </div>
            </td>
        </tr>
    `;
}

/**
 * Render market overview with user-friendly explanations
 */
function renderMarketOverview(marketStatus) {
	const dominance = parseFloat(marketStatus.btcDominance || 0);
	const phaseInfo = getMarketPhaseInfo(dominance);

	// Update DOM elements
	const elements = {
		btcDominance: document.getElementById('btc-dominance'),
		marketPhase: document.getElementById('market-phase'),
		fngValue: document.getElementById('fng-value'),
		fngClassification: document.getElementById('fng-classification'),
		opportunities: document.getElementById('opportunities'),
	};

	if (elements.btcDominance) {
		elements.btcDominance.textContent = `${dominance.toFixed(1)}%`;
	}

	if (elements.marketPhase) {
		elements.marketPhase.innerHTML = `
			<span class="phase-emoji">${phaseInfo.emoji}</span>
			${phaseInfo.phase}
		`;
		elements.marketPhase.className = `status-text phase-${phaseInfo.color}`;
	}

	// Fear & Greed Index
	if (marketStatus.fearAndGreed && elements.fngValue) {
		const fng = marketStatus.fearAndGreed;
		elements.fngValue.textContent = fng.value || '--';
		elements.fngClassification.textContent =
			fng.classification || 'Sprawdzam...';

		// Add color based on value
		if (fng.value) {
			if (fng.value < 25) {
				elements.fngValue.className = 'big-number fear';
			} else if (fng.value > 75) {
				elements.fngValue.className = 'big-number greed';
			} else {
				elements.fngValue.className = 'big-number neutral';
			}
		}
	}

	// Update market recommendation
	updateMarketRecommendation(marketStatus, phaseInfo);
}

/**
 * Update market recommendation section
 */
function updateMarketRecommendation(marketStatus, phaseInfo) {
	const adviceElement = document.getElementById('market-advice');
	const strategyElement = document.getElementById('recommended-strategy');

	if (adviceElement) {
		adviceElement.innerHTML = `
			<strong>${phaseInfo.description}</strong><br>
			${phaseInfo.advice}
		`;
	}

	if (strategyElement && marketStatus.recommendedStrategy) {
		const strategy = STRATEGY_CONFIG[marketStatus.recommendedStrategy];
		if (strategy) {
			strategyElement.innerHTML = `
				<div class="rec-strategy">
					<span class="rec-strategy-emoji">${strategy.emoji}</span>
					<div class="rec-strategy-info">
						<span class="rec-strategy-name">${strategy.name}</span>
						<span class="rec-strategy-reason">${strategy.explanation}</span>
					</div>
				</div>
			`;
		}
	}
}

/**
 * Render enhanced strategies with progressive disclosure
 */
function renderEnhancedStrategies(strategies) {
	const container = document.getElementById('strategies-container');
	if (!container || !strategies) return;

	// First render strategy previews (keep existing preview cards)
	renderStrategyPreviews(strategies);

	// Then render strategy tabs with tables
	const tabsHTML = `
        <div class="strategy-tabs-container">
            <div class="strategy-tabs">
                ${strategies
									.map(
										(strategy, index) => `
                    <button 
                        class="strategy-tab ${index === 0 ? 'active' : ''} ${strategy.isRecommended ? 'recommended' : ''}"
                        data-strategy="${strategy.key}"
                        onclick="switchToStrategy('${strategy.key}')"
                    >
                        <span class="strategy-emoji">${STRATEGY_CONFIG[strategy.key]?.emoji || '📊'}</span>
                        <span class="strategy-name">${STRATEGY_CONFIG[strategy.key]?.name || strategy.name}</span>
                        <span class="strategy-count">(${strategy.binanceCandidates || 0})</span>
                        ${strategy.isRecommended ? '<span class="recommended-badge">⭐</span>' : ''}
                    </button>
                `
									)
									.join('')}
            </div>
            
            <div class="strategy-content">
                ${strategies
									.map(
										(strategy, index) => `
                    <div 
                        class="strategy-panel ${index === 0 ? 'active' : ''}"
                        data-strategy="${strategy.key}"
                    >
                        ${renderStrategyTable(strategy)}
                    </div>
                `
									)
									.join('')}
            </div>
        </div>
    `;

	container.innerHTML = tabsHTML;

	// Setup table interactions
	setupTableInteractions();

	// Add crypto background animation
	initializeCryptoBackground();
}

function renderStrategyTable(strategy) {
	const config = STRATEGY_CONFIG[strategy.key] || {};
	const performance = strategy.performance || {};
	const topCoins = strategy.topCoins || [];

	return `
        <div class="table-container">
            <div class="table-header">
                <h2>${config.emoji || '📊'} ${config.name || strategy.name}</h2>
                <p>${config.explanation || strategy.description}</p>
                <div class="table-stats">
                    <div class="table-stat">
                        <span class="table-stat-value">${strategy.binanceCandidates || 0}</span>
                        <span class="table-stat-label">Kandydatów</span>
                    </div>
                    <div class="table-stat">
                        <span class="table-stat-value">${formatNumber(performance.avgScore || 0, 'score')}</span>
                        <span class="table-stat-label">Średni Score</span>
                    </div>
                    <div class="table-stat">
                        <span class="table-stat-value">${performance.strongCandidates || 0}</span>
                        <span class="table-stat-label">Wysokie Score (≥60)</span>
                    </div>
                    <div class="table-stat">
                        <span class="table-stat-value">${formatNumber(performance.avgRisk || 0, 'score')}</span>
                        <span class="table-stat-label">Średnie Ryzyko</span>
                    </div>
                    <div class="table-stat">
                        <span class="table-stat-value">${calculateAverageTimingScore(topCoins)}</span>
                        <span class="table-stat-label">Średni Timing</span>
                    </div>
                </div>
            </div>

            <!-- DODAJ WRAPPER dla tabeli -->
            <div class="table-wrapper">
                <table class="crypto-table">
                    <thead>
                        <tr>
                            <th>Coin</th>
                            <th class="sortable" data-sort="score">
                                Score 
                                <span class="sort-icon">↕️</span>
                            </th>
                            <th class="sortable" data-sort="price">
                                Cena
                                <span class="sort-icon">↕️</span>
                            </th>
                            <th class="sortable" data-sort="change24h">
                                24h %
                                <span class="sort-icon">↕️</span>
                            </th>
                            <th class="sortable" data-sort="change7d">
                                7d %
                                <span class="sort-icon">↕️</span>
                            </th>
                            <th class="hide-mobile sortable" data-sort="volume">
                                Volume/MCap
                                <span class="sort-icon">↕️</span>
                            </th>
                            <th class="hide-mobile sortable" data-sort="risk">
                                Ryzyko
                                <span class="sort-icon">↕️</span>
                            </th>
                            <th class="hide-mobile">Timing</th>
                            <th>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topCoins
													.slice(0, 20)
													.map((coin) => createCoinTableRow(coin, strategy))
													.join('')}
                    </tbody>
                </table>
            </div>

            ${
							topCoins.length > 20
								? `
                <div class="table-footer">
                    <button class="show-more-btn" onclick="showMoreTableRows('${strategy.key}')">
                        Pokaż więcej monet (${topCoins.length - 20} pozostałych)
                    </button>
                </div>
            `
								: ''
						}
        </div>
    `;
}

// ========================================
// INTERACTION FUNCTIONS
// ========================================

/**
 * Select strategy from preview
 */
function selectStrategy(strategyKey) {
	// Scroll to main strategies section
	const strategiesSection = document.getElementById('main-strategies');
	if (strategiesSection) {
		strategiesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// Switch to selected strategy after scroll
	setTimeout(() => {
		switchToStrategy(strategyKey);
	}, 500);
}

/**
 * Switch between strategy tabs - POPRAWIONA WERSJA
 */
function switchToStrategy(strategyKey) {
	console.log(`🔄 Przełączam na strategię: ${strategyKey}`);

	// Update tab states - USUŃ WSZYSTKIE active z tabów
	document.querySelectorAll('.strategy-tab').forEach((tab) => {
		tab.classList.remove('active');
	});

	// Add active class TYLKO do klikniętego taba
	const activeTab = document.querySelector(`[data-strategy="${strategyKey}"]`);
	if (activeTab) {
		activeTab.classList.add('active');
		console.log(`✅ Aktywowano tab: ${strategyKey}`);
	} else {
		console.warn(`❌ Nie znaleziono taba dla: ${strategyKey}`);
	}

	// Update panel states - UKRYJ WSZYSTKIE panele
	document.querySelectorAll('.strategy-panel').forEach((panel) => {
		panel.classList.remove('active');
		panel.style.display = 'none'; // Dodatkowe ukrycie
	});

	// Show TYLKO wybrany panel
	const activePanel = document.querySelector(
		`.strategy-panel[data-strategy="${strategyKey}"]`
	);
	if (activePanel) {
		activePanel.classList.add('active');
		activePanel.style.display = 'block'; // Dodatkowe pokazanie

		console.log(`✅ Aktywowano panel: ${strategyKey}`);

		// Add entrance animation if enabled
		if (UI_CONFIG.animations.enabled) {
			activePanel.style.opacity = '0';
			activePanel.style.transform = 'translateY(20px)';

			requestAnimationFrame(() => {
				activePanel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
				activePanel.style.opacity = '1';
				activePanel.style.transform = 'translateY(0)';
			});
		}

		// Re-setup table interactions for the newly shown table
		setupTableInteractions();
	} else {
		console.warn(`❌ Nie znaleziono panelu dla: ${strategyKey}`);
	}

	// Update app state
	if (window.appState) {
		window.appState.currentStrategy = strategyKey;
	}

	// Analytics
	if (typeof gtag !== 'undefined') {
		gtag('event', 'strategy_switch', {
			strategy: strategyKey,
			source: 'tab_click',
		});
	}

	// Scroll strategy into view if not visible
	const strategiesContainer = document.getElementById('strategies-container');
	if (strategiesContainer && !isElementInViewport(strategiesContainer)) {
		strategiesContainer.scrollIntoView({
			behavior: 'smooth',
			block: 'start',
		});
	}
}

/**
 * POKAZUJE WIĘCEJ MONET DLA DANEJ STRATEGII
 */
function showMoreCoins(strategyKey) {
	const button = event.target;
	button.textContent = 'Ładuję...';
	button.disabled = true;

	// Znajdź odpowiednią strategię w danych
	const strategy = window.appState.scannerResults.strategies.find(
		(s) => s.key === strategyKey
	);
	if (!strategy || !strategy.topCoins) {
		button.textContent = 'Błąd - nie znaleziono monet';
		return;
	}

	// Pobierz monety, które jeszcze nie zostały wyświetlone (od 7 wzwyż)
	const coinsToShow = strategy.topCoins.slice(6);

	// Znajdź kontener grid dla tej strategii
	const gridContainer = button
		.closest('.strategy-panel')
		.querySelector('.coins-grid');

	if (gridContainer && coinsToShow.length > 0) {
		// Stwórz HTML dla nowych kart monet
		const newCardsHTML = coinsToShow
			.map((coin) => createSimplifiedCoinCard(coin, strategy))
			.join('');

		// Dodaj nowe karty do siatki
		gridContainer.insertAdjacentHTML('beforeend', newCardsHTML);
	}

	showMoreTableRows(strategyKey);

	// Ukryj przycisk po załadowaniu wszystkiego
	button.parentElement.style.display = 'none';
}

window.showMoreCoins = showMoreCoins;

/**
 * Pokazuje okno modalne ze szczegółami monety
 */
function showCoinDetails(symbol) {
	// Znajdź wszystkie monety ze wszystkich strategii
	const allCoins = window.appState.scannerResults.strategies.flatMap(
		(s) => s.topCoins
	);
	const coin = allCoins.find((c) => c.symbol === symbol);

	if (!coin) {
		console.error(`Nie znaleziono monety: ${symbol}`);
		alert(`Nie można wczytać szczegółów dla ${symbol}.`);
		return;
	}

	const modal = document.getElementById('coin-details-modal');
	const modalBody = document.getElementById('modal-body');
	const momentum = coin.momentum || {};
	const timing = momentum.timing || {}; // FIXED: Define the 'timing' variable

	const scoreInfo = getScoreInterpretation(momentum.totalScore || 0);
	const riskInfo = getScoreInterpretation(momentum.riskScore || 0, 'risk');

	// Wygeneruj HTML dla zawartości okna
	modalBody.innerHTML = `
		<div class="modal-header">
			<div class="coin-rank">#${coin.rank}</div>
			<div class="modal-title">
				<h2>${coin.symbol} <span class="gradient-text">${scoreInfo.text}</span></h2>
				<span>${coin.name}</span>
			</div>
		</div>
		
		<div class="modal-stats-grid">
			<div class="modal-stat">
				<div class="stat-label">Cena</div>
				<div class="stat-number">$${formatNumber(coin.price, 'price')}</div>
			</div>
			<div class="modal-stat">
				<div class="stat-label">Zmiana 7D</div>
				<div class="stat-number ${coin.priceChange7d >= 0 ? 'positive' : 'negative'}">
					${formatNumber(coin.priceChange7d, 'percentage')}
				</div>
			</div>
			<div class="modal-stat">
				<div class="stat-label">Score</div>
				<div class="stat-number">${formatNumber(momentum.totalScore, 'score')} / 100</div>
			</div>
			<div class="modal-stat">
				<div class="stat-label">Ryzyko</div>
				<div class="stat-number ${riskInfo.level === 'high' ? 'negative' : 'positive'}">
					${formatNumber(momentum.riskScore, 'score')} / 100
				</div>
			</div>
		</div>
		${
			timing.recommendation
				? `
    <div class="timing-recommendation">
        <h4>⏰ Timing Analysis:</h4>
        <div class="timing-card ${timing.recommendation.action.toLowerCase().includes('buy') ? 'positive' : 'warning'}">
            <span class="timing-action">${timing.recommendation.action}</span>
            <span class="timing-reason">${timing.recommendation.reason}</span>
        </div>
    </div>
`
				: ''
		}

${
	timing.signals && timing.signals.length > 0
		? `
    <div class="timing-signals">
        <h4>📊 Timing Signals:</h4>
        <ul>
            ${timing.signals.map((signal) => `<li>${signal}</li>`).join('')}
        </ul>
    </div>
`
		: ''
}

		<div class="modal-signals-list">
			<h4>💡 Kluczowe Sygnały:</h4>
			<ul>
				${
					momentum.signals && momentum.signals.length > 0
						? momentum.signals.map((signal) => `<li>${signal}</li>`).join('')
						: '<li>Brak konkretnych sygnałów.</li>'
				}
			</ul>
		</div>
	`;

	modal.classList.add('visible');
}

/**
 * Inicjalizuje logikę zamykania dla WSZYSTKICH okien modalnych
 */
function initializeModal() {
	// --- Logika dla okna "Więcej szczegółów" ---
	const detailsModal = document.getElementById('coin-details-modal');
	const detailsCloseBtn = document.getElementById('modal-close-btn');

	if (detailsModal && detailsCloseBtn) {
		const hideDetailsModal = () => detailsModal.classList.remove('visible');
		detailsCloseBtn.addEventListener('click', hideDetailsModal);
		detailsModal.addEventListener('click', (e) => {
			if (e.target === detailsModal) hideDetailsModal();
		});
	}

	// --- Logika dla okna "DEX Info" ---
	const dexModal = document.getElementById('dex-info-modal');
	const dexCloseBtn = document.getElementById('dex-modal-close-btn');

	if (dexModal && dexCloseBtn) {
		const hideDexModal = () => dexModal.classList.remove('visible');
		dexCloseBtn.addEventListener('click', hideDexModal);
		dexModal.addEventListener('click', (e) => {
			if (e.target === dexModal) hideDexModal();
		});
	}

	// --- Wspólna logika dla zamykania klawiszem Escape ---
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			if (detailsModal && detailsModal.classList.contains('visible')) {
				detailsModal.classList.remove('visible');
			}
			if (dexModal && dexModal.classList.contains('visible')) {
				dexModal.classList.remove('visible');
			}
		}
	});
}

/**
 * Pokazuje okno modalne z informacjami DEX
 */
function showDEXInfo(symbol) {
	const allCoins = window.appState.scannerResults.strategies.flatMap(
		(s) => s.topCoins
	);
	const coin = allCoins.find((c) => c.symbol === symbol);

	if (!coin || !coin.dexData || !coin.dexData.hasDEXData) {
		alert(`Brak dostępnych danych DEX dla ${symbol}.`);
		return;
	}

	const modal = document.getElementById('dex-info-modal');
	const modalBody = document.getElementById('dex-modal-body');
	const dexData = coin.dexData;
	const dexSignals = (coin.momentum.signals || []).filter((s) =>
		['💧', '🟢', '🔴', '✅', '⚠️', '🌐', '🔥', '🎯'].some((emoji) =>
			s.startsWith(emoji)
		)
	);

	modalBody.innerHTML = `
        <div class="modal-header">
            <div class="coin-rank">🏪</div>
            <div class="modal-title">
                <h2>Analiza DEX dla ${coin.symbol}</h2>
                <span>Dane z giełd zdecentralizowanych</span>
            </div>
        </div>

        <div class="modal-stats-grid">
            <div class="modal-stat">
                <div class="stat-label">Score Płynności</div>
                <div class="stat-number">${dexData.liquidityScore || 'N/A'}/100</div>
            </div>
            <div class="modal-stat">
                <div class="stat-label">Jakość Wolumenu</div>
                <div class="stat-number">${dexData.volumeQualityScore || 'N/A'}/100</div>
            </div>
            <div class="modal-stat">
                <div class="stat-label">Presja Kupna</div>
                <div class="stat-number">${dexData.buyPressure || 'N/A'}%</div>
            </div>
             <div class="modal-stat">
                <div class="stat-label">Liczba Giełd DEX</div>
                <div class="stat-number">${dexData.uniqueDEXes || 'N/A'}</div>
            </div>
        </div>

        <div class="modal-signals-list">
            <h4>💡 Sygnały z DEX:</h4>
            <ul>
                ${dexSignals.length > 0 ? dexSignals.map((s) => `<li>${s}</li>`).join('') : '<li>Brak sygnałów.</li>'}
            </ul>
        </div>

        ${
					dexData.topPairs && dexData.topPairs.length > 0
						? `
        <div class="dex-pairs-list">
            <h4>🔝 Główne Pary Handlowe:</h4>
            <ul>
                ${dexData.topPairs
									.map(
										(pair) => `
                    <li class="dex-pair-item">
                        <div class="dex-pair-header">
                            <span>${pair.dex}</span>
                            <span class="dex-pair-chain">${pair.chain}</span>
                        </div>
                        <div class="dex-pair-stats">
                            <span>Wolumen 24h: <strong>${pair.volume24h}</strong></span>
                            <span>Płynność: <strong>${pair.liquidity}</strong></span>
                        </div>
                    </li>
                `
									)
									.join('')}
            </ul>
        </div>
        `
						: ''
				}
    `;

	modal.classList.add('visible');
}

// ========================================
// ANIMATION FUNCTIONS
// ========================================

/**
 * Animate strategy cards on load
 */
function animateStrategyCards() {
	const cards = document.querySelectorAll('.coin-card');
	cards.forEach((card, index) => {
		card.style.opacity = '0';
		card.style.transform = 'translateY(20px)';

		setTimeout(() => {
			card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
			card.style.opacity = '1';
			card.style.transform = 'translateY(0)';
		}, index * UI_CONFIG.animations.stagger);
	});
}

/**
 * Setup intersection observer for scroll animations
 */
function setupScrollAnimations() {
	if (!UI_CONFIG.animations.enabled) return;

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('animate-in');
				}
			});
		},
		{
			threshold: 0.1,
			rootMargin: '0px 0px -50px 0px',
		}
	);

	// Observe sections
	document
		.querySelectorAll(
			'.onboarding-section, .strategy-picker, .education-section'
		)
		.forEach((section) => {
			observer.observe(section);
		});
}

// ========================================
// MAIN RENDER FUNCTIONS
// ========================================

/**
 * Main render function for enhanced results
 */
export function renderEnhancedResults(results, elements) {
	console.log('🎨 Rendering enhanced user-friendly interface...');

	// Render market overview
	renderMarketOverview(results.marketStatus);

	// Update opportunities count
	const allCoins = getAllCoinsFromStrategies(results);
	const hotCoins = allCoins.filter(
		(coin) => parseFloat(coin.momentum?.totalScore || 0) >= 60
	).length;
	if (elements.opportunities) {
		elements.opportunities.textContent = hotCoins;
	}

	// Render enhanced strategies
	renderEnhancedStrategies(results.strategies);

	// Setup animations
	setTimeout(() => {
		setupScrollAnimations();
	}, 100);

	console.log('✅ Enhanced interface rendered successfully');
}

/**
 * Get all coins from strategies (helper function)
 */
function getAllCoinsFromStrategies(results) {
	if (!results.strategies) return [];

	const allCoins = [];
	const seenSymbols = new Set();

	results.strategies.forEach((strategy) => {
		if (strategy.topCoins && Array.isArray(strategy.topCoins)) {
			strategy.topCoins.forEach((coin) => {
				if (!seenSymbols.has(coin.symbol)) {
					seenSymbols.add(coin.symbol);
					allCoins.push({
						...coin,
						strategy: strategy.key,
					});
				}
			});
		}
	});

	return allCoins;
}

// ========================================
// LEGACY COMPATIBILITY FUNCTIONS
// ========================================

export function renderStrategies(strategies, elements) {
	renderEnhancedStrategies(strategies);
}

export function renderEnhancedMarketStatus(marketStatus, elements) {
	renderMarketOverview(marketStatus);
}

export function setLoadingState(isLoading, elements) {
	const loadingElement = document.getElementById('loading');
	const strategiesContainer = document.getElementById('strategies-container');

	if (loadingElement) {
		loadingElement.style.display = isLoading ? 'block' : 'none';
	}

	if (strategiesContainer) {
		strategiesContainer.style.opacity = isLoading ? '0.5' : '1';
	}
}

export function displayError(elements) {
	const strategiesContainer = document.getElementById('strategies-container');
	if (strategiesContainer) {
		strategiesContainer.innerHTML = `
			<div class="error-state">
				<div class="error-icon">⚠️</div>
				<h3>Ups! Wystąpił problem</h3>
				<p>Nie mogę pobrać najnowszych danych. Sprawdź połączenie internetowe i spróbuj ponownie.</p>
				<button onclick="location.reload()" class="retry-button">
					🔄 Spróbuj ponownie
				</button>
			</div>
		`;
	}
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Calculate average timing score for coins
 */
function calculateAverageTimingScore(coins) {
	if (!coins || coins.length === 0) return 0;

	const timingScores = coins
		.map((coin) => coin.momentum?.timing?.timingScore || 50)
		.filter((score) => score > 0);

	if (timingScores.length === 0) return 50;

	const avg =
		timingScores.reduce((sum, score) => sum + score, 0) / timingScores.length;
	return Math.round(avg);
}

/**
 * Generate detailed risk explanation tooltip
 */
function generateRiskTooltip(coin) {
	const momentum = coin.momentum || {};
	const riskScore = momentum.riskScore || 50;
	const reasons = [];

	// Podstawowe wyjaśnienie
	if (riskScore > 70) {
		reasons.push('🔴 WYSOKIE RYZYKO:');
	} else if (riskScore > 40) {
		reasons.push('🟡 ŚREDNIE RYZYKO:');
	} else {
		reasons.push('🟢 NISKIE RYZYKO:');
	}

	// Konkretne powody ryzyka
	if (coin.rank > 100) {
		reasons.push('• Niska pozycja w rankingu (#' + coin.rank + ')');
	}

	if (Math.abs(coin.priceChange24h || 0) > 15) {
		reasons.push(
			'• Duże wahania ceny (±' +
				Math.abs(coin.priceChange24h).toFixed(1) +
				'% w 24h)'
		);
	}

	if ((coin.volumeToMcap || 0) < 0.02) {
		reasons.push('• Niska płynność - trudno sprzedać');
	}

	if ((coin.priceChange7d || 0) > 50) {
		reasons.push(
			'• Może być po pumpie (+' +
				coin.priceChange7d.toFixed(1) +
				'% w tygodniu)'
		);
	}

	if (coin.developerData && coin.developerData.commit_count_4_weeks === 0) {
		reasons.push('• Brak aktywności programistów');
	}

	// Pozytywne czynniki
	if (riskScore < 40) {
		if (coin.rank <= 50) reasons.push('• Top 50 - sprawdzony projekt');
		if ((coin.volumeToMcap || 0) > 0.05) reasons.push('• Dobra płynność');
		if (coin.binance?.isListed) reasons.push('• Dostępny na Binance');
	}

	// Jeśli brak konkretnych powodów
	if (reasons.length === 1) {
		if (riskScore > 70) {
			reasons.push('• Połączenie wielu czynników ryzyka');
		} else if (riskScore < 40) {
			reasons.push('• Stabilny projekt z dobrymi fundamentami');
		} else {
			reasons.push('• Standardowe ryzyko dla altcoina');
		}
	}

	return reasons.join('\n');
}

/**
 * Generate timing explanation tooltip
 */
function generateTimingTooltip(coin) {
	const timing = coin.momentum?.timing || {};
	const timingScore = timing.timingScore || 50;
	const reasons = [];

	// Wyjaśnienie ogólne
	if (timingScore > 70) {
		reasons.push('🟢 DOSKONAŁY TIMING:');
	} else if (timingScore > 50) {
		reasons.push('🟡 DOBRY TIMING:');
	} else {
		reasons.push('🔴 ZŁY TIMING:');
	}

	// Używaj breakdown jeśli dostępny
	if (timing.breakdown) {
		const b = timing.breakdown;

		if (b.macro > 70) reasons.push('• Świetne warunki rynkowe dla altów');
		else if (b.macro < 40)
			reasons.push('• Słabe warunki rynkowe (BTC dominuje)');

		if (b.coin > 70) reasons.push('• Coin w idealnym momencie');
		else if (b.coin < 40) reasons.push('• Coin może być przegrzany');

		if (b.sector > 70)
			reasons.push('• Sektor ' + (coin.sector || 'Unknown') + ' ma momentum');
		else if (b.sector < 40)
			reasons.push('• Sektor ' + (coin.sector || 'Unknown') + ' słaby');

		if (b.technical > 70) reasons.push('• Doskonałe poziomy techniczne');
		else if (b.technical < 40) reasons.push('• Słabe poziomy techniczne');
	}

	// Rekomendacja
	if (timing.recommendation) {
		reasons.push('📋 REKOMENDACJA: ' + timing.recommendation.action);
		reasons.push('   ' + timing.recommendation.reason);
	}

	// Fallback jeśli brak danych
	if (reasons.length === 1) {
		reasons.push('• Brak szczegółowych danych timing');
	}

	return reasons.join('\n');
}

/**
 * Get risk level class
 */
function getRiskLevel(riskScore) {
	if (riskScore >= 70) return 'high';
	if (riskScore >= 40) return 'medium';
	return 'low';
}

/**
 * Get risk icon
 */
function getRiskIcon(riskScore) {
	if (riskScore >= 70) return '⚠️';
	if (riskScore >= 40) return '⚡';
	return '✅';
}

/**
 * Get risk text
 */
function getRiskText(riskScore) {
	if (riskScore >= 70) return 'Wysokie';
	if (riskScore >= 40) return 'Średnie';
	return 'Niskie';
}

/**
 * Get timing class for styling
 */
function getTimingClass(actionSignal) {
	if (!actionSignal?.action) return 'neutral';

	const action = actionSignal.action.toLowerCase();
	if (action.includes('buy')) return 'buy';
	if (action.includes('wait') || action.includes('watch')) return 'wait';
	if (action.includes('skip') || action.includes('avoid')) return 'avoid';
	return 'neutral';
}

/**
 * Setup table interactions (sorting, filtering, etc.)
 */
function setupTableInteractions() {
	// Setup sorting
	document.querySelectorAll('.sortable').forEach((header) => {
		header.addEventListener('click', () => {
			const sortBy = header.dataset.sort;
			const table = header.closest('table');
			sortTable(table, sortBy);
		});
	});

	// Setup row hover effects
	document.querySelectorAll('.coin-row').forEach((row) => {
		row.addEventListener('mouseenter', () => {
			row.style.background = 'rgba(59, 130, 246, 0.05)';
			row.style.transform = 'translateX(4px)';
		});

		row.addEventListener('mouseleave', () => {
			row.style.background = '';
			row.style.transform = '';
		});
	});
}

/**
 * Sort table by column
 */
function sortTable(table, sortBy) {
	const tbody = table.querySelector('tbody');
	const rows = Array.from(tbody.querySelectorAll('tr'));

	// Determine sort direction
	const currentSort = table.dataset.currentSort;
	const currentDirection = table.dataset.sortDirection || 'asc';
	const newDirection =
		currentSort === sortBy && currentDirection === 'asc' ? 'desc' : 'asc';

	// Sort rows
	rows.sort((a, b) => {
		let aVal, bVal;

		switch (sortBy) {
			case 'score':
				aVal = parseFloat(
					a.querySelector('.score-badge').textContent.match(/\d+/)[0]
				);
				bVal = parseFloat(
					b.querySelector('.score-badge').textContent.match(/\d+/)[0]
				);
				break;
			case 'price':
				aVal = parseFloat(
					a.querySelector('.price-cell').textContent.replace('$', '')
				);
				bVal = parseFloat(
					b.querySelector('.price-cell').textContent.replace('$', '')
				);
				break;
			case 'change24h':
			case 'change7d':
				const index = sortBy === 'change24h' ? 3 : 4;
				aVal = parseFloat(a.children[index].textContent.replace('%', ''));
				bVal = parseFloat(b.children[index].textContent.replace('%', ''));
				break;
			case 'volume':
				aVal = parseFloat(a.children[5].textContent.replace('%', ''));
				bVal = parseFloat(b.children[5].textContent.replace('%', ''));
				break;
			case 'risk':
				aVal = parseFloat(a.children[6].textContent.match(/\d+/)[0]);
				bVal = parseFloat(b.children[6].textContent.match(/\d+/)[0]);
				break;
			default:
				return 0;
		}

		if (newDirection === 'asc') {
			return aVal - bVal;
		} else {
			return bVal - aVal;
		}
	});

	// Update table
	rows.forEach((row) => tbody.appendChild(row));

	// Update sort indicators
	table.dataset.currentSort = sortBy;
	table.dataset.sortDirection = newDirection;

	// Update sort icons
	table
		.querySelectorAll('.sort-icon')
		.forEach((icon) => (icon.textContent = '↕️'));
	const activeHeader = table.querySelector(
		`[data-sort="${sortBy}"] .sort-icon`
	);
	if (activeHeader) {
		activeHeader.textContent = newDirection === 'asc' ? '↑' : '↓';
	}
}

/**
 * Show more table rows
 */
function showMoreTableRows(strategyKey) {
	const strategy = window.appState.scannerResults.strategies.find(
		(s) => s.key === strategyKey
	);
	if (!strategy || !strategy.topCoins) return;

	const button = event.target;
	button.textContent = 'Ładuję...';
	button.disabled = true;

	// Get coins to show (from 21 onwards)
	const coinsToShow = strategy.topCoins.slice(20);

	// Find table body
	const tbody = button.closest('.table-container').querySelector('tbody');

	if (tbody && coinsToShow.length > 0) {
		// Add new rows
		const newRowsHTML = coinsToShow
			.map((coin) => createCoinTableRow(coin, strategy))
			.join('');
		tbody.insertAdjacentHTML('beforeend', newRowsHTML);

		// Setup interactions for new rows
		setupTableInteractions();
	}

	// Hide button
	button.parentElement.style.display = 'none';
}

/**
 * Initialize crypto background animation
 */
function initializeCryptoBackground() {
	// Add crypto background if not exists
	if (!document.getElementById('cryptoBackground')) {
		const background = document.createElement('div');
		background.id = 'cryptoBackground';
		background.className = 'crypto-background';
		document.body.insertBefore(background, document.body.firstChild);

		// Start particle animation
		createCryptoParticles();
	}
}

/**
 * Create animated crypto particles
 */
function createCryptoParticles() {
	const background = document.getElementById('cryptoBackground');
	if (!background) return;

	const cryptoSymbols = ['₿', 'Ξ', '◊', '⟠', '◈', '⬡', '◇', '⬢', '⬟', '◎'];

	setInterval(() => {
		const particle = document.createElement('div');
		particle.className = 'crypto-particle';
		particle.textContent =
			cryptoSymbols[Math.floor(Math.random() * cryptoSymbols.length)];
		particle.style.left = Math.random() * 100 + '%';
		particle.style.animationDuration = Math.random() * 10 + 15 + 's';
		particle.style.fontSize = Math.random() * 20 + 20 + 'px';
		particle.style.opacity = Math.random() * 0.1 + 0.05;

		background.appendChild(particle);

		// Remove particle after animation
		setTimeout(() => {
			if (particle.parentNode) {
				particle.remove();
			}
		}, 25000);
	}, 3000);
}

function isElementInViewport(el) {
	const rect = el.getBoundingClientRect();
	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <=
			(window.innerHeight || document.documentElement.clientHeight) &&
		rect.right <= (window.innerWidth || document.documentElement.clientWidth)
	);
}

// ========================================
// EXPORTS AND GLOBAL FUNCTIONS
// ========================================

export {
	renderEnhancedResults,
	setLoadingState,
	displayError,
	formatNumber,
	getScoreInterpretation,
	initializeModal,
	renderStrategyTable,
	createCoinTableRow,
	setupTableInteractions,
	sortTable,
	initializeCryptoBackground,
	getRiskLevel,
	getRiskIcon,
	getRiskText,
	getTimingClass,
	switchToStrategy,
	selectStrategy,
};

window.selectStrategy = selectStrategy;
window.showMoreCoins = showMoreCoins;
window.showCoinDetails = showCoinDetails;
window.showDEXInfo = showDEXInfo;
