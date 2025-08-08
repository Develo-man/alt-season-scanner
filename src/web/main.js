/**
 * IMPROVED MAIN.JS - Enhanced Alt Season Scanner
 * Focus: User-friendly experience with progressive disclosure
 */

import {
	renderEnhancedResults,
	setLoadingState,
	displayError,
	formatNumber,
	getScoreInterpretation,
	initializeModal,
} from './ui.js';

// ========================================
// APPLICATION STATE
// ========================================

class AppState {
	constructor() {
		this.scannerResults = null;
		this.currentStrategy = 'MOMENTUM';
		this.isLoading = false;
		this.lastUpdate = null;
		this.userPreferences = {
			helpMode: false,
			notifications: true,
			autoRefresh: true,
		};
		this.elements = this.initializeElements();
	}

	initializeElements() {
		return {
			// Market status elements
			btcDominance: document.getElementById('btc-dominance'),
			marketPhase: document.getElementById('market-phase'),
			fngValue: document.getElementById('fng-value'),
			fngClassification: document.getElementById('fng-classification'),
			opportunities: document.getElementById('opportunities'),

			ethBtcValue: document.getElementById('eth-btc-value'),
			ethBtcTrend: document.getElementById('eth-btc-trend'),

			total2MarketCap: document.getElementById('total2-market-cap'),
			total2MarketCapStatus: document.querySelector(
				'#total2-market-cap + .status-text'
			),

			// Market recommendation
			marketAdvice: document.getElementById('market-advice'),
			recommendedStrategy: document.getElementById('recommended-strategy'),

			// Strategy containers
			strategiesPreview: document.getElementById('strategies-preview'),
			strategiesContainer: document.getElementById('strategies-container'),

			// Loading and error states
			loading: document.getElementById('loading'),

			// Onboarding elements
			onboarding: document.getElementById('onboarding'),
			education: document.getElementById('education'),
		};
	}

	updateLastRefresh() {
		this.lastUpdate = new Date();
		const lastUpdateEl = document.getElementById('last-update');
		if (lastUpdateEl) {
			lastUpdateEl.textContent = this.lastUpdate.toLocaleTimeString('pl-PL');
		}
	}
}

// Global app state
const appState = new AppState();

// ========================================
// INITIALIZATION AND SETUP
// ========================================

/**
 * Initialize the application
 */
function initializeApp() {
	console.log('🚀 Initializing Alt Season Scanner...');

	// Setup help mode toggle
	initializeHelpMode();

	// Setup progressive disclosure
	initializeProgressiveDisclosure();

	// Setup intersection observers for animations
	initializeScrollAnimations();

	// Load initial data
	loadData();

	initializeModal();

	// Setup auto-refresh if enabled
	if (appState.userPreferences.autoRefresh) {
		setupAutoRefresh();
	}

	// Setup keyboard shortcuts
	setupKeyboardShortcuts();

	console.log('✅ Application initialized successfully');
}

/**
 * Initialize help mode functionality
 */
function initializeHelpMode() {
	const helpToggle = document.getElementById('help-toggle');
	if (!helpToggle) return;

	helpToggle.addEventListener('change', (e) => {
		const isHelpMode = e.target.checked;
		appState.userPreferences.helpMode = isHelpMode;

		// Toggle help mode class on body
		document.body.classList.toggle('help-mode', isHelpMode);

		// Show/hide onboarding based on help mode
		toggleOnboardingVisibility(isHelpMode);

		// Analytics
		if (typeof gtag !== 'undefined') {
			gtag('event', 'help_mode_toggle', {
				enabled: isHelpMode,
			});
		}

		// Show notification
		showNotification(
			isHelpMode ? 'Tryb pomocy włączony' : 'Tryb pomocy wyłączony',
			isHelpMode ? 'success' : 'info'
		);
	});
}

/**
 * Initialize progressive disclosure (show content as user scrolls)
 */
function initializeProgressiveDisclosure() {
	const observerOptions = {
		threshold: 0.1,
		rootMargin: '0px 0px -50px 0px',
	};

	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				entry.target.classList.add('animate-in');

				// Load section-specific content when it comes into view
				const sectionId = entry.target.id;
				handleSectionVisible(sectionId);
			}
		});
	}, observerOptions);

	// Observe main sections
	const sectionsToObserve = [
		'onboarding',
		'strategy-picker',
		'education',
		'main-strategies',
	];

	sectionsToObserve.forEach((sectionId) => {
		const section = document.getElementById(sectionId);
		if (section) {
			observer.observe(section);
		}
	});
}

