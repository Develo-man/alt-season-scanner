/**
 * Ulepszone UI dla Alt Season Scanner
 * Przyjazne dla użytkownika z wyjaśnieniami i priorytetami
 */

/**
 * Rysuje wskaźnik dominacji BTC na istniejącym elemencie canvas.
 * @param {number} dominance Wartość dominacji BTC.
 */
function renderDominanceGauge(dominance) {
	const canvas = document.getElementById('dominanceGaugeCanvas');
	if (!canvas) return;

	const ctx = canvas.getContext('2d');
	const centerX = canvas.width / 2;
	const centerY = canvas.height;
	const radius = 80;

	// Wyczyść canvas przed rysowaniem
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Tło wskaźnika
	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI, false);
	ctx.lineWidth = 20;
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
	ctx.stroke();

	// Wypełnienie wskaźnika
	const angle = Math.PI + (dominance / 100) * Math.PI;
	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, Math.PI, angle, false);
	ctx.lineWidth = 20;

	// Kolorowanie
	if (dominance > 65) {
		ctx.strokeStyle = '#ff3860'; // Red
	} else if (dominance > 55) {
		ctx.strokeStyle = '#f7931a'; // Orange
	} else {
		ctx.strokeStyle = '#00d395'; // Green
	}
	ctx.stroke();

	// Tekst
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 30px Inter, sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText(dominance.toFixed(1) + '%', centerX, centerY - 30);
}

/**
 * Aktualizuje aktywną fazę dominacji na wskaźniku.
 * @param {number} dominance Wartość dominacji BTC.
 */
function updateDominancePhaseIndicator(dominance) {
	document
		.querySelectorAll('.phase-indicator')
		.forEach((el) => el.classList.remove('active'));

	let activePhase;
	if (dominance < 50) activePhase = 'alt';
	else if (dominance <= 60) activePhase = 'balanced';
	else if (dominance <= 65) activePhase = 'btc-favored';
	else activePhase = 'btc-season';

	const activeEl = document.querySelector(
		`.phase-indicator[data-phase="${activePhase}"]`
	);
	if (activeEl) {
		activeEl.classList.add('active');
	}
}

/**
 * Kategoryzuje monety według priorytetów na podstawie score
 * @param {number} score - Momentum score monety
 * @returns {Object} Obiekt z priority level i sygnałem
 */
function categorizePriority(score) {
	if (score >= 60)
		return {
			level: 'high',
			signal: 'KUP',
			color: 'excellent',
			description: 'Najlepsze okazje - sprawdź pierwszych',
		};
	if (score >= 40)
		return {
			level: 'medium',
			signal: 'OBSERWUJ',
			color: 'good',
			description: 'Warte obserwacji - sprawdź gdy będziesz miał czas',
		};
	return {
		level: 'low',
		signal: 'OSTROŻNIE',
		color: 'average',
		description: 'Informacyjne - niski priorytet',
	};
}

/**
 * Interpretuje wynik ryzyka w sposób zrozumiały dla użytkownika
 * @param {number} riskScore - Wynik ryzyka (0-100)
 * @returns {Object} Obiekt z interpretacją
 */
function interpretRiskScore(riskScore) {
	if (riskScore <= 30)
		return {
			text: 'Niskie',
			color: 'success',
			advice: 'Akceptowalne ryzyko',
		};
	if (riskScore <= 60)
		return {
			text: 'Średnie',
			color: 'warning',
			advice: 'Rozważ pozycję',
		};
	return {
		text: 'Wysokie',
		color: 'danger',
		advice: 'Handluj ostrożnie!',
	};
}

/**
 * Interpretuje stosunek wolumenu do kapitalizacji
 * @param {number} volumeRatio - Stosunek volume/mcap
 * @returns {Object} Obiekt z interpretacją
 */
function interpretVolumeRatio(volumeRatio) {
	const percentage = volumeRatio * 100;
	if (percentage > 50)
		return {
			text: 'Bardzo aktywny',
			color: 'danger',
			advice: 'Coś ważnego się dzieje!',
		};
	if (percentage > 30)
		return {
			text: 'Aktywny',
			color: 'warning',
			advice: 'Duże zainteresowanie',
		};
	if (percentage > 10)
		return {
			text: 'Umiarkowany',
			color: 'success',
			advice: 'Standardowa aktywność',
		};
	return {
		text: 'Spokojny',
		color: 'secondary',
		advice: 'Niska aktywność',
	};
}

/**
 * Tworzy kartę monety z ulepszonymi wyjaśnieniami
 * @param {Object} coin - Dane monety
 * @returns {string} HTML string karty
 */
