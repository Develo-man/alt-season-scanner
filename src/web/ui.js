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

/**
 * Create simplified, user-friendly coin card
 */
function createSimplifiedCoinCard(coin, strategy) {
	const momentum = coin.momentum || {};
	const score = parseFloat(momentum.totalScore || 0);
	const scoreInfo = getScoreInterpretation(score, 'momentum');
	const riskInfo = getScoreInterpretation(momentum.riskScore || 0, 'risk');
	const priceChange7d = coin.priceChange7d || 0;

	// Determine priority level
	let priorityLevel = 'low';
	let priorityText = 'Obserwuj';
	let priorityEmoji = '👀';

	if (score >= 70) {
		priorityLevel = 'high';
		priorityText = 'TOP OKAZJA';
		priorityEmoji = '🔥';
	} else if (score >= 50) {
		priorityLevel = 'medium';
		priorityText = 'Interesująca';
		priorityEmoji = '👍';
	}

	// Simple explanation why this coin is interesting
	const reasons = [];
	if (score >= 60) reasons.push('Wysoki momentum score');
	if (priceChange7d > 20) reasons.push('Silny wzrost w tygodniu');
	if (coin.volumeToMcap > 0.3) reasons.push('Bardzo aktywny handel');
	if (momentum.riskScore < 40) reasons.push('Stosunkowo bezpieczny');
	if (coin.sector && coin.sector !== 'Unknown')
		reasons.push(`Sektor: ${coin.sector}`);

	return `
		<div class="coin-card modern-card" data-priority="${priorityLevel}">
			<!-- Priority Badge -->
			<div class="priority-badge priority-${priorityLevel}">
				<span class="priority-emoji">${priorityEmoji}</span>
				<span class="priority-text">${priorityText}</span>
			</div>

			<!-- Coin Header -->
			<div class="coin-header">
				<div class="coin-info">
					<div class="coin-rank">#${coin.rank || '?'}</div>
					<div class="coin-identity">
						<h3>${coin.symbol}</h3>
						<span class="coin-name">${coin.name || 'Unknown'}</span>
					</div>
				</div>
				<div class="score-display">
					<div class="score-circle score-${scoreInfo.level}">
						${formatNumber(score, 'score')}
					</div>
					<span class="score-label">${scoreInfo.text}</span>
				</div>
			</div>

			<!-- Key Metrics (Simplified) -->
			<div class="key-metrics">
				<div class="metric-row">
					<span class="metric-label">💰 Cena:</span>
					<span class="metric-value">${formatNumber(coin.price, 'price')}</span>
				</div>
				<div class="metric-row">
					<span class="metric-label">📈 Zmiana 7D:</span>
					<span class="metric-value ${priceChange7d >= 0 ? 'positive' : 'negative'}">
						${formatNumber(priceChange7d, 'percentage')}
					</span>
				</div>
				<div class="metric-row">
					<span class="metric-label">${riskInfo.emoji} Ryzyko:</span>
					<span class="metric-value risk-${riskInfo.level}">
						${riskInfo.text}
					</span>
				</div>
				<div class="metric-row">
					<span class="metric-label">💧 Aktywność:</span>
					<span class="metric-value">
						${formatNumber((coin.volumeToMcap || 0) * 100, 'percentage')}
					</span>
				</div>
			</div>

			<!-- Why Interesting Section -->
			${
				reasons.length > 0
					? `
				<div class="why-interesting">
					<h4>💡 Dlaczego warto zwrócić uwagę?</h4>
					<ul class="reason-list">
						${reasons
							.slice(0, 3)
							.map(
								(reason) => `
							<li class="reason-item">✓ ${reason}</li>
						`
							)
							.join('')}
					</ul>
				</div>
			`
					: ''
			}

			<!-- Action Buttons -->
			<div class="card-actions">
				<button class="action-btn primary" onclick="showCoinDetails('${coin.symbol}')">
					📊 Więcej szczegółów
				</button>
				${
					coin.dexData?.hasDEXData
						? `
					<button class="action-btn secondary" onclick="showDEXInfo('${coin.symbol}')">
						🏪 DEX Info
					</button>
				`
						: ''
				}
			</div>

			<!-- Risk Warning for High Risk Coins -->
			${
				momentum.riskScore >= 70
					? `
				<div class="risk-warning">
					<span class="warning-icon">⚠️</span>
					<span class="warning-text">Wysokie ryzyko - ${riskInfo.advice}</span>
				</div>
			`
					: ''
			}
		</div>
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

	// First render strategy previews
	renderStrategyPreviews(strategies);

	// Then render full strategy tabs
	const tabsHTML = `
		<div class="strategy-tabs">
			<div class="strategy-tabs-header">
				<h2>🎯 Analiza Strategii</h2>
				<p>Każda strategia znajduje inne okazje - wybierz tę, która pasuje do Twojego stylu</p>
				<div class="strategy-selector">
					${strategies
						.map(
							(strategy, index) => `
						<button 
							class="strategy-tab ${index === 0 ? 'active' : ''} ${strategy.isRecommended ? 'recommended' : ''}"
							data-strategy="${strategy.key}"
							onclick="switchToStrategy('${strategy.key}')"
						>
							<span class="strategy-emoji">${STRATEGY_CONFIG[strategy.key]?.emoji || '📊'}</span>
							<div class="strategy-info">
								<span class="strategy-name">${STRATEGY_CONFIG[strategy.key]?.name || strategy.name}</span>
								<span class="strategy-count">${strategy.binanceCandidates || 0} monet</span>
							</div>
							${strategy.isRecommended ? '<span class="recommended-badge">Rekomendowana</span>' : ''}
						</button>
					`
						)
						.join('')}
				</div>
			</div>
			
			<div class="strategy-content">
				${strategies
					.map(
						(strategy, index) => `
					<div 
						class="strategy-panel ${index === 0 ? 'active' : ''}"
						data-strategy="${strategy.key}"
					>
						${renderStrategyPanel(strategy)}
					</div>
				`
					)
					.join('')}
			</div>
		</div>
	`;

	container.innerHTML = tabsHTML;

	// Add scroll-to-view functionality
	if (UI_CONFIG.animations.enabled) {
		animateStrategyCards();
	}
}

/**
 * Render individual strategy panel with user-friendly explanations
 */
function renderStrategyPanel(strategy) {
	const config = STRATEGY_CONFIG[strategy.key] || {};
	const performance = strategy.performance || {};
	const topCoins = strategy.topCoins || [];

	return `
		<div class="strategy-explanation">
			<div class="explanation-card">
				<div class="explanation-header">
					<span class="explanation-emoji">${config.emoji}</span>
					<div class="explanation-content">
						<h3>${config.name}</h3>
						<p>${config.explanation}</p>
					</div>
				</div>
				
				<div class="strategy-stats-row">
					<div class="stat-box">
						<span class="stat-number">${strategy.binanceCandidates || 0}</span>
						<span class="stat-label">Znalezionych monet</span>
					</div>
					<div class="stat-box">
						<span class="stat-number">${formatNumber(performance.avgScore || 0, 'score')}</span>
						<span class="stat-label">Średni score</span>
					</div>
					<div class="stat-box">
						<span class="stat-number">${performance.strongCandidates || 0}</span>
						<span class="stat-label">Wysokie score (≥60)</span>
					</div>
					<div class="stat-box">
						<span class="stat-number">${formatNumber(performance.avgRisk || 0, 'score')}/100</span>
						<span class="stat-label">Średnie ryzyko</span>
					</div>
				</div>
			</div>
		</div>

		${
			strategy.topCoin
				? `
			<div class="strategy-champion">
				<h4>🏆 Champion strategii:</h4>
				<div class="champion-display">
					<div class="champion-info">
						<span class="champion-symbol">${strategy.topCoin.symbol}</span>
						<span class="champion-name">${strategy.topCoin.name}</span>
					</div>
					<div class="champion-metrics">
						<span class="champion-score">${formatNumber(parseFloat(strategy.topCoin.momentum?.totalScore || 0), 'score')}</span>
						<span class="champion-change ${strategy.topCoin.priceChange7d >= 0 ? 'positive' : 'negative'}">
							${formatNumber(strategy.topCoin.priceChange7d || 0, 'percentage')}
						</span>
					</div>
				</div>
			</div>
		`
				: ''
		}

		<div class="strategy-coins-section">
			<div class="section-header">
				<h4>💎 Najlepsze okazje w kategorii ${config.name}</h4>
				<p>Posortowane według momentum score - im wyższy, tym lepiej</p>
			</div>
			
			<div class="coins-grid">
				${topCoins
					.slice(0, 6)
					.map((coin) => createSimplifiedCoinCard(coin, strategy))
					.join('')}
			</div>
			
			${
				topCoins.length > 6
					? `
				<div class="show-more-section">
					<button class="show-more-btn" onclick="showMoreCoins('${strategy.key}')">
						Pokaż więcej monet z tej strategii (${topCoins.length - 6} pozostałych)
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
 * Switch between strategy tabs
 */
function switchToStrategy(strategyKey) {
	// Update tab states
	document.querySelectorAll('.strategy-tab').forEach((tab) => {
		tab.classList.remove('active');
	});
	document
		.querySelector(`[data-strategy="${strategyKey}"]`)
		?.classList.add('active');

	// Update panel states
	document.querySelectorAll('.strategy-panel').forEach((panel) => {
		panel.classList.remove('active');
	});
	document
		.querySelector(`.strategy-panel[data-strategy="${strategyKey}"]`)
		?.classList.add('active');

	// Analytics
	if (typeof gtag !== 'undefined') {
		gtag('event', 'strategy_switch', {
			strategy: strategyKey,
		});
	}

	// Add animation if enabled
	if (UI_CONFIG.animations.enabled) {
		const activePanel = document.querySelector(
			`.strategy-panel[data-strategy="${strategyKey}"]`
		);
		if (activePanel) {
			activePanel.style.opacity = '0';
			activePanel.style.transform = 'translateY(20px)';

			setTimeout(() => {
				activePanel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
				activePanel.style.opacity = '1';
				activePanel.style.transform = 'translateY(0)';
			}, 50);
		}
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
// UTILITY EXPORTS
// ========================================

export {
	formatNumber,
	getScoreInterpretation,
	getMarketPhaseInfo,
	createSimplifiedCoinCard,
	switchToStrategy,
	selectStrategy,
	initializeModal,
};

// Make functions available globally for onclick handlers
window.switchToStrategy = switchToStrategy;
window.selectStrategy = selectStrategy;
window.showMoreCoins = showMoreCoins;
window.showCoinDetails = showCoinDetails;
window.showDEXInfo = showDEXInfo;