/**
 * Handle when a section becomes visible
 */
function handleSectionVisible(sectionId) {
	switch (sectionId) {
		case 'strategy-picker':
			// Pre-load strategy previews if not already loaded
			if (
				appState.scannerResults?.strategies &&
				!appState.elements.strategiesPreview.hasChildNodes()
			) {
				renderStrategyPreviews(appState.scannerResults.strategies);
			}
			break;
		case 'education':
			// Track that user scrolled to education section
			if (typeof gtag !== 'undefined') {
				gtag('event', 'education_section_viewed');
			}
			break;
	}
}

/**
 * Setup scroll animations
 */
function initializeScrollAnimations() {
	// Skip animations if user prefers reduced motion
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		return;
	}

	// Add CSS classes for animation
	const style = document.createElement('style');
	style.textContent = `
		.animate-in {
			animation: slideInUp 0.6s ease-out forwards;
		}
		
		@keyframes slideInUp {
			from {
				opacity: 0;
				transform: translateY(30px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
	`;
	document.head.appendChild(style);
}

/**
 * Setup auto-refresh functionality
 */
function setupAutoRefresh() {
	// Refresh every 5 minutes
	setInterval(
		() => {
			if (!document.hidden && appState.userPreferences.autoRefresh) {
				console.log('🔄 Auto-refreshing data...');
				loadData(false); // Silent refresh
			}
		},
		5 * 60 * 1000
	);

	// Also refresh when page becomes visible again
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden && appState.userPreferences.autoRefresh) {
			const timeSinceLastUpdate =
				Date.now() - (appState.lastUpdate?.getTime() || 0);

			// Refresh if it's been more than 2 minutes
			if (timeSinceLastUpdate > 2 * 60 * 1000) {
				loadData(false);
			}
		}
	});
}

/**
 * Setup keyboard shortcuts for power users
 */
function setupKeyboardShortcuts() {
	document.addEventListener('keydown', (e) => {
		// Only activate shortcuts when not typing in an input
		if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
			return;
		}

		switch (e.key) {
			case 'h':
				// Toggle help mode
				const helpToggle = document.getElementById('help-toggle');
				if (helpToggle) {
					helpToggle.checked = !helpToggle.checked;
					helpToggle.dispatchEvent(new Event('change'));
				}
				break;
			case 'r':
				// Refresh data
				e.preventDefault();
				loadData();
				break;
			case '1':
				// Switch to momentum strategy
				switchToStrategy('MOMENTUM');
				break;
			case '2':
				// Switch to value strategy
				switchToStrategy('VALUE');
				break;
			case '3':
				// Switch to balanced strategy
				switchToStrategy('BALANCED');
				break;
		}
	});
}

// ========================================
// DATA LOADING AND PROCESSING
// ========================================

/**
 * Load data from enhanced API
 */
async function loadData(showLoader = true) {
	if (appState.isLoading) return;

	appState.isLoading = true;

	if (showLoader) {
		setLoadingState(true, appState.elements);
	}

	try {
		console.log('📡 Loading scanner data...');

		const response = await fetch('/api/scanner-results');

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		// Validate and process data
		const processedData = processApiData(data);

		// Store results
		appState.scannerResults = processedData;

		// Render everything
		renderEnhancedResults(processedData, appState.elements);

		// Update last refresh time
		appState.updateLastRefresh();

		// Show success notification
		if (showLoader) {
			showNotification('Dane zaktualizowane pomyślnie', 'success');
		}

		console.log('✅ Data loaded successfully:', {
			strategies: processedData.strategies?.length || 0,
			totalCandidates: processedData.stats?.totalUniqueCandidates || 0,
			recommendedStrategy:
				processedData.marketStatus?.recommendedStrategy || 'none',
		});
	} catch (error) {
		console.error('❌ Error loading data:', error);

		// Show error state
		displayError(appState.elements);

		// Show error notification
		showNotification('Błąd podczas ładowania danych', 'error');

		// Try to use fallback data if available
		if (!appState.scannerResults) {
			loadFallbackData();
		}
	} finally {
		appState.isLoading = false;

		if (showLoader) {
			setLoadingState(false, appState.elements);
		}
	}
}