export function createCoinCard(coin) {
	const priceChange7dValue = coin.priceChange7d ?? 0;
	const priceChange = coin.priceChange7d >= 0 ? 'positive' : 'negative';
	const signals = coin.momentum.signals || [];

	// Kategoryzacja priorytetu
	const priority = categorizePriority(parseFloat(coin.momentum.totalScore));

	// Interpretacje metryk
	const riskInterpretation = interpretRiskScore(coin.momentum.riskScore ?? 0);
	const volumeInterpretation = interpretVolumeRatio(coin.volumeToMcap ?? 0);

	// Badge z priorytetem
	const priorityBadge = `
		<div class="priority-badge priority-${priority.level}">
			${priority.signal}
		</div>
	`;

	// Sprawdź akumulację
	const hasAccumulation =
		coin.momentum.accumulation && coin.momentum.accumulation.score > 0;
	const accumulationBadge =
		hasAccumulation && coin.momentum.accumulation.score >= 60
			? `<div class="accumulation-badge">
			${coin.momentum.accumulation.emoji} Akumulacja: ${coin.momentum.accumulation.score}/100
		</div>`
			: '';

	// Dane deweloperskie
	const devData = coin.developerData;
	const devActivityHTML = devData
		? `
		<div class="coin-dev-activity">
			<h5 style="margin-bottom: 0.5rem; color: var(--accent-blue);">🔧 Aktywność Deweloperska</h5>
			<div class="dev-metrics-grid">
				<div class="dev-metric">
					<span class="dev-label">Commits (4 tyg.)</span>
					<span class="dev-value">${devData.commit_count_4_weeks ?? 0}</span>
					<span class="dev-interpretation">${devData.commit_count_4_weeks > 20 ? 'Aktywny' : devData.commit_count_4_weeks > 5 ? 'Umiarkowany' : 'Niski'}</span>
				</div>
				<div class="dev-metric">
					<span class="dev-label">Współtwórcy</span>
					<span class="dev-value">${devData.pull_request_contributors ?? 0}</span>
					<span class="dev-interpretation">${devData.pull_request_contributors > 10 ? 'Duża społeczność' : 'Mała społeczność'}</span>
				</div>
				<div class="dev-metric">
					<span class="dev-label">Gwiazdki</span>
					<span class="dev-value">${devData.stars ?? 0}</span>
					<span class="dev-interpretation">${devData.stars > 1000 ? 'Popularne' : 'Niszowe'}</span>
				</div>
			</div>
		</div>
		`
		: '';

	// Dane o presji
	const pressureData = coin.pressureData;
	const pressureHTML = pressureData
		? `
		<div class="pressure-indicator">
			<h5 style="margin-bottom: 0.5rem; color: var(--accent-blue);">📊 Presja Rynkowa (1h)</h5>
			<div class="pressure-info">
				<div class="pressure-label">
					Presja Kupna: <strong>${pressureData.buyPressure}%</strong>
					<span class="pressure-interpretation">
						${
							pressureData.buyPressure > 60
								? '🟢 Przewaga kupujących'
								: pressureData.buyPressure > 40
									? '🟡 Równowaga'
									: '🔴 Przewaga sprzedających'
						}
					</span>
				</div>
				<div class="pressure-bar-container">
					<div class="pressure-bar-fill" style="width: ${pressureData.buyPressure}%;"></div>
				</div>
			</div>
		</div>
		`
		: '';

	// Smart Volume Analysis
	const smartVolumeData = coin.smartVolume;
	const smartVolumeHTML = smartVolumeData
		? `
		<div class="smart-volume-section">
			<div class="smart-volume-header">
				<h5 class="smart-volume-title">🧠 Analiza Inteligentnego Wolumenu (24h)</h5>
				<span class="market-character">${smartVolumeData.marketCharacter}</span>
			</div>
			
			<div class="volume-insight">
				<div class="volume-stat">
					<span class="stat-label">Średnia transakcja</span>
					<span class="stat-value">${smartVolumeData.avgTradeSizeFormatted}</span>
					<span class="stat-interpretation">
						${
							parseFloat(smartVolumeData.avgTradeSize) > 50000
								? 'Wieloryby aktywne'
								: parseFloat(smartVolumeData.avgTradeSize) > 10000
									? 'Średni gracz'
									: 'Handel detaliczny'
						}
					</span>
				</div>
				<div class="volume-stat">
					<span class="stat-label">Presja kupna</span>
					<span class="stat-value">${smartVolumeData.buyPressure}%</span>
					<span class="stat-interpretation">
						${
							smartVolumeData.buyPressure > 55
								? '🟢 Przewaga kupujących'
								: smartVolumeData.buyPressure > 45
									? '🟡 Równowaga'
									: '🔴 Przewaga sprzedających'
						}
					</span>
				</div>
			</div>
			
			<div class="volume-categories">
				${Object.entries(smartVolumeData.categories)
					.filter(([key, cat]) => cat.count > 0)
					.sort(
						([, a], [, b]) =>
							parseFloat(b.volumePercent) - parseFloat(a.volumePercent)
					)
					.slice(0, 3)
					.map(
						([key, cat]) => `
						<div class="volume-category">
							<span class="category-label">${cat.label}</span>
							<div class="category-value">${cat.volumePercent}%</div>
						</div>
					`
					)
					.join('')}
			</div>
			
			${renderVolumeProfile(coin.volumeProfile)}
		</div>
		`
		: '';

	// Główne metryki z interpretacjami
	const mainMetrics = `
		<div class="enhanced-metrics">
			<div class="metric-item">
				<div class="metric-header">
					<span class="metric-label">Cena</span>
					<div class="info-tooltip" data-tooltip="Aktualna cena monety na rynku">?</div>
				</div>
				<div class="metric-value">$${coin.price.toFixed(4)}</div>
				<div class="metric-interpretation">
					${coin.price < 0.01 ? 'Groszówka' : coin.price < 1 ? 'Niska cena' : 'Wyższa cena'}
				</div>
			</div>
			
			<div class="metric-item">
				<div class="metric-header">
					<span class="metric-label">Zmiana 7D</span>
					<div class="info-tooltip" data-tooltip="Zmiana ceny w ostatnim tygodniu">?</div>
				</div>
				<div class="metric-value ${priceChange}">
					${priceChange7dValue >= 0 ? '+' : ''}${priceChange7dValue.toFixed(2)}%
				</div>
				<div class="metric-interpretation">
					${
						priceChange7dValue > 50
							? 'Silny wzrost'
							: priceChange7dValue > 20
								? 'Dobry wzrost'
								: priceChange7dValue > 0
									? 'Lekki wzrost'
									: priceChange7dValue > -10
										? 'Lekki spadek'
										: 'Duży spadek'
					}
				</div>
			</div>
			
			<div class="metric-item">
				<div class="metric-header">
					<span class="metric-label">Płynność</span>
					<div class="info-tooltip" data-tooltip="Stosunek dziennego wolumenu do kapitalizacji. Wysoka wartość = duże zainteresowanie">?</div>
				</div>
				<div class="metric-value">${(coin.volumeToMcap * 100).toFixed(2)}%</div>
				<div class="metric-interpretation ${volumeInterpretation.color}">
					${volumeInterpretation.text}
				</div>
			</div>
			
			<div class="metric-item">
				<div class="metric-header">
					<span class="metric-label">Ryzyko</span>
					<div class="info-tooltip" data-tooltip="Ocena ryzyka 0-100. Uwzględnia volatilność, momentum i pozycję rynkową">?</div>
				</div>
				<div class="metric-value">${coin.momentum.riskScore ?? 0}/100</div>
				<div class="metric-interpretation ${riskInterpretation.color}">
					${riskInterpretation.text}
				</div>
			</div>
		</div>
	`;

	// Sekcja z wyjaśnieniem dlaczego moneta jest interesująca
	const whyInteresting = `
		<div class="why-interesting">
			<h5>💡 Dlaczego ${coin.symbol} jest ${priority.level === 'high' ? 'gorący' : priority.level === 'medium' ? 'interesujący' : 'na liście'}?</h5>
			<div class="interesting-points">
				<div class="point">📊 Momentum Score: ${coin.momentum.totalScore}/100 (${coin.momentum.category})</div>
				${coin.priceChange7d > 20 ? '<div class="point">🚀 Silny wzrost w ostatnim tygodniu</div>' : ''}
				${coin.volumeToMcap > 0.3 ? '<div class="point">🔥 Bardzo wysoka aktywność handlowa</div>' : ''}
				${coin.momentum.riskScore < 30 ? '<div class="point">✅ Stosunkowo niskie ryzyko</div>' : ''}
				${coin.sector !== 'Unknown' ? `<div class="point">🏷️ Sektor: ${coin.sector}</div>` : ''}
			</div>
		</div>
	`;

	const dexAnalyticsHTML = coin.dexData ? renderDEXAnalytics(coin.dexData) : '';

	// Expandable details
	const expandableDetails = `
    <div class="expandable-details">
        <button class="expand-toggle" onclick="toggleDetails(this)">
            <span>Pokaż szczegóły</span>
            <span class="expand-arrow">▼</span>
        </button>
        <div class="details-content">
            ${devActivityHTML}
            ${pressureHTML}
            ${smartVolumeHTML}
            ${dexAnalyticsHTML}
            ${whyInteresting}
        </div>
    </div>
`;

	return `
		<div class="coin-card enhanced-card" style="animation-delay: ${Math.random() * 0.3}s">
			<div class="card-header">
				<div class="coin-info">
					<div class="score-circle score-${priority.color}">
						${Math.round(coin.momentum.totalScore)}
					</div>
					<div class="coin-name">
						<h3>${coin.symbol}</h3>
						<span>${coin.name}</span>
					</div>
				</div>
				<div class="signal-badge signal-${priority.level}">
					${priority.signal}
				</div>
			</div>

			${priorityBadge}
			${accumulationBadge}
			
			${mainMetrics}
			
			${
				signals.length > 0
					? `
				<div class="coin-signals">
					${signals
						.slice(0, 2)
						.map((signal) => `<span class="signal">${signal}</span>`)
						.join('')}
				</div>
			`
					: ''
			}
			
			${expandableDetails}
		</div>
	`;
}

