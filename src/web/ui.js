/**
 * Rysuje wskaźnik dominacji BTC na istniejącym elemencie canvas.
 * @param {number} dominance Wartość dominacji BTC.
 */
function renderDominanceGauge(dominance) {
	const canvas = document.getElementById('dominanceGaugeCanvas');
	if (!canvas) return;

	const ctx = canvas.getContext('2d');
	const centerX = canvas.width / 2;
	const centerY = canvas.height; // Dopasuj, by wskaźnik był pełniejszy
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

// Create Coin Card
export function createCoinCard(coin) {
	const priceChange7dValue = coin.priceChange7d ?? 0;
	const priceChange = coin.priceChange7d >= 0 ? 'positive' : 'negative';
	const signals = coin.momentum.signals || [];

	// Check for accumulation data
	const hasAccumulation =
		coin.momentum.accumulation && coin.momentum.accumulation.score > 0;
	const accumulationBadge =
		hasAccumulation && coin.momentum.accumulation.score >= 60
			? `<div class="accumulation-badge">
            ${coin.momentum.accumulation.emoji} Accumulation: ${coin.momentum.accumulation.score}
        </div>`
			: '';

	const devData = coin.developerData;
	const devActivityHTML = devData
		? `
        <div class="coin-dev-activity">
            <div class="dev-metric">
                <span class="dev-label">Commits (4 week)</span>
                <span class="dev-value">${
									devData.commit_count_4_weeks ?? 'brak'
								}</span>
            </div>
            <div class="dev-metric">
                <span class="dev-label">Contributors</span>
                <span class="dev-value">${
									devData.pull_request_contributors ?? 'brak'
								}</span>
            </div>
            <div class="dev-metric">
                <span class="dev-label">Stars</span>
                <span class="dev-value">${devData.stars ?? 'brak'}</span>
            </div>
        </div>
    `
		: '';

	const pressureData = coin.pressureData;
	const pressureHTML = pressureData
		? `
            <div class="pressure-indicator">
            <div class="pressure-label">Buy Pressure (1h): <strong>${pressureData.buyPressure}%</strong></div>
            <div class="pressure-bar-container">
                <div class="pressure-bar-fill" style="width: ${pressureData.buyPressure}%;"></div>
                </div>
            </div>
            `
		: '';

	const smartVolumeData = coin.smartVolume;
	const smartVolumeHTML = smartVolumeData
		? `
    <div class="smart-volume-section">
        <div class="smart-volume-header">
            <h4 class="smart-volume-title">Smart Volume Analysis (24h)</h4>
            <span class="market-character">${
							smartVolumeData.marketCharacter
						}</span>
        </div>
        
        <div class="volume-categories">
            ${Object.entries(smartVolumeData.categories)
							.filter(([key, cat]) => cat.count > 0)
							.map(
								([key, cat]) => `
                    <div class="volume-category">
                        <span class="category-label">${cat.label}</span>
                        <div class="category-value">${cat.volumePercent}%</div>
                        <div class="category-trades">${cat.count} trades</div>
                    </div>
                `
							)
							.join('')}
        </div>
        
        <div class="metric" style="background: rgba(123, 63, 242, 0.1); margin-top: 1rem;">
            <div class="metric-label">Średnia wielkość transakcji</div>
            <div class="metric-value">${
							smartVolumeData.avgTradeSizeFormatted
						}</div>
        </div>
        
        ${renderVolumeProfile(coin.volumeProfile)}
    </div>
`
		: '';

	function renderVolumeProfile(profileData) {
		if (!profileData) return '';

		const maxVolume = Math.max(...profileData.profile.map((p) => p.volume));
		const currentPrice = profileData.priceRange.current;
		const pocPrice = profileData.pointOfControl.price;

		return `
        <div class="volume-profile-section">
            <h5 style="font-size: 0.875rem; margin-bottom: 0.75rem; color: var(--text-secondary);">
                Volume Profile (24h) 
                <span class="tooltip-container">
                    <span class="tooltip-text">
                        Pokazuje na jakich poziomach cenowych był największy wolumen. 
                        POC (Point of Control) = poziom z największym wolumenem.
                        Value Area = zakres cenowy gdzie było 70% wolumenu.
                    </span>
                </span>
            </h5>
            
            <div class="volume-profile-chart">
                ${profileData.profile
									.map((level, index) => {
										const height = (level.volume / maxVolume) * 100;
										const width = 100 / profileData.profile.length;
										const left = index * width;
										const isPOC =
											Math.abs(
												pocPrice - (level.priceFrom + level.priceTo) / 2
											) < 0.001;

										return `
                        <div class="volume-bar ${isPOC ? 'poc' : ''}" 
                             style="height: ${height}%; width: ${width}%; left: ${left}%;"
                             title="${formatPrice(
																level.priceFrom
															)} - ${formatPrice(level.priceTo)}: ${
																level.volumePercent
															}% volume">
                        </div>
                    `;
									})
									.join('')}
                
                <div class="value-area-indicator" 
                     style="left: ${getValueAreaPosition(
												profileData,
												'left'
											)}%; 
                            width: ${getValueAreaPosition(
															profileData,
															'width'
														)}%;">
                </div>
                
                <div class="poc-indicator">
                    POC: ${formatPrice(pocPrice)}
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-secondary);">
                <span>Low: ${formatPrice(profileData.priceRange.min)}</span>
                <span>Current: ${formatPrice(currentPrice)}</span>
                <span>High: ${formatPrice(profileData.priceRange.max)}</span>
            </div>
        </div>
    `;
	}

	// Funkcje pomocnicze
	function formatPrice(price) {
		if (price < 0.01) return price.toFixed(6);
		if (price < 1) return price.toFixed(4);
		if (price < 100) return price.toFixed(3);
		return price.toFixed(2);
	}

	function getValueAreaPosition(profileData, type) {
		const range = profileData.priceRange.max - profileData.priceRange.min;
		const vaLowPos =
			((profileData.valueArea.low - profileData.priceRange.min) / range) * 100;
		const vaHighPos =
			((profileData.valueArea.high - profileData.priceRange.min) / range) * 100;

		if (type === 'left') return vaLowPos;
		if (type === 'width') return vaHighPos - vaLowPos;
		return 0;
	}

	return `
                <div class="coin-card" style="animation-delay: ${
									Math.random() * 0.3
								}s">
                    <div class="coin-header">
                        <div class="coin-info">
                            <div class="coin-rank">${Math.round(
															coin.momentum.totalScore
														)}</div>
                            <div class="coin-name">
                                <h3>${coin.symbol}</h3>
                                <span>${coin.name}</span>
                            </div>
                        </div>
                        <div class="momentum-score">${
													coin.momentum.category
												}</div>
                    </div>

                                ${accumulationBadge}
                    
                    <div class="coin-metrics">
                        <div class="metric">
                            <div class="metric-label">Price</div>
                            <div class="metric-value">$${coin.price.toFixed(
															4
														)}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">7D Change</div>
                            <div class="metric-value ${priceChange}">${
															priceChange7dValue >= 0 ? '+' : ''
														}${priceChange7dValue.toFixed(2)}%</div>
                        </div>
                   <div class="metric">
                            <div class="metric-label tooltip-container">
                                Volume/MCap
                                <span class="tooltip-text">Stosunek wolumenu z 24h do kapitalizacji rynkowej. Pokazuje płynność i zainteresowanie. Wysoka wartość (>30%) sugeruje, że coś się dzieje.</span>
                            </div>
                            <div class="metric-value">${(
															(coin.volumeToMcap ?? 0) * 100
														).toFixed(2)}%</div>
                        </div>
                            <div class="metric">
                            <div class="metric-label tooltip-container">
                                Risk Score
                                <span class="tooltip-text">Ocena ryzyka (0-100, im niżej tym lepiej). Uwzględnia: gwałtowność wzrostów (FOMO), spadki momentum (korekta), niską płynność i pozycję w rankingu.</span>
                            </div>
                            <div class="metric-value">${
															coin.momentum.riskScore ?? 0
														}/100</div>
                        </div>
                    </div>
                    
                    ${devActivityHTML}
                    ${pressureHTML} 
                    ${smartVolumeHTML} 
                      ${
												signals.length > 0
													? `
                <div class="coin-signals">
                    ${signals
											.slice(0, 3)
											.map((signal) => `<span class="signal">${signal}</span>`)
											.join('')}
                </div>
            `
													: ''
											}
        </div>
    `;
}