/**
 * Process and validate API data
 */
function processApiData(rawData) {
	if (!rawData || typeof rawData !== 'object') {
		throw new Error('Invalid data structure received');
	}
	return {
		marketStatus: processMarketStatus(rawData.marketStatus),
		strategies: processStrategies(rawData.strategies),
		stats: rawData.stats || {},
		crossStrategy: rawData.crossStrategy || {},
		sectorAnalysis: rawData.sectorAnalysis || [],
		timestamp: new Date().toISOString(),
	};
}

/**
 * Process market status data
 */
function processMarketStatus(marketStatus) {
	if (!marketStatus) {
		return {
			btcDominance: '0',
			dominanceChange: '0%',
			condition: 'UNKNOWN',
			advice: 'Sprawdzam dane rynkowe...',
			recommendedStrategy: null,
			ethBtcTrend: null,
			stablecoinActivity: null,
			total2MarketCap: null,
			total2Trend: null,
		};
	}
	return {
		btcDominance: marketStatus.btcDominance || '0',
		dominanceChange: marketStatus.dominanceChange || '0%',
		condition: marketStatus.condition || 'UNKNOWN',
		advice: marketStatus.advice || 'Analizuję warunki rynkowe...',
		recommendedStrategy: marketStatus.recommendedStrategy || null,
		fearAndGreed: marketStatus.fearAndGreed || null,
		ethBtcTrend: marketStatus.ethBtcTrend || null,
		stablecoinActivity: marketStatus.stablecoinActivity || null,
		total2MarketCap: marketStatus.total2MarketCap || null,
		total2Trend: marketStatus.total2Trend || null,
	};
}

/**
 * Process strategies data
 */
function processStrategies(strategies) {
	if (!Array.isArray(strategies)) return [];
	return strategies.map((strategy) => ({
		...strategy,
		topCoins: Array.isArray(strategy.topCoins) ? strategy.topCoins : [],
		performance: strategy.performance || {
			avgScore: 0,
			strongCandidates: 0,
			avgRisk: 0,
		},
		binanceCandidates: strategy.binanceCandidates || 0,
	}));
}

/**
 * Load fallback data for demo purposes
 */
function loadFallbackData() {
	console.log('🔄 Loading fallback demo data...');

	const fallbackData = {
		marketStatus: {
			btcDominance: '62.5',
			dominanceChange: '-0.8%',
			condition: 'BTC FAVORED',
			advice: 'Trudne warunki dla altcoinów - bądź selektywny',
			recommendedStrategy: 'VALUE',
		},
		strategies: [
			{
				key: 'MOMENTUM',
				name: 'Momentum Leaders',
				emoji: '🚀',
				description: 'Monety w silnym trendzie wzrostowym',
				binanceCandidates: 15,
				performance: { avgScore: 68, strongCandidates: 8, avgRisk: 45 },
				topCoins: generateMockCoins(15, 'momentum'),
				isRecommended: false,
			},
			{
				key: 'VALUE',
				name: 'Value Hunters',
				emoji: '💎',
				description: 'Okazje po spadkach - potencjalne odbicia',
				binanceCandidates: 23,
				performance: { avgScore: 52, strongCandidates: 12, avgRisk: 35 },
				topCoins: generateMockCoins(23, 'value'),
				isRecommended: true,
			},
			{
				key: 'BALANCED',
				name: 'Balanced Plays',
				emoji: '⚖️',
				description: 'Stabilne monety w konsolidacji',
				binanceCandidates: 18,
				performance: { avgScore: 58, strongCandidates: 6, avgRisk: 28 },
				topCoins: generateMockCoins(18, 'balanced'),
				isRecommended: false,
			},
		],
		stats: {
			totalUniqueCandidates: 56,
			averageScore: 59.3,
		},
	};

	appState.scannerResults = fallbackData;
	renderEnhancedResults(fallbackData, appState.elements);

	showNotification('Używam danych demo', 'warning');
}

/**
 * Generate mock coins for demo
 */