// Funkcja renderująca Volume Profile
function renderVolumeProfile(profileData) {
	if (!profileData) return '';

	const maxVolume = Math.max(...profileData.profile.map((p) => p.volume));
	const currentPrice = profileData.priceRange.current;
	const pocPrice = profileData.pointOfControl.price;

	return `
		<div class="volume-profile-section">
			<h6 style="margin-bottom: 0.5rem; color: var(--text-secondary);">
				📊 Profil Wolumenu (24h)
			</h6>
			<div class="volume-profile-simple">
				<div class="profile-info">
					<div class="profile-stat">
						<span class="stat-label">POC (Punkt Kontroli)</span>
						<span class="stat-value">$${formatPrice(pocPrice)}</span>
					</div>
					<div class="profile-stat">
						<span class="stat-label">Aktualna cena</span>
						<span class="stat-value">$${formatPrice(currentPrice)}</span>
					</div>
					<div class="profile-stat">
						<span class="stat-label">Pozycja vs POC</span>
						<span class="stat-value ${currentPrice > pocPrice ? 'positive' : 'negative'}">
							${currentPrice > pocPrice ? '⬆️ Powyżej' : '⬇️ Poniżej'}
						</span>
					</div>
				</div>
				<div class="profile-interpretation">
					${
						Math.abs(((currentPrice - pocPrice) / pocPrice) * 100) < 3
							? '🎯 Cena przy kluczowym poziomie'
							: currentPrice > pocPrice
								? '📈 Cena powyżej głównego poziomu - momentum wzrostowe'
								: '📉 Cena poniżej głównego poziomu - szukaj wsparcia'
					}
				</div>
			</div>
		</div>
	`;
}

// Funkcja formatująca cenę
function formatPrice(price) {
	if (price < 0.01) return price.toFixed(6);
	if (price < 1) return price.toFixed(4);
	if (price < 100) return price.toFixed(3);
	return price.toFixed(2);
}

// Enhanced legacy functions for backward compatibility
export function updateMarketStatus(status, elements, allCoinsData) {
	renderEnhancedMarketStatus(status, elements);

	// Legacy hot coins count
	const hotCoins = allCoinsData.filter(
		(c) => c.momentum?.totalScore >= 50
	).length;
	elements.opportunities.textContent = hotCoins;
}

export function renderSectorAnalysis(sectorData, elements) {
	if (!sectorData || sectorData.length === 0) {
		elements.sectorAnalysisGrid.innerHTML =
			'<p>Brak danych do analizy sektorów.</p>';
		return;
	}

	elements.sectorAnalysisGrid.innerHTML = sectorData
		.slice(0, 8)
		.map(
			(sector) => `
			<div class="sector-card">
				<div class="sector-header">
					<h3 class="sector-name">${sector.name}</h3>
					<div class="sector-score ${sector.averageScore > 50 ? 'hot' : sector.averageScore > 40 ? 'warm' : 'cool'}">
						${sector.averageScore.toFixed(1)}
					</div>
				</div>
				<div class="sector-stats">
					<div class="sector-stat">
						<span class="stat-label">Monety</span>
						<span class="stat-value">${sector.coinCount}</span>
					</div>
					<div class="sector-stat">
						<span class="stat-label">Gorące (>60)</span>
						<span class="stat-value">${sector.hotCoins}</span>
					</div>
				</div>
				<div class="sector-leader">
					<span class="leader-label">🏆 Lider sektora:</span>
					<span class="leader-name">${sector.topCoin.symbol}</span>
					<span class="leader-score">(${parseFloat(sector.topCoin.momentum.totalScore).toFixed(0)})</span>
				</div>
			</div>
		`
		)
		.join('');
}

