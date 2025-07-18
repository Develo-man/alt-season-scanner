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

// Update Market Status - rozszerzone o interpretacje
export function updateMarketStatus(status, elements, allCoinsData) {
	elements.btcDominance.textContent = status.btcDominance + '%';
	elements.dominanceChange.textContent = status.dominanceChange;
	elements.dominanceChange.className = status.dominanceChange.startsWith('+')
		? 'change negative' // Wzrost dominacji BTC = źle dla altów
		: 'change positive'; // Spadek dominacji BTC = dobrze dla altów

	const hotCoins = allCoinsData.filter(
		(c) => c.momentum.totalScore >= 50
	).length;
	elements.opportunities.textContent = hotCoins;

	renderDominanceGauge(parseFloat(status.btcDominance));
	updateDominancePhaseIndicator(parseFloat(status.btcDominance));

	if (status.fearAndGreed) {
		elements.fngValue.textContent = status.fearAndGreed.value;
		elements.fngClassification.textContent = status.fearAndGreed.classification;

		if (status.fearAndGreed.value < 30) {
			elements.fngValue.className = 'value negative';
		} else if (status.fearAndGreed.value > 70) {
			elements.fngValue.className = 'value positive';
		} else {
			elements.fngValue.className = 'value';
		}
	}

	elements.marketCondition.textContent = status.condition;
	elements.conditionAdvice.textContent = status.advice;
}

// Rendering sektorów z lepszymi opisami
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

// Renderowanie monet z priorytetami
export function renderCoins(coins, elements) {
	// Grupuj monety według priorytetów
	const highPriority = coins.filter(
		(c) => parseFloat(c.momentum.totalScore) >= 60
	);
	const mediumPriority = coins.filter(
		(c) =>
			parseFloat(c.momentum.totalScore) >= 40 &&
			parseFloat(c.momentum.totalScore) < 60
	);
	const lowPriority = coins.filter(
		(c) => parseFloat(c.momentum.totalScore) < 40
	);

	let html = '';

	// Sekcja wysokiego priorytetu
	if (highPriority.length > 0) {
		html += `
			<div class="priority-section">
				<div class="priority-header">
					<div class="priority-badge priority-high">Wysoki Priorytet</div>
					<div class="priority-info">
						<h3>🔥 Najgorętsze Okazje</h3>
						<p>Monety z momentem score ≥60 - sprawdź je pierwszych!</p>
					</div>
				</div>
				<div class="coins-grid">
					${highPriority.map((coin) => createCoinCard(coin)).join('')}
				</div>
			</div>
		`;
	}

	// Sekcja średniego priorytetu
	if (mediumPriority.length > 0) {
		html += `
			<div class="priority-section">
				<div class="priority-header">
					<div class="priority-badge priority-medium">Średni Priorytet</div>
					<div class="priority-info">
						<h3>👀 Warte Obserwacji</h3>
						<p>Monety z potencjałem (40-59) - sprawdź gdy będziesz miał czas</p>
					</div>
				</div>
				<div class="coins-grid">
					${mediumPriority.map((coin) => createCoinCard(coin)).join('')}
				</div>
			</div>
		`;
	}

	// Sekcja niskiego priorytetu
	if (lowPriority.length > 0) {
		html += `
			<div class="priority-section">
				<div class="priority-header">
					<div class="priority-badge priority-low">Niski Priorytet</div>
					<div class="priority-info">
						<h3>📊 Informacyjne</h3>
						<p>Monety do obserwowania w dłuższym terminie</p>
					</div>
				</div>
				<div class="coins-grid">
					${lowPriority.map((coin) => createCoinCard(coin)).join('')}
				</div>
			</div>
		`;
	}

	elements.coinsGrid.innerHTML = html;
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
	elements.coinsGrid.style.display = isLoading ? 'none' : 'block';
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