function generateMockCoins(count, strategy) {
	const mockSymbols = [
		'MATIC',
		'UNI',
		'LINK',
		'AAVE',
		'SUSHI',
		'COMP',
		'MKR',
		'SNX',
		'YFI',
		'CRV',
		'BAL',
		'ALPHA',
		'RUNE',
		'KAVA',
		'ATOM',
	];
	const coins = [];

	for (let i = 0; i < Math.min(count, mockSymbols.length); i++) {
		const symbol = mockSymbols[i];
		let priceChange7d, momentumScore;

		// Generate strategy-appropriate data
		switch (strategy) {
			case 'momentum':
				priceChange7d = Math.random() * 80 + 15; // 15-95%
				momentumScore = Math.random() * 30 + 60; // 60-90
				break;
			case 'value':
				priceChange7d = (Math.random() - 1) * 30; // -30 to 0%
				momentumScore = Math.random() * 40 + 40; // 40-80
				break;
			case 'balanced':
				priceChange7d = (Math.random() - 0.5) * 20; // -10 to +10%
				momentumScore = Math.random() * 35 + 45; // 45-80
				break;
			default:
				priceChange7d = (Math.random() - 0.5) * 40;
				momentumScore = Math.random() * 60 + 20;
		}

		coins.push({
			symbol,
			name: `${symbol} Token`,
			rank: i + 1,
			price: Math.random() * 5 + 0.1,
			priceChange24h: (Math.random() - 0.5) * 20,
			priceChange7d,
			volumeToMcap: Math.random() * 0.5,
			sector: ['DeFi', 'Layer 1', 'Gaming', 'NFT', 'Metaverse'][
				Math.floor(Math.random() * 5)
			],
			momentum: {
				totalScore: momentumScore.toFixed(1),
				riskScore: Math.random() * 60 + 20,
				category:
					momentumScore > 70
						? 'HOT'
						: momentumScore > 50
							? 'PROMISING'
							: 'WEAK',
				signals: ['Technical Breakout', 'Volume Spike'].slice(
					0,
					Math.floor(Math.random() * 2) + 1
				),
			},
			dexData:
				Math.random() > 0.3
					? {
							hasDEXData: true,
							metrics: {
								liquidityFormatted: `${(Math.random() * 10 + 1).toFixed(1)}M`,
							},
						}
					: null,
		});
	}

	return coins;
}

// ========================================
// USER INTERFACE HELPERS
// ========================================

/**
 * Show notification to user
 */
function showNotification(message, type = 'info', duration = 3000) {
	// Remove existing notifications
	const existingNotifications = document.querySelectorAll('.notification');
	existingNotifications.forEach((n) => n.remove());

	// Create notification element
	const notification = document.createElement('div');
	notification.className = `notification notification-${type}`;
	notification.innerHTML = `
		<div class="notification-content">
			<span class="notification-icon">${getNotificationIcon(type)}</span>
			<span class="notification-message">${message}</span>
			<button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
		</div>
	`;

	// Add styles if not already added
	if (!document.getElementById('notification-styles')) {
		const styles = document.createElement('style');
		styles.id = 'notification-styles';
		styles.textContent = `
			.notification {
				position: fixed;
				top: 20px;
				right: 20px;
				background: var(--surface);
				border: 1px solid var(--border);
				border-radius: var(--radius-md);
				padding: var(--space-md);
				box-shadow: var(--shadow-lg);
				z-index: 1000;
				max-width: 400px;
				animation: slideInRight 0.3s ease;
			}
			
			.notification-success { border-left: 4px solid var(--accent-green); }
			.notification-error { border-left: 4px solid var(--accent-red); }
			.notification-warning { border-left: 4px solid var(--accent-yellow); }
			.notification-info { border-left: 4px solid var(--primary-blue); }
			
			.notification-content {
				display: flex;
				align-items: center;
				gap: var(--space-sm);
			}
			
			.notification-icon {
				font-size: 1.25rem;
			}
			
			.notification-message {
				flex-grow: 1;
				font-size: 0.875rem;
				font-weight: 500;
				color: var(--text-primary);
			}
			
			.notification-close {
				background: none;
				border: none;
				color: var(--text-muted);
				cursor: pointer;
				font-size: 1.25rem;
				padding: 0;
				width: 20px;
				height: 20px;
				display: flex;
				align-items: center;
				justify-content: center;
			}
			
			@keyframes slideInRight {
				from {
					transform: translateX(100%);
					opacity: 0;
				}
				to {
					transform: translateX(0);
					opacity: 1;
				}
			}
		`;
		document.head.appendChild(styles);
	}

	// Add to page
	document.body.appendChild(notification);

	// Auto-remove after duration
	if (duration > 0) {
		setTimeout(() => {
			if (notification.parentElement) {
				notification.style.animation = 'slideInRight 0.3s ease reverse';
				setTimeout(() => notification.remove(), 300);
			}
		}, duration);
	}
}