export function renderCoins(coins, elements) {
	// Legacy function - now handled by strategy rendering
	console.warn('renderCoins is deprecated - use renderStrategies instead');
}

export function displayError(elements) {
	elements.coinsGrid.innerHTML = `
		<div class="error-message">
			<h3>⚠️ Wystąpił błąd podczas ładowania danych</h3>
			<p>Spróbuj odświeżyć stronę lub sprawdź połączenie internetowe.</p>
			<button onclick="location.reload()" class="refresh-button">
				🔄 Odśwież stronę
			</button>
		</div>
	`;
}

export function setLoadingState(isLoading, elements) {
	elements.loading.style.display = isLoading ? 'block' : 'none';

	// Hide/show strategy container instead of just coins grid
	const strategiesContainer =
		elements.strategiesContainer ||
		document.getElementById('strategies-container');
	if (strategiesContainer) {
		strategiesContainer.style.display = isLoading ? 'none' : 'block';
	}

	// Legacy coins grid
	if (elements.coinsGrid) {
		elements.coinsGrid.style.display = isLoading ? 'none' : 'block';
	}
}

// Funkcja do toggle szczegółów
window.toggleDetails = function (button) {
	const details = button.nextElementSibling;
	const arrow = button.querySelector('.expand-arrow');

	if (details.classList.contains('active')) {
		details.classList.remove('active');
		button.querySelector('span:first-child').textContent = 'Pokaż szczegóły';
		arrow.textContent = '▼';
	} else {
		details.classList.add('active');
		button.querySelector('span:first-child').textContent = 'Ukryj szczegóły';
		arrow.textContent = '▲';
	}
};
/**
 * Renders DEX analytics section for a coin
 * @param {Object} dexData - DEX analytics data
 * @returns {string} HTML string for DEX section
 */
function renderDEXAnalytics(dexData) {
	if (!dexData || !dexData.hasDEXData) {
		return `
			<div class="dex-analytics-section unavailable">
				<div class="dex-header">
					<h5 class="dex-title">🏪 DEX Analytics</h5>
					<span class="dex-status unavailable">Niedostępne</span>
				</div>
				<div class="dex-message">
					<p>Moneta dostępna tylko na giełdach scentralizowanych (CEX)</p>
					<small>Wyższe ryzyko - brak zdecentralizowanej płynności</small>
				</div>
			</div>
		`;
	}

	const buyPressure = parseFloat(dexData.buyPressure || 50);
	const liquidityLevel = getLiquidityLevel(dexData.liquidityScore);
	const volumeQuality = getVolumeQuality(dexData.volumeQualityScore);

	return `
		<div class="dex-analytics-section active">
			<div class="dex-header">
				<h5 class="dex-title">🏪 DEX Analytics (24h)</h5>
				<span class="dex-status active">Aktywny</span>
			</div>
			
			<div class="dex-key-metrics">
				<div class="dex-metric">
					<span class="metric-icon">💧</span>
					<div class="metric-content">
						<span class="metric-label">Płynność</span>
						<span class="metric-value ${liquidityLevel.color}">
							${dexData.metrics.liquidityFormatted}
						</span>
						<span class="metric-interpretation">${liquidityLevel.text}</span>
					</div>
				</div>
				
				<div class="dex-metric">
					<span class="metric-icon">📊</span>
					<div class="metric-content">
						<span class="metric-label">Wolumen 24h</span>
						<span class="metric-value">
							${dexData.metrics.volume24hFormatted}
						</span>
						<span class="metric-interpretation">${dexData.totalTxns24h.toLocaleString()} txns</span>
					</div>
				</div>
				
				<div class="dex-metric">
					<span class="metric-icon">⚖️</span>
					<div class="metric-content">
						<span class="metric-label">Presja kupna</span>
						<span class="metric-value ${buyPressure > 60 ? 'positive' : buyPressure < 40 ? 'negative' : ''}">
							${buyPressure}%
						</span>
						<span class="metric-interpretation">
							${
								buyPressure > 60
									? '🟢 Przewaga kupujących'
									: buyPressure < 40
										? '🔴 Przewaga sprzedających'
										: '🟡 Równowaga'
							}
						</span>
					</div>
				</div>
			</div>
			
			<div class="dex-quality-indicators">
				<div class="quality-indicator">
					<span class="indicator-label">Jakość wolumenu</span>
					<div class="quality-bar">
						<div class="quality-fill ${volumeQuality.color}" 
							 style="width: ${dexData.volumeQualityScore || 0}%"></div>
					</div>
					<span class="quality-text">${volumeQuality.text}</span>
				</div>
				
				<div class="dex-diversity">
					<span class="diversity-label">Dostępność DEX</span>
					<div class="dex-badges">
						${generateDEXBadges(dexData.topPairs || [])}
					</div>
					<span class="diversity-count">${dexData.uniqueDEXes || 0} różnych DEX</span>
				</div>
			</div>
			
			${renderTopDEXPairs(dexData.topPairs || [])}
			
			<div class="dex-insights">
				<h6>🔍 Kluczowe obserwacje DEX:</h6>
				<div class="insight-list">
					${generateDEXInsights(dexData)
						.map((insight) => `<div class="insight-item">${insight}</div>`)
						.join('')}
				</div>
			</div>
		</div>
	`;
}

/**
 * Get liquidity level interpretation
 * @param {number} liquidityScore - Liquidity score 0-100
 * @returns {Object} Level interpretation
 */
function getLiquidityLevel(liquidityScore) {
	if (liquidityScore >= 80) return { text: 'Doskonała', color: 'excellent' };
	if (liquidityScore >= 60) return { text: 'Dobra', color: 'good' };
	if (liquidityScore >= 40) return { text: 'Średnia', color: 'average' };
	return { text: 'Niska', color: 'poor' };
}

/**
 * Get volume quality interpretation
 * @param {number} volumeQualityScore - Volume quality score 0-100
 * @returns {Object} Quality interpretation
 */