// Update Market Status
export function updateMarketStatus(status, elements, allCoinsData) {
	elements.btcDominance.textContent = status.btcDominance + '%';
	elements.dominanceChange.textContent = status.dominanceChange;
	elements.dominanceChange.className = status.dominanceChange.startsWith('+')
		? 'change positive'
		: 'change negative';
	elements.opportunities.textContent = allCoinsData.filter(
		(c) => c.momentum.totalScore >= 50
	).length;
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

	const hotCoins = allCoinsData.filter(
		(c) => c.momentum.totalScore >= 50
	).length;
	elements.opportunities.textContent = hotCoins;
	renderDominanceGauge(parseFloat(status.btcDominance));
	updateDominancePhaseIndicator(parseFloat(status.btcDominance));
}

// rendering selectors
export function renderSectorAnalysis(sectorData, elements) {
	if (!sectorData || sectorData.length === 0) {
		elements.sectorAnalysisGrid.innerHTML =
			'<p>Brak danych do analizy sektorów.</p>';
		return;
	}

	elements.sectorAnalysisGrid.innerHTML = sectorData
		.slice(0, 8) // Pokaż do 8 najgorętszych sektorów
		.map(
			(sector) => `
                    <div class="sector-card">
                        <div>
                            <h3 class="sector-name">${sector.name}</h3>
                            <p class="avg-score">Śr. wynik: ${sector.averageScore.toFixed(
															2
														)}</p>
                        </div>
                        <p class="top-coin">
                            Lider: ${sector.topCoin.binance.symbol}
                            <span>(${parseFloat(
															sector.topCoin.momentum.totalScore
														).toFixed(0)})</span>
                        </p>
                    </div>
                `
		)
		.join('');
}

// Render Coins
export function renderCoins(coins, elements) {
	elements.coinsGrid.innerHTML = coins
		.map((coin) => createCoinCard(coin))
		.join('');
}
export function displayError(elements) {
	elements.coinsGrid.innerHTML = `<p>Wystąpił błąd podczas ładowania danych. Spróbuj ponownie później.</p>`;
}

export function setLoadingState(isLoading, elements) {
	elements.loading.style.display = isLoading ? 'block' : 'none';
	elements.coinsGrid.style.display = isLoading ? 'none' : 'grid';
}