/**
 * Get icon for notification type
 */
function getNotificationIcon(type) {
	const icons = {
		success: '✅',
		error: '❌',
		warning: '⚠️',
		info: 'ℹ️',
	};
	return icons[type] || icons.info;
}

/**
 * Toggle onboarding section visibility
 */
function toggleOnboardingVisibility(show) {
	const onboarding = appState.elements.onboarding;
	const education = appState.elements.education;

	if (onboarding) {
		onboarding.style.display = show ? 'block' : 'none';
	}

	if (education) {
		education.style.display = show ? 'block' : 'none';
	}
}

/**
 * Switch to a specific strategy
 */
function switchToStrategy(strategyKey) {
	appState.currentStrategy = strategyKey;

	// Update tab states
	document.querySelectorAll('.strategy-tab').forEach((tab) => {
		tab.classList.remove('active');
	});
	const activeTab = document.querySelector(`[data-strategy="${strategyKey}"]`);
	if (activeTab) {
		activeTab.classList.add('active');
	}

	// Update panel states
	document.querySelectorAll('.strategy-panel').forEach((panel) => {
		panel.classList.remove('active');
	});
	const activePanel = document.querySelector(
		`.strategy-panel[data-strategy="${strategyKey}"]`
	);
	if (activePanel) {
		activePanel.classList.add('active');

		// Add entrance animation
		activePanel.style.opacity = '0';
		activePanel.style.transform = 'translateY(20px)';

		requestAnimationFrame(() => {
			activePanel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
			activePanel.style.opacity = '1';
			activePanel.style.transform = 'translateY(0)';
		});
	}

	// Analytics
	if (typeof gtag !== 'undefined') {
		gtag('event', 'strategy_switch', {
			strategy: strategyKey,
			source: 'keyboard_shortcut',
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
 * Check if element is in viewport
 */
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

/**
 * Render strategy previews for the strategy picker
 */
function renderStrategyPreviews(strategies) {
	const container = appState.elements.strategiesPreview;
	if (!container || !strategies) return;

	const strategiesConfig = {
		MOMENTUM: { emoji: '🚀', color: 'var(--accent-green)' },
		VALUE: { emoji: '💎', color: 'var(--accent-yellow)' },
		BALANCED: { emoji: '⚖️', color: 'var(--primary-blue)' },
	};

	container.innerHTML = strategies
		.map((strategy) => {
			const config = strategiesConfig[strategy.key] || {};
			const performance = strategy.performance || {};

			return `
			<div class="strategy-preview-card" onclick="selectStrategy('${strategy.key}')">
				<div class="strategy-header">
					<div class="strategy-emoji" style="color: ${config.color}">${config.emoji}</div>
					<div class="strategy-info">
						<h3>${strategy.name}</h3>
						<p class="strategy-description">${strategy.description}</p>
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
					Sprawdź ${strategy.name} →
				</button>
				
				${strategy.isRecommended ? '<div class="recommended-badge">Rekomendowana</div>' : ''}
			</div>
		`;
		})
		.join('');
}

/**
 * Select strategy from preview (called from UI)
 */
function selectStrategy(strategyKey) {
	// Scroll to main strategies section
	const strategiesSection = document.getElementById('main-strategies');
	if (strategiesSection) {
		strategiesSection.scrollIntoView({
			behavior: 'smooth',
			block: 'start',
		});
	}

	// Switch to selected strategy after scroll
	setTimeout(() => {
		switchToStrategy(strategyKey);
	}, 500);

	// Analytics
	if (typeof gtag !== 'undefined') {
		gtag('event', 'strategy_selected', {
			strategy: strategyKey,
			source: 'preview_card',
		});
	}
}

// ========================================
// ERROR HANDLING AND RECOVERY
// ========================================

/**
 * Global error handler
 */
window.addEventListener('error', (event) => {
	console.error('Global error:', event.error);

	// Show user-friendly error message
	showNotification('Wystąpił nieoczekiwany błąd', 'error');

	// Try to recover gracefully
	if (!appState.scannerResults) {
		setTimeout(() => {
			loadFallbackData();
		}, 1000);
	}
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
	console.error('Unhandled promise rejection:', event.reason);

	// Prevent the default browser console error
	event.preventDefault();

	// Show user-friendly error
	showNotification('Problem z połączeniem - spróbuję ponownie', 'warning');

	// Retry data loading after a delay
	setTimeout(() => {
		loadData(false);
	}, 5000);
});

// ========================================
// PERFORMANCE MONITORING
// ========================================

/**
 * Monitor performance and user experience
 */
function monitorPerformance() {
	// Track loading time
	if (window.performance && window.performance.timing) {
		const loadTime =
			window.performance.timing.loadEventEnd -
			window.performance.timing.navigationStart;
		console.log(`📊 Page load time: ${loadTime}ms`);

		if (typeof gtag !== 'undefined') {
			gtag('event', 'timing_complete', {
				name: 'page_load',
				value: loadTime,
			});
		}
	}

	// Monitor Core Web Vitals if available
	if ('web-vital' in window) {
		window['web-vital'].getCLS(console.log);
		window['web-vital'].getFID(console.log);
		window['web-vital'].getLCP(console.log);
	}
}

// ========================================
// ACCESSIBILITY HELPERS
// ========================================

/**
 * Enhance accessibility
 */
function enhanceAccessibility() {
	// Add skip links
	const skipLink = document.createElement('a');
	skipLink.href = '#main-strategies';
	skipLink.className = 'skip-link';
	skipLink.textContent = 'Przejdź do głównej treści';
	document.body.insertBefore(skipLink, document.body.firstChild);

	// Add ARIA live region for announcements
	const liveRegion = document.createElement('div');
	liveRegion.setAttribute('aria-live', 'polite');
	liveRegion.setAttribute('aria-atomic', 'true');
	liveRegion.className = 'sr-only';
	liveRegion.id = 'live-announcements';
	document.body.appendChild(liveRegion);

	// Announce data updates
	const originalRenderFunction = renderEnhancedResults;
	window.announceUpdate = function (message) {
		const liveRegion = document.getElementById('live-announcements');
		if (liveRegion) {
			liveRegion.textContent = message;
		}
	};
}

// ========================================
// INITIALIZATION
// ========================================

/**
 * DOM Content Loaded handler
 */
document.addEventListener('DOMContentLoaded', () => {
	console.log('🎯 DOM loaded, initializing app...');
	initializeApp();
	enhanceAccessibility();
	setTimeout(monitorPerformance, 1000);
});

// ========================================
// THEME TOGGLE LOGIC
// ========================================
document.addEventListener('DOMContentLoaded', () => {
	const themeToggle = document.getElementById('theme-toggle');
	if (themeToggle) {
		const currentTheme =
			localStorage.getItem('theme') ||
			(window.matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light');
		document.documentElement.setAttribute('data-theme', currentTheme);
		themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
		themeToggle.addEventListener('click', () => {
			let theme = document.documentElement.getAttribute('data-theme');
			if (theme === 'dark') {
				theme = 'light';
				themeToggle.textContent = '🌙';
			} else {
				theme = 'dark';
				themeToggle.textContent = '☀️';
			}
			document.documentElement.setAttribute('data-theme', theme);
			localStorage.setItem('theme', theme);
		});
	}
});

// ========================================
// EXPORTS AND GLOBAL FUNCTIONS
// ========================================

// Make key functions available globally for onclick handlers
window.selectStrategy = selectStrategy;
window.switchToStrategy = switchToStrategy;
window.loadData = loadData;
window.appState = appState;

// Export for use in other modules
export {
	appState,
	loadData,
	selectStrategy,
	switchToStrategy,
	showNotification,
};