function getVolumeQuality(volumeQualityScore) {
	if (volumeQualityScore >= 80) return { text: 'Organiczny', color: 'success' };
	if (volumeQualityScore >= 60) return { text: 'Dobry', color: 'good' };
	if (volumeQualityScore >= 40) return { text: 'Średni', color: 'average' };
	return { text: 'Podejrzany', color: 'danger' };
}

/**
 * Generate DEX badges for different platforms
 * @param {Array} topPairs - Top DEX pairs
 * @returns {string} HTML badges
 */
function generateDEXBadges(topPairs) {
	const dexes = [...new Set(topPairs.map((pair) => pair.dex))];
	const dexIcons = {
		'uniswap-v3': '🦄',
		'uniswap-v2': '🦄',
		sushiswap: '🍣',
		pancakeswap: '🥞',
		quickswap: '⚡',
		curve: '🌊',
		balancer: '⚖️',
		'1inch': '1️⃣',
	};

	return dexes
		.slice(0, 4)
		.map((dex) => {
			const icon = dexIcons[dex] || '🔄';
			const name = dex.charAt(0).toUpperCase() + dex.slice(1);
			return `<span class="dex-badge" title="${name}">${icon}</span>`;
		})
		.join('');
}

/**
 * Render top DEX pairs table
 * @param {Array} topPairs - Top DEX pairs
 * @returns {string} HTML table
 */
function renderTopDEXPairs(topPairs) {
	if (topPairs.length === 0) return '';

	return `
		<div class="top-dex-pairs">
			<h6>🏆 Top pary DEX:</h6>
			<div class="pairs-table">
				${topPairs
					.slice(0, 3)
					.map(
						(pair) => `
					<div class="pair-row">
						<div class="pair-info">
							<span class="pair-dex">${pair.dex}</span>
							<span class="pair-tokens">${pair.baseToken}/${pair.quoteToken}</span>
							<span class="pair-chain">${pair.chain}</span>
						</div>
						<div class="pair-metrics">
							<span class="pair-volume">${pair.volume24h}</span>
							<span class="pair-liquidity">${pair.liquidity}</span>
							<span class="pair-change ${parseFloat(pair.priceChange24h) >= 0 ? 'positive' : 'negative'}">
								${pair.priceChange24h}
							</span>
						</div>
					</div>
				`
					)
					.join('')}
			</div>
		</div>
	`;
}

/**
 * Generate DEX-specific insights
 * @param {Object} dexData - DEX analytics data
 * @returns {Array} Array of insight strings
 */
function generateDEXInsights(dexData) {
	const insights = [];

	// Liquidity insights
	if (dexData.liquidityScore >= 80) {
		insights.push(
			'💧 Wysoka płynność = niski slippage przy większych transakcjach'
		);
	} else if (dexData.liquidityScore < 40) {
		insights.push(
			'⚠️ Niska płynność = uważaj na slippage przy większych kwotach'
		);
	}

	// Buy/sell pressure insights
	const buyPressure = parseFloat(dexData.buyPressure || 50);
	if (buyPressure > 65) {
		insights.push('🚀 Dominuje presja kupna - możliwy dalszy wzrost');
	} else if (buyPressure < 35) {
		insights.push('📉 Dominuje presja sprzedaży - możliwy dalszy spadek');
	}

	// Volume quality insights
	if (dexData.volumeQualityScore < 40) {
		insights.push('🔍 Podejrzany wolumen - sprawdź czy to nie wash trading');
	} else if (dexData.volumeQualityScore >= 80) {
		insights.push('✅ Organiczny wolumen - prawdziwe zainteresowanie traderów');
	}

	// DEX diversity insights
	if (dexData.uniqueDEXes >= 5) {
		insights.push('🌐 Szeroka dostępność - łatwe wejście/wyjście');
	} else if (dexData.uniqueDEXes === 1) {
		insights.push('⚠️ Dostępne tylko na jednym DEX - ryzyko koncentracji');
	}

	// Activity insights
	if (dexData.totalTxns24h > 10000) {
		insights.push('🔥 Bardzo wysoka aktywność - silne zainteresowanie');
	}

	// Special opportunities
	const avgTxnSize =
		dexData.totalTxns24h > 0
			? dexData.totalVolume24h / dexData.totalTxns24h
			: 0;

	if (avgTxnSize > 10000) {
		insights.push('🐋 Duże średnie transakcje - wieloryby mogą być aktywne');
	} else if (avgTxnSize > 0 && avgTxnSize < 500) {
		insights.push('👥 Małe średnie transakcje - dominuje handel detaliczny');
	}

	return insights.slice(0, 4); // Return max 4 insights
}
// src/web/ui.js - Enhanced UI for Triple Strategy

/**
 * Enhanced UI for Alt Season Scanner with Triple Strategy
 */

/**
 * Render strategy tabs and content
 */
export function renderStrategies(strategies, elements) {
	const strategiesContainer =
		elements.strategiesContainer ||
		document.getElementById('strategies-container');

	if (!strategiesContainer) {
		console.warn('Strategies container not found');
		return;
	}

	// Create strategy tabs
	const tabsHTML = `
		<div class="strategy-tabs">
			<div class="strategy-tabs-header">
				<h2>🎯 Strategie Tradingowe</h2>
				<div class="strategy-selector">
					${strategies
						.map(
							(strategy, index) => `
						<button 
							class="strategy-tab ${index === 0 ? 'active' : ''} ${strategy.isRecommended ? 'recommended' : ''}"
							data-strategy="${strategy.key}"
							onclick="switchStrategy('${strategy.key}')"
						>
							<span class="strategy-emoji">${strategy.emoji}</span>
							<div class="strategy-info">
								<span class="strategy-name">${strategy.name}</span>
								<span class="strategy-count">${strategy.binanceCandidates} monet</span>
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

	strategiesContainer.innerHTML = tabsHTML;
}

/**
 * Render individual strategy panel
 */
function renderStrategyPanel(strategy) {
	const performance = strategy.performance || {};
	const topCoins = strategy.topCoins || [];

	return `
		<div class="strategy-header">
			<div class="strategy-meta">
				<div class="strategy-title">
					<span class="strategy-emoji-large">${strategy.emoji}</span>
					<div class="strategy-details">
						<h3>${strategy.name}</h3>
						<p class="strategy-description">${strategy.description}</p>
						<p class="strategy-advice">${strategy.advice}</p>
					</div>
				</div>
				
				<div class="strategy-metrics">
					<div class="metric-card">
						<span class="metric-label">Kandydatów</span>
						<span class="metric-value">${strategy.binanceCandidates}</span>
					</div>
					<div class="metric-card">
						<span class="metric-label">Średni Score</span>
						<span class="metric-value">${(performance.avgScore || 0).toFixed(1)}</span>
					</div>
					<div class="metric-card">
						<span class="metric-label">Wysokie Score (≥60)</span>
						<span class="metric-value">${performance.strongCandidates || 0}</span>
					</div>
					<div class="metric-card">
						<span class="metric-label">Średnie Ryzyko</span>
						<span class="metric-value">${(performance.avgRisk || 0).toFixed(1)}/100</span>
					</div>
				</div>
			</div>
			
			${
				strategy.topCoin
					? `
				<div class="strategy-champion">
					<h4>🏆 Champion strategii:</h4>
					<div class="champion-card">
						<div class="champion-info">
							<span class="champion-symbol">${strategy.topCoin.symbol}</span>
							<span class="champion-name">${strategy.topCoin.name}</span>
						</div>
						<div class="champion-metrics">
							<span class="champion-score">${strategy.topCoin.momentum?.totalScore || 0}</span>
							<span class="champion-change ${strategy.topCoin.priceChange7d >= 0 ? 'positive' : 'negative'}">
								${strategy.topCoin.priceChange7d >= 0 ? '+' : ''}${(strategy.topCoin.priceChange7d || 0).toFixed(1)}%
							</span>
						</div>
					</div>
				</div>
			`
					: ''
			}
		</div>
		
		<div class="strategy-coins">
			<h4>💎 Top okazje (${strategy.key}):</h4>
			<div class="coins-grid strategy-grid">
				${topCoins
					.slice(0, 8)
					.map((coin) => createStrategyCard(coin, strategy))
					.join('')}
			</div>
		</div>
	`;
}

/**
 * Create strategy-specific coin card
 */
function createStrategyCard(coin, strategy) {
	const priceChange7d = coin.priceChange7d || 0;
	const momentumScore = parseFloat(coin.momentum?.totalScore || 0);

	// Strategy-specific highlighting
	const getStrategyHighlight = (strategy, coin) => {
		switch (strategy.key) {
			case 'MOMENTUM':
				return priceChange7d > 30 ? 'hot-momentum' : 'momentum';
			case 'VALUE':
				return priceChange7d < -15 ? 'deep-value' : 'value';
			case 'BALANCED':
				return Math.abs(priceChange7d) < 10 ? 'balanced' : 'balanced-lean';
			default:
				return 'neutral';
		}
	};

	const highlight = getStrategyHighlight(strategy, coin);
	const signals = coin.momentum?.signals || [];

	return `
		<div class="strategy-coin-card ${highlight}">
			<div class="strategy-card-header">
				<div class="coin-basic-info">
					<span class="coin-rank">#${coin.rank}</span>
					<div class="coin-identity">
						<h5>${coin.symbol}</h5>
						<span class="coin-name">${coin.name}</span>
					</div>
				</div>
				<div class="strategy-score">
					<span class="score-value">${momentumScore.toFixed(0)}</span>
					<span class="score-label">Score</span>
				</div>
			</div>
			
			<div class="strategy-metrics">
				<div class="metric-row">
					<span class="metric-label">Cena:</span>
					<span class="metric-value">$${coin.price.toFixed(4)}</span>
				</div>
				<div class="metric-row">
					<span class="metric-label">7D zmiana:</span>
					<span class="metric-value ${priceChange7d >= 0 ? 'positive' : 'negative'}">
						${priceChange7d >= 0 ? '+' : ''}${priceChange7d.toFixed(1)}%
					</span>
				</div>
				<div class="metric-row">
					<span class="metric-label">Płynność:</span>
					<span class="metric-value">${((coin.volumeToMcap || 0) * 100).toFixed(1)}%</span>
				</div>
				<div class="metric-row">
					<span class="metric-label">Sektor:</span>
					<span class="metric-value">${coin.sector || 'Unknown'}</span>
				</div>
			</div>
			
			${getStrategyInsight(strategy, coin)}
			
			${
				signals.length > 0
					? `
				<div class="strategy-signals">
					${signals
						.slice(0, 2)
						.map(
							(signal) => `
						<span class="strategy-signal">${signal}</span>
					`
						)
						.join('')}
				</div>
			`
					: ''
			}
			
			${
				coin.dexData?.hasDEXData
					? `
				<div class="dex-mini-indicator">
					<span class="dex-available">🏪 DEX: ${coin.dexData.metrics.liquidityFormatted}</span>
				</div>
			`
					: ''
			}
		</div>
	`;
}

/**
 * Get strategy-specific insight for a coin
 */
function getStrategyInsight(strategy, coin) {
	const priceChange7d = coin.priceChange7d || 0;
	const momentumScore = parseFloat(coin.momentum?.totalScore || 0);

	switch (strategy.key) {
		case 'MOMENTUM':
			if (priceChange7d > 50) {
				return `<div class="strategy-insight momentum-hot">🔥 Silny trend wzrostowy - momentum kontynuuje</div>`;
			} else if (priceChange7d > 25) {
				return `<div class="strategy-insight momentum-good">🚀 Dobry momentum - wskacz na trend</div>`;
			} else {
				return `<div class="strategy-insight momentum-early">⚡ Wczesny momentum - obserwuj rozwój</div>`;
			}

		case 'VALUE':
			if (priceChange7d < -20) {
				return `<div class="strategy-insight value-deep">💎 Głęboki spadek - potencjalne dno</div>`;
			} else if (priceChange7d < -10) {
				return `<div class="strategy-insight value-moderate">🛒 Umiarkowany spadek - dobra okazja</div>`;
			} else {
				return `<div class="strategy-insight value-stabilizing">📈 Stabilizacja po spadku - wczesne odbicie</div>`;
			}

		case 'BALANCED':
			if (Math.abs(priceChange7d) < 5) {
				return `<div class="strategy-insight balanced-stable">⚖️ Stabilna konsolidacja - bezpieczny wybór</div>`;
			} else if (priceChange7d > 0) {
				return `<div class="strategy-insight balanced-upward">📊 Lekki trend wzrostowy - konserwatywny wzrost</div>`;
			} else {
				return `<div class="strategy-insight balanced-correcting">🔄 Lekka korekta - dobry moment wejścia</div>`;
			}

		default:
			return '';
	}
}

/**
 * Render cross-strategy analysis
 */
export function renderCrossStrategyAnalysis(crossStrategy, elements) {
	const crossContainer =
		elements.crossStrategyContainer ||
		document.getElementById('cross-strategy-container');

	if (!crossContainer || !crossStrategy) return;

	const multiStrategyCoins = crossStrategy.multiStrategyCoins || [];
	const insights = crossStrategy.insights || [];

	const html = `
		<div class="cross-strategy-section">
			<div class="cross-strategy-header">
				<h3>🎯 Analiza Multi-Strategy</h3>
				<p>Monety które pasują do wielu strategii - najsilniejsze sygnały</p>
			</div>
			
			${
				insights.length > 0
					? `
				<div class="cross-strategy-insights">
					${insights
						.map(
							(insight) => `
						<div class="insight-item">${insight}</div>
					`
						)
						.join('')}
				</div>
			`
					: ''
			}
			
			${
				multiStrategyCoins.length > 0
					? `
				<div class="multi-strategy-coins">
					<h4>🏆 Multi-Strategy Champions:</h4>
					<div class="multi-coins-grid">
						${multiStrategyCoins
							.slice(0, 6)
							.map(
								(entry) => `
							<div class="multi-coin-card">
								<div class="multi-coin-header">
									<span class="multi-coin-symbol">${entry.coin.symbol}</span>
									<span class="multi-coin-score">${entry.totalScore.toFixed(0)}</span>
								</div>
								<div class="multi-coin-strategies">
									${entry.strategies
										.map(
											(strategy) => `
										<span class="strategy-tag strategy-${strategy.toLowerCase()}">
											${TRADING_STRATEGIES[strategy]?.emoji || '📊'} ${strategy}
										</span>
									`
										)
										.join('')}
								</div>
								<div class="multi-coin-change ${entry.coin.priceChange7d >= 0 ? 'positive' : 'negative'}">
									${entry.coin.priceChange7d >= 0 ? '+' : ''}${(entry.coin.priceChange7d || 0).toFixed(1)}% (7D)
								</div>
							</div>
						`
							)
							.join('')}
					</div>
				</div>
			`
					: `
				<div class="no-multi-strategy">
					<p>📊 Brak nakładających się strategii - każda znajduje unikalne okazje</p>
				</div>
			`
			}
		</div>
	`;

	crossContainer.innerHTML = html;
}

/**
 * Render enhanced market status with strategy recommendations
 */
export function renderEnhancedMarketStatus(marketStatus, elements) {
	// Update basic market status
	elements.btcDominance.textContent = marketStatus.btcDominance + '%';
	elements.dominanceChange.textContent = marketStatus.dominanceChange;
	elements.dominanceChange.className = marketStatus.dominanceChange.startsWith(
		'+'
	)
		? 'change negative'
		: 'change positive';

	elements.marketCondition.textContent = marketStatus.condition;
	elements.conditionAdvice.textContent = marketStatus.advice;

	// Add strategy recommendation
	const strategyRecommendation =
		elements.strategyRecommendation ||
		document.getElementById('strategy-recommendation');
	if (strategyRecommendation && marketStatus.recommendedStrategy) {
		const strategy = TRADING_STRATEGIES[marketStatus.recommendedStrategy];
		if (strategy) {
			strategyRecommendation.innerHTML = `
				<div class="recommended-strategy">
					<h4>💡 Rekomendowana Strategia</h4>
					<div class="strategy-recommendation-card">
						<span class="strategy-emoji">${strategy.emoji}</span>
						<div class="strategy-rec-info">
							<span class="strategy-rec-name">${strategy.name}</span>
							<span class="strategy-rec-reason">${marketStatus.advice}</span>
						</div>
					</div>
				</div>
			`;
		}
	}

	// Update Fear & Greed if available
	if (marketStatus.fearAndGreed) {
		elements.fngValue.textContent = marketStatus.fearAndGreed.value;
		elements.fngClassification.textContent =
			marketStatus.fearAndGreed.classification;

		if (marketStatus.fearAndGreed.value < 30) {
			elements.fngValue.className = 'value negative';
		} else if (marketStatus.fearAndGreed.value > 70) {
			elements.fngValue.className = 'value positive';
		} else {
			elements.fngValue.className = 'value';
		}
	}
}

/**
 * Render strategy comparison chart
 */
export function renderStrategyComparison(strategies, elements) {
	const comparisonContainer =
		elements.strategyComparison ||
		document.getElementById('strategy-comparison');

	if (!comparisonContainer) return;

	const html = `
		<div class="strategy-comparison-section">
			<h3>📊 Porównanie Strategii</h3>
			<div class="comparison-grid">
				${strategies
					.map(
						(strategy) => `
					<div class="comparison-card ${strategy.isRecommended ? 'recommended' : ''}">
						<div class="comparison-header">
							<span class="comparison-emoji">${strategy.emoji}</span>
							<h4>${strategy.name}</h4>
							${strategy.isRecommended ? '<span class="rec-badge">Rekomendowana</span>' : ''}
						</div>
						<div class="comparison-metrics">
							<div class="comparison-metric">
								<span class="metric-label">Kandydaci</span>
								<span class="metric-value">${strategy.binanceCandidates}</span>
							</div>
							<div class="comparison-metric">
								<span class="metric-label">Średni Score</span>
								<span class="metric-value">${(strategy.performance?.avgScore || 0).toFixed(1)}</span>
							</div>
							<div class="comparison-metric">
								<span class="metric-label">Wysokie Score</span>
								<span class="metric-value">${strategy.performance?.strongCandidates || 0}</span>
							</div>
							<div class="comparison-metric">
								<span class="metric-label">Ryzyko</span>
								<span class="metric-value">${(strategy.performance?.avgRisk || 0).toFixed(0)}/100</span>
							</div>
						</div>
						<div class="comparison-advice">
							<p>${strategy.advice}</p>
						</div>
					</div>
				`
					)
					.join('')}
			</div>
		</div>
	`;

	comparisonContainer.innerHTML = html;
}

/**
 * Switch between strategy tabs
 */
window.switchStrategy = function (strategyKey) {
	// Update tab states
	document.querySelectorAll('.strategy-tab').forEach((tab) => {
		tab.classList.remove('active');
	});
	document
		.querySelector(`[data-strategy="${strategyKey}"]`)
		.classList.add('active');

	// Update panel states
	document.querySelectorAll('.strategy-panel').forEach((panel) => {
		panel.classList.remove('active');
	});
	document
		.querySelector(`.strategy-panel[data-strategy="${strategyKey}"]`)
		.classList.add('active');

	// Trigger analytics event
	if (typeof gtag !== 'undefined') {
		gtag('event', 'strategy_switch', {
			strategy: strategyKey,
		});
	}
};

/**
 * Enhanced main render function
 */
export function renderEnhancedResults(results, elements) {
	// Render market status
	renderEnhancedMarketStatus(results.marketStatus, elements);

	// Render strategies
	renderStrategies(results.strategies, elements);

	// Render cross-strategy analysis
	renderCrossStrategyAnalysis(results.crossStrategy, elements);

	// Render strategy comparison
	renderStrategyComparison(results.strategies, elements);

	// Render sector analysis (traditional)
	renderSectorAnalysis(results.sectorAnalysis, elements);

	// Update last update time
	elements.lastUpdate.textContent = new Date().toLocaleTimeString();
}

/**
 * Create strategy performance chart (for future Chart.js integration)
 */
export function createStrategyPerformanceChart(strategies, chartContainer) {
	if (!chartContainer || typeof Chart === 'undefined') return;

	const ctx = chartContainer.getContext('2d');

	const data = {
		labels: strategies.map((s) => s.name),
		datasets: [
			{
				label: 'Średni Score',
				data: strategies.map((s) => s.performance?.avgScore || 0),
				backgroundColor: strategies.map((s) => {
					switch (s.key) {
						case 'MOMENTUM':
							return 'rgba(0, 255, 163, 0.8)';
						case 'VALUE':
							return 'rgba(255, 184, 0, 0.8)';
						case 'BALANCED':
							return 'rgba(0, 212, 255, 0.8)';
						default:
							return 'rgba(255, 255, 255, 0.8)';
					}
				}),
				borderWidth: 2,
				borderColor: '#fff',
			},
		],
	};

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: false,
			},
		},
		scales: {
			y: {
				beginAtZero: true,
				max: 100,
				grid: {
					color: 'rgba(255, 255, 255, 0.1)',
				},
			},
			x: {
				grid: {
					display: false,
				},
			},
		},
	};

	new Chart(ctx, {
		type: 'bar',
		data: data,
		options: options,
	});
}

/**
 * Add strategy tooltips and help system
 */
export function initializeStrategyHelp() {
	document.querySelectorAll('.strategy-tab').forEach((tab) => {
		tab.addEventListener('mouseenter', (e) => {
			const strategyKey = e.target.dataset.strategy;
			const strategy = TRADING_STRATEGIES[strategyKey];

			if (strategy) {
				showStrategyTooltip(e.target, strategy);
			}
		});

		tab.addEventListener('mouseleave', () => {
			hideStrategyTooltip();
		});
	});
}

/**
 * Show strategy tooltip
 */
function showStrategyTooltip(element, strategy) {
	const tooltip = document.createElement('div');
	tooltip.className = 'strategy-tooltip';
	tooltip.innerHTML = `
		<div class="tooltip-header">
			<span>${strategy.emoji}</span>
			<strong>${strategy.name}</strong>
		</div>
		<p>${strategy.description}</p>
		<div class="tooltip-criteria">
			<strong>Kryteria:</strong>
			<ul>
				<li>Zmiana 7D: ${strategy.criteria.min7dChange}% - ${strategy.criteria.max7dChange || '∞'}%</li>
				<li>Min. płynność: ${(strategy.criteria.minVolumeRatio * 100).toFixed(1)}%</li>
				<li>Max. cena: ${strategy.criteria.maxPrice}</li>
			</ul>
		</div>
	`;

	document.body.appendChild(tooltip);

	// Position tooltip
	const rect = element.getBoundingClientRect();
	tooltip.style.left = rect.left + 'px';
	tooltip.style.top = rect.bottom + 10 + 'px';
}

/**
 * Hide strategy tooltip
 */
function hideStrategyTooltip() {
	const tooltip = document.querySelector('.strategy-tooltip');
	if (tooltip) {
		tooltip.remove();
	}
}

// Import strategy definitions (this would be imported from the backend)
const TRADING_STRATEGIES = {
	MOMENTUM: {
		name: '🚀 MOMENTUM LEADERS',
		emoji: '🚀',
		description: 'Monety w silnym trendzie wzrostowym',
		criteria: {
			min7dChange: 15,
			max7dChange: 200,
			minVolumeRatio: 0.04,
			maxPrice: 3,
		},
	},
	VALUE: {
		name: '💎 VALUE HUNTERS',
		emoji: '💎',
		description: 'Okazje po spadkach - potencjalne odbicia',
		criteria: {
			min7dChange: -25,
			max7dChange: 5,
			minVolumeRatio: 0.03,
			maxPrice: 3,
		},
	},
	BALANCED: {
		name: '⚖️ BALANCED PLAYS',
		emoji: '⚖️',
		description: 'Stabilne monety w konsolidacji',
		criteria: {
			min7dChange: -10,
			max7dChange: 20,
			minVolumeRatio: 0.03,
			maxPrice: 3,
		},
	},
};
