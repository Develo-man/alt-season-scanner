// Chart.js configuration for Bitcoin theme
Chart.defaults.color = '#b8b8b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.font.family =
	'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

// Color palette
const colors = {
	bitcoin: '#f7931a',
	bitcoinLight: '#ffa500',
	bitcoinDark: '#d87a00',
	success: '#00d395',
	danger: '#ff3860',
	warning: '#ffdd57',
	info: '#3298dc',
	text: '#ffffff',
	textSecondary: '#b8b8b8',
	gridLines: 'rgba(255, 255, 255, 0.05)',
	glass: 'rgba(255, 255, 255, 0.03)',
};

// Chart instances
let charts = {
	dominance: null,
	momentum: null,
	volume: null,
	riskReward: null,
	heatmap: null,
};

// Data storage
let scannerData = null;
let dominanceHistory = [];

// Initialize all charts
async function initCharts() {
	showLoading(true);

	try {
		// Fetch data
		await fetchScannerData();
		await fetchDominanceHistory();

		// Create charts
		createDominanceChart();
		createMomentumChart();
		createVolumeChart();
		createRiskRewardChart();
		createHeatmapChart();

		// Update stats
		updateStats();

		// Setup event listeners
		setupEventListeners();

		initializeHelpMode();
	} catch (error) {
		console.error('Error initializing charts:', error);
	} finally {
		showLoading(false);
	}
}

// --- Inicjalizacja Trybu Pomocy ---
function initializeHelpMode() {
	const helpToggle = document.getElementById('help-toggle');
	if (helpToggle) {
		helpToggle.addEventListener('change', () => {
			document.body.classList.toggle('help-mode-active');
		});
	}
}

// Fetch scanner data
async function fetchScannerData() {
	try {
		console.log('📡 Pobieranie danych skanera...');
		const response = await fetch('/api/scanner-results');

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		scannerData = await response.json();

		console.log('✅ Dane skanera pobrane:', {
			strategies: scannerData.strategies?.length || 0,
			marketStatus: !!scannerData.marketStatus,
			hasCoins: !!scannerData.strategies?.[0]?.topCoins?.length,
		});

		// Sprawdź strukturę danych
		if (!scannerData.strategies || scannerData.strategies.length === 0) {
			console.warn('⚠️ Brak strategii w danych - używam mock data');
			scannerData = generateMockData();
		}
	} catch (error) {
		console.error('❌ Błąd pobierania danych skanera:', error.message);
		console.log('🔄 Używam mock data jako fallback');
		scannerData = generateMockData();
	}
}

// Fetch dominance history
async function fetchDominanceHistory() {
	try {
		console.log('📡 Pobieram historię dominacji BTC...');

		const response = await fetch('/api/dominance-history');

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.json();

		if (!Array.isArray(data)) {
			throw new Error('Nieprawidłowy format danych z API');
		}

		if (data.length === 0) {
			console.warn('⚠️ API zwróciło pustą tablicę - używam mock data');
			dominanceHistory = generateMockDominanceHistory();
		} else {
			dominanceHistory = data;
			console.log(`✅ Pobrano ${data.length} punktów danych dominacji`);
		}
	} catch (error) {
		console.error(
			'❌ Błąd podczas pobierania historii dominacji:',
			error.message
		);
		console.log('🔄 Używam mock data jako fallback');
		dominanceHistory = generateMockDominanceHistory();
	}
}

// 1. BTC Dominance Line Chart
function createDominanceChart() {
	const ctx = document.getElementById('dominanceChart').getContext('2d');

	// Sprawdź czy mamy dane
	if (!dominanceHistory || dominanceHistory.length === 0) {
		console.warn('Brak danych dominacji - używam mock data');
		dominanceHistory = generateMockDominanceHistory();
	}

	// Filtruj i waliduj dane
	const validData = dominanceHistory.filter((d) => {
		return (
			d && typeof d.btc === 'number' && d.btc > 0 && d.btc < 100 && d.timestamp
		);
	});

	if (validData.length === 0) {
		console.error('Brak prawidłowych danych dominacji');
		return;
	}

	console.log(`📊 Wykres dominacji: ${validData.length} punktów danych`);

	const data = {
		labels: validData.map((d) => {
			const date = new Date(d.timestamp);
			return date.toLocaleDateString('pl-PL', {
				month: 'short',
				day: 'numeric',
				hour: validData.length < 50 ? 'numeric' : undefined,
			});
		}),
		datasets: [
			{
				label: 'BTC Dominance %',
				data: validData.map((d) => d.btc.toFixed(2)),
				borderColor: colors.bitcoin,
				backgroundColor: `${colors.bitcoin}20`,
				borderWidth: 3,
				fill: true,
				tension: 0.4,
				pointBackgroundColor: colors.bitcoin,
				pointBorderColor: '#ffffff',
				pointBorderWidth: 2,
				pointRadius: 4,
				pointHoverRadius: 6,
			},
			{
				label: 'ETH Dominance %',
				data: validData.map((d) => (d.eth || 0).toFixed(2)),
				borderColor: colors.info,
				backgroundColor: `${colors.info}20`,
				borderWidth: 2,
				fill: true,
				tension: 0.4,
				pointBackgroundColor: colors.info,
				pointBorderColor: '#ffffff',
				pointBorderWidth: 1,
				pointRadius: 3,
				pointHoverRadius: 5,
			},
		],
	};

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		interaction: {
			mode: 'index',
			intersect: false,
		},
		plugins: {
			legend: {
				display: true,
				position: 'top',
				labels: {
					color: colors.text,
					font: {
						size: 14,
						weight: 'bold',
					},
					padding: 20,
					usePointStyle: true,
					pointStyle: 'circle',
				},
			},
			tooltip: {
				backgroundColor: 'rgba(0, 0, 0, 0.9)',
				titleColor: colors.bitcoin,
				bodyColor: colors.text,
				borderColor: colors.bitcoin,
				borderWidth: 1,
				cornerRadius: 8,
				displayColors: true,
				callbacks: {
					title: function (context) {
						const date = new Date(validData[context[0].dataIndex].timestamp);
						return date.toLocaleDateString('pl-PL', {
							weekday: 'long',
							year: 'numeric',
							month: 'long',
							day: 'numeric',
							hour: '2-digit',
						});
					},
					label: function (context) {
						return `${context.dataset.label}: ${context.parsed.y}%`;
					},
					afterBody: function (context) {
						const dataPoint = validData[context[0].dataIndex];
						const btc = dataPoint.btc;
						const phase =
							btc > 65
								? 'Bitcoin Season'
								: btc > 55
									? 'BTC Favored'
									: btc > 50
										? 'Balanced'
										: 'Alt Season';
						return [`Faza rynku: ${phase}`];
					},
				},
			},
		},
		scales: {
			x: {
				grid: {
					color: colors.gridLines,
					lineWidth: 1,
				},
				ticks: {
					color: colors.textSecondary,
					font: {
						size: 12,
					},
					maxTicksLimit: 8,
				},
			},
			y: {
				grid: {
					color: colors.gridLines,
					lineWidth: 1,
				},
				ticks: {
					color: colors.textSecondary,
					font: {
						size: 12,
					},
					callback: function (value) {
						return value + '%';
					},
				},
				min: Math.max(0, Math.min(...validData.map((d) => d.btc)) - 5),
				max: Math.min(100, Math.max(...validData.map((d) => d.btc)) + 5),
				// Dodaj linie referencyjne dla faz rynku
				afterDraw: function (chart) {
					const ctx = chart.ctx;
					const yAxis = chart.scales.y;

					// Linia 50% (Alt Season threshold)
					const y50 = yAxis.getPixelForValue(50);
					ctx.save();
					ctx.strokeStyle = colors.success + '80';
					ctx.lineWidth = 2;
					ctx.setLineDash([5, 5]);
					ctx.beginPath();
					ctx.moveTo(chart.chartArea.left, y50);
					ctx.lineTo(chart.chartArea.right, y50);
					ctx.stroke();
					ctx.restore();

					// Linia 65% (Bitcoin Season threshold)
					const y65 = yAxis.getPixelForValue(65);
					ctx.save();
					ctx.strokeStyle = colors.danger + '80';
					ctx.lineWidth = 2;
					ctx.setLineDash([5, 5]);
					ctx.beginPath();
					ctx.moveTo(chart.chartArea.left, y65);
					ctx.lineTo(chart.chartArea.right, y65);
					ctx.stroke();
					ctx.restore();
				},
			},
		},
		onHover: (event, activeElements) => {
			event.native.target.style.cursor =
				activeElements.length > 0 ? 'pointer' : 'default';
		},
	};

	// Zniszcz poprzedni wykres jeśli istnieje
	if (charts.dominance) {
		charts.dominance.destroy();
	}

	charts.dominance = new Chart(ctx, {
		type: 'line',
		data: data,
		options: options,
	});

	console.log('✅ Wykres dominacji utworzony pomyślnie');
}
// 2. Momentum Bar Chart
// Naprawione funkcje wykresów dla nowej struktury danych

// 1. Naprawiona funkcja pobierania danych skanera
async function fetchScannerData() {
	try {
		console.log('📡 Pobieranie danych skanera...');
		const response = await fetch('/api/scanner-results');

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		scannerData = await response.json();

		console.log('✅ Dane skanera pobrane:', {
			strategies: scannerData.strategies?.length || 0,
			marketStatus: !!scannerData.marketStatus,
			hasCoins: !!scannerData.strategies?.[0]?.topCoins?.length,
		});

		// Sprawdź strukturę danych
		if (!scannerData.strategies || scannerData.strategies.length === 0) {
			console.warn('⚠️ Brak strategii w danych - używam mock data');
			scannerData = generateMockData();
		}
	} catch (error) {
		console.error('❌ Błąd pobierania danych skanera:', error.message);
		console.log('🔄 Używam mock data jako fallback');
		scannerData = generateMockData();
	}
}

// 2. Naprawiona funkcja createMomentumChart
function createMomentumChart() {
	const ctx = document.getElementById('momentumChart').getContext('2d');

	// Pobierz monety ze wszystkich strategii
	const allCoins = getAllCoinsFromStrategies(scannerData);

	if (!allCoins || allCoins.length === 0) {
		console.warn('⚠️ Brak monet do wykresu momentum');
		return;
	}

	// Weź top 10 monet z najwyższym score
	const top10 = allCoins
		.filter((coin) => coin.momentum && coin.momentum.totalScore)
		.sort(
			(a, b) =>
				parseFloat(b.momentum.totalScore) - parseFloat(a.momentum.totalScore)
		)
		.slice(0, 10);

	if (top10.length === 0) {
		console.warn('⚠️ Brak monet z momentum score');
		return;
	}

	console.log(`📊 Wykres momentum: ${top10.length} monet`);

	const data = {
		labels: top10.map((c) => c.symbol),
		datasets: [
			{
				label: 'Momentum Score',
				data: top10.map((c) => parseFloat(c.momentum.totalScore)),
				backgroundColor: top10.map((c) => {
					const score = parseFloat(c.momentum.totalScore);
					if (score >= 60) return colors.success;
					if (score >= 40) return colors.bitcoin;
					return colors.warning;
				}),
				borderWidth: 0,
				borderRadius: 8,
				borderSkipped: false,
			},
			{
				label: '7D Change %',
				data: top10.map((c) => c.priceChange7d || 0),
				backgroundColor: top10.map((c) => {
					const change = c.priceChange7d || 0;
					return change >= 0 ? colors.info + '60' : colors.danger + '60';
				}),
				borderWidth: 0,
				borderRadius: 4,
				borderSkipped: false,
			},
		],
	};

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
				labels: {
					color: colors.text,
					font: { size: 12, weight: 'bold' },
					usePointStyle: true,
					padding: 20,
				},
			},
			tooltip: {
				backgroundColor: 'rgba(0, 0, 0, 0.9)',
				titleColor: colors.bitcoin,
				bodyColor: colors.text,
				borderColor: colors.bitcoin,
				borderWidth: 1,
				cornerRadius: 8,
				callbacks: {
					afterLabel: function (context) {
						const coin = top10[context.dataIndex];
						return [
							`Cena: $${coin.price?.toFixed(4) || 'N/A'}`,
							`Rank: #${coin.rank || 'N/A'}`,
							`Kategoria: ${coin.momentum?.category || 'N/A'}`,
						];
					},
				},
			},
		},
		scales: {
			x: {
				grid: {
					display: false,
				},
				ticks: {
					color: colors.textSecondary,
					font: { size: 11, weight: 'bold' },
				},
			},
			y: {
				grid: {
					color: colors.gridLines,
				},
				ticks: {
					color: colors.textSecondary,
					font: { size: 11 },
				},
				beginAtZero: true,
			},
		},
	};

	// Zniszcz poprzedni wykres
	if (charts.momentum) {
		charts.momentum.destroy();
	}

	charts.momentum = new Chart(ctx, {
		type: 'bar',
		data: data,
		options: options,
	});

	console.log('✅ Wykres momentum utworzony');
}
// 3. Volume Bubble Chart
function createVolumeChart() {
	const ctx = document.getElementById('volumeChart').getContext('2d');

	const allCoins = getAllCoinsFromStrategies(scannerData);

	if (!allCoins || allCoins.length === 0) {
		console.warn('⚠️ Brak monet do wykresu volume');
		return;
	}

	const volumeData = allCoins
		.filter(
			(coin) => coin.volumeToMcap && coin.rank && coin.momentum?.totalScore
		)
		.slice(0, 20)
		.map((coin) => ({
			x: coin.rank,
			y: (coin.volumeToMcap * 100).toFixed(2),
			r: Math.sqrt(parseFloat(coin.momentum.totalScore)) * 2,
			label: coin.symbol,
			coin: coin,
		}));

	const data = {
		datasets: [
			{
				label: 'Volume Activity',
				data: volumeData,
				backgroundColor: volumeData.map((d) => {
					if (d.y > 50) return colors.danger + '80';
					if (d.y > 30) return colors.bitcoin + '80';
					return colors.success + '80';
				}),
				borderColor: volumeData.map((d) => {
					if (d.y > 50) return colors.danger;
					if (d.y > 30) return colors.bitcoin;
					return colors.success;
				}),
				borderWidth: 2,
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
			tooltip: {
				backgroundColor: 'rgba(0, 0, 0, 0.9)',
				titleColor: colors.bitcoin,
				bodyColor: colors.text,
				borderColor: colors.bitcoin,
				borderWidth: 1,
				cornerRadius: 8,
				callbacks: {
					label: function (context) {
						const point = context.raw;
						return [
							`${point.label}: ${point.y}% Vol/MCap`,
							`Rank: #${point.x}`,
							`Score: ${point.coin.momentum?.totalScore || 'N/A'}`,
							`Cena: $${point.coin.price?.toFixed(4) || 'N/A'}`,
						];
					},
				},
			},
		},
		scales: {
			x: {
				title: {
					display: true,
					text: 'Market Cap Rank',
					color: colors.textSecondary,
					font: { size: 12, weight: 'bold' },
				},
				grid: {
					color: colors.gridLines,
				},
				ticks: {
					color: colors.textSecondary,
				},
			},
			y: {
				title: {
					display: true,
					text: 'Volume/MCap %',
					color: colors.textSecondary,
					font: { size: 12, weight: 'bold' },
				},
				grid: {
					color: colors.gridLines,
				},
				ticks: {
					color: colors.textSecondary,
				},
			},
		},
	};

	// Zniszcz poprzedni wykres
	if (charts.volume) {
		charts.volume.destroy();
	}

	charts.volume = new Chart(ctx, {
		type: 'bubble',
		data: data,
		options: options,
	});

	console.log('✅ Wykres volume utworzony');
}

// 4. Risk vs Reward Scatter Plot
function createRiskRewardChart() {
	const ctx = document.getElementById('riskRewardChart').getContext('2d');

	const allCoins = getAllCoinsFromStrategies(scannerData);

	if (!allCoins || allCoins.length === 0) {
		console.warn('⚠️ Brak monet do wykresu risk/reward');
		return;
	}

	const scatterData = allCoins
		.filter(
			(coin) =>
				coin.momentum?.riskScore !== undefined &&
				coin.momentum?.totalScore !== undefined
		)
		.slice(0, 30)
		.map((coin) => ({
			x: parseFloat(coin.momentum.riskScore),
			y: parseFloat(coin.momentum.totalScore),
			label: coin.symbol,
			price: coin.price || 0,
			change7d: coin.priceChange7d || 0,
		}));

	const data = {
		datasets: [
			{
				label: 'Risk vs Reward',
				data: scatterData,
				backgroundColor: scatterData.map((d) => {
					// Color based on quadrant
					if (d.x < 50 && d.y > 50) return colors.success; // Low risk, high reward
					if (d.x > 50 && d.y > 50) return colors.warning; // High risk, high reward
					if (d.x < 50 && d.y < 50) return colors.info; // Low risk, low reward
					return colors.danger; // High risk, low reward
				}),
				borderColor: colors.text,
				borderWidth: 1,
				pointRadius: 6,
				pointHoverRadius: 8,
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
			tooltip: {
				backgroundColor: 'rgba(0, 0, 0, 0.9)',
				titleColor: colors.bitcoin,
				bodyColor: colors.text,
				borderColor: colors.bitcoin,
				borderWidth: 1,
				cornerRadius: 8,
				callbacks: {
					label: function (context) {
						const point = context.raw;
						return [
							`${point.label}`,
							`Score: ${point.y}`,
							`Risk: ${point.x}`,
							`Price: $${point.price.toFixed(4)}`,
							`7D Change: ${point.change7d >= 0 ? '+' : ''}${point.change7d.toFixed(1)}%`,
						];
					},
				},
			},
		},
		scales: {
			x: {
				title: {
					display: true,
					text: 'Risk Score →',
					color: colors.textSecondary,
					font: { size: 12, weight: 'bold' },
				},
				grid: {
					color: colors.gridLines,
				},
				min: 0,
				max: 100,
				ticks: {
					color: colors.textSecondary,
				},
			},
			y: {
				title: {
					display: true,
					text: 'Momentum Score →',
					color: colors.textSecondary,
					font: { size: 12, weight: 'bold' },
				},
				grid: {
					color: colors.gridLines,
				},
				min: 0,
				max: 100,
				ticks: {
					color: colors.textSecondary,
				},
			},
		},
	};

	// Zniszcz poprzedni wykres
	if (charts.riskReward) {
		charts.riskReward.destroy();
	}

	charts.riskReward = new Chart(ctx, {
		type: 'scatter',
		data: data,
		options: options,
	});

	console.log('✅ Wykres risk/reward utworzony');
}

// 5. Pomocnicza funkcja do pobierania wszystkich monet ze strategii
function getAllCoinsFromStrategies(scannerData) {
	if (!scannerData || !scannerData.strategies) {
		console.warn('⚠️ Brak danych strategii');
		return [];
	}

	const allCoins = [];
	const seenSymbols = new Set();

	// Zbierz monety ze wszystkich strategii, unikając duplikatów
	scannerData.strategies.forEach((strategy) => {
		if (strategy.topCoins && Array.isArray(strategy.topCoins)) {
			strategy.topCoins.forEach((coin) => {
				if (!seenSymbols.has(coin.symbol)) {
					seenSymbols.add(coin.symbol);
					allCoins.push({
						...coin,
						strategy: strategy.key, // Dodaj informację o strategii
					});
				}
			});
		}
	});

	console.log(`📊 Zebrano ${allCoins.length} unikalnych monet ze strategii`);
	return allCoins;
}

// 5. Performance Heatmap
function createHeatmapChart() {
	const ctx = document.getElementById('heatmapChart').getContext('2d');

	// Pobierz monety ze wszystkich strategii, posortuj według najwyższego momentum i weź top 15
	const allCoins = getAllCoinsFromStrategies(scannerData);
	if (!allCoins || allCoins.length === 0) {
		console.warn('⚠️ Brak monet do stworzenia heatmapy');
		return;
	}

	const topCoins = allCoins
		.sort(
			(a, b) =>
				parseFloat(b.momentum.totalScore) - parseFloat(a.momentum.totalScore)
		)
		.slice(0, 15);

	const labels = topCoins.map((coin) => coin.symbol);

	// Zniszcz poprzedni wykres, jeśli istnieje
	if (charts.heatmap) {
		charts.heatmap.destroy();
	}

	charts.heatmap = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: labels,
			datasets: [
				{
					label: 'Zmiana 24h (%)',
					data: topCoins.map((c) => c.priceChange24h || 0),
					backgroundColor: topCoins.map(
						(c) =>
							(c.priceChange24h || 0) > 0
								? colors.success + 'B3'
								: colors.danger + 'B3' // 70% opacity
					),
					borderColor: topCoins.map((c) =>
						(c.priceChange24h || 0) > 0 ? colors.success : colors.danger
					),
					borderWidth: 1,
				},
				{
					label: 'Zmiana 7d (%)',
					data: topCoins.map((c) => c.priceChange7d || 0),
					backgroundColor: topCoins.map(
						(c) =>
							(c.priceChange7d || 0) > 0
								? colors.info + 'B3'
								: colors.warning + 'B3' // 70% opacity
					),
					borderColor: topCoins.map((c) =>
						(c.priceChange7d || 0) > 0 ? colors.info : colors.warning
					),
					borderWidth: 1,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			indexAxis: 'y', // Tworzy poziomy wykres słupkowy
			plugins: {
				legend: {
					display: true,
					position: 'top',
				},
				tooltip: {
					backgroundColor: 'rgba(0, 0, 0, 0.9)',
					titleColor: colors.bitcoin,
					bodyColor: colors.text,
					borderColor: colors.bitcoin,
					borderWidth: 1,
					cornerRadius: 8,
					callbacks: {
						label: function (context) {
							return `${context.dataset.label}: ${context.raw.toFixed(2)}%`;
						},
					},
				},
			},
			scales: {
				x: {
					grid: {
						color: colors.gridLines,
					},
					ticks: {
						color: colors.textSecondary,
						callback: function (value) {
							return value + '%';
						},
					},
					title: {
						display: true,
						text: 'Zmiana procentowa',
						color: colors.textSecondary,
					},
				},
				y: {
					grid: {
						display: false,
					},
					ticks: {
						color: colors.text,
						font: {
							weight: 'bold',
						},
					},
				},
			},
		},
	});
	console.log('✅ Wykres heatmapy (słupkowy) utworzony pomyślnie');
}

// 6 funkcja updateStats
function updateStats() {
	if (!scannerData || !scannerData.marketStatus) {
		console.warn('⚠️ Brak danych rynkowych do statystyk');
		return;
	}

	// BTC Dominance
	const btcDominanceEl = document.getElementById('btc-dominance');
	const dominanceChangeEl = document.getElementById('dominance-change');

	if (btcDominanceEl && scannerData.marketStatus.btcDominance) {
		btcDominanceEl.textContent = scannerData.marketStatus.btcDominance + '%';
	}

	if (dominanceChangeEl && scannerData.marketStatus.dominanceChange) {
		dominanceChangeEl.textContent = scannerData.marketStatus.dominanceChange;
		dominanceChangeEl.className =
			scannerData.marketStatus.dominanceChange.startsWith('+')
				? 'stat-change negative'
				: 'stat-change positive';
	}

	// Top Gainer
	const allCoins = getAllCoinsFromStrategies(scannerData);
	if (allCoins.length > 0) {
		const topGainer = allCoins.reduce((max, coin) => {
			const maxChange = max.priceChange7d || -Infinity;
			const coinChange = coin.priceChange7d || -Infinity;
			return coinChange > maxChange ? coin : max;
		});

		const topGainerEl = document.getElementById('top-gainer');
		const topGainerChangeEl = document.getElementById('top-gainer-change');

		if (topGainerEl) topGainerEl.textContent = topGainer.symbol;
		if (topGainerChangeEl) {
			topGainerChangeEl.textContent =
				'+' + (topGainer.priceChange7d || 0).toFixed(2) + '%';
		}
	}

	// Average Momentum
	const coinsWithMomentum = allCoins.filter((c) => c.momentum?.totalScore);
	if (coinsWithMomentum.length > 0) {
		const avgMomentum =
			coinsWithMomentum.reduce(
				(sum, coin) => sum + parseFloat(coin.momentum.totalScore),
				0
			) / coinsWithMomentum.length;

		const avgMomentumEl = document.getElementById('avg-momentum');
		const momentumTrendEl = document.getElementById('momentum-trend');

		if (avgMomentumEl) avgMomentumEl.textContent = avgMomentum.toFixed(1);
		if (momentumTrendEl) {
			momentumTrendEl.textContent =
				avgMomentum > 50 ? 'Strong' : avgMomentum > 40 ? 'Moderate' : 'Weak';
		}
	}

	// Market Phase
	const marketPhaseEl = document.getElementById('market-phase');
	const phaseDescEl = document.getElementById('phase-desc');

	if (marketPhaseEl && scannerData.marketStatus.condition) {
		marketPhaseEl.textContent = scannerData.marketStatus.condition;
	}

	if (phaseDescEl && scannerData.marketStatus.advice) {
		phaseDescEl.textContent = scannerData.marketStatus.advice;
	}

	console.log('✅ Statystyki zaktualizowane');
}

// Event listeners
function setupEventListeners() {
	// Timeframe selectors
	document.querySelectorAll('.timeframe-btn').forEach((btn) => {
		btn.addEventListener('click', (e) => {
			const chart = e.target.dataset.chart;
			const period = e.target.dataset.period;

			// Update active state
			document
				.querySelectorAll(`[data-chart="${chart}"]`)
				.forEach((b) => b.classList.remove('active'));
			e.target.classList.add('active');

			// Update chart based on period
			updateChartPeriod(chart, period);
		});
	});
}

// Update chart period
function updateChartPeriod(chartName, period) {
	// This would filter data based on period
	// For now, just a placeholder
	console.log(`Updating ${chartName} to ${period}`);
}

// Refresh all charts
async function refreshCharts() {
	showLoading(true);

	// Destroy existing charts
	Object.values(charts).forEach((chart) => {
		if (chart) chart.destroy();
	});

	// Reinitialize
	await initCharts();
}

// Show/hide loading
function showLoading(show) {
	document.getElementById('loading').style.display = show ? 'block' : 'none';
	document.querySelector('.charts-grid').style.opacity = show ? '0.3' : '1';
}

// Mock data generators (for demo)
function generateMockData() {
	console.log('🔄 Generuję mock data dla wykresów...');

	const mockCoins = [];
	const symbols = [
		'BTC',
		'ETH',
		'SOL',
		'MATIC',
		'UNI',
		'LINK',
		'AAVE',
		'SUSHI',
		'PEPE',
		'SHIB',
	];

	symbols.forEach((symbol, index) => {
		const price = Math.random() * 3;
		const priceChange7d = (Math.random() - 0.3) * 80; // Bias towards positive
		const volumeToMcap = Math.random() * 0.5;
		const momentumScore = Math.floor(Math.random() * 60) + 20;
		const riskScore = Math.floor(Math.random() * 80) + 10;

		mockCoins.push({
			symbol,
			name: `${symbol} Mock`,
			rank: index + 1,
			price,
			priceChange24h: (Math.random() - 0.5) * 20,
			priceChange7d,
			volumeToMcap,
			momentum: {
				totalScore: momentumScore.toString(),
				riskScore,
				category:
					momentumScore > 60
						? 'HOT'
						: momentumScore > 40
							? 'PROMISING'
							: 'WEAK',
			},
		});
	});

	return {
		marketStatus: {
			btcDominance: '62.5',
			dominanceChange: '-0.8%',
			condition: 'BTC FAVORED',
			advice: 'Challenging for alts - be selective',
		},
		strategies: [
			{
				key: 'MOMENTUM',
				name: 'Momentum Leaders',
				topCoins: mockCoins.slice(0, 5),
			},
			{
				key: 'VALUE',
				name: 'Value Hunters',
				topCoins: mockCoins.slice(3, 8),
			},
			{
				key: 'BALANCED',
				name: 'Balanced Plays',
				topCoins: mockCoins.slice(2, 7),
			},
		],
	};
}
function generateMockDominanceHistory() {
	console.log('🔄 Generuję mock data dla dominacji BTC...');

	const history = [];
	const days = 30;
	let btc = 62.5; // Realistyczna wartość startowa
	let eth = 17.8;

	for (let i = days; i >= 0; i--) {
		// Bardziej realistyczne zmiany
		const btcChange = (Math.random() - 0.5) * 1.5; // ±0.75% dziennie
		const ethChange = (Math.random() - 0.5) * 1.0; // ±0.5% dziennie

		btc = Math.max(45, Math.min(75, btc + btcChange));
		eth = Math.max(12, Math.min(25, eth + ethChange));

		const timestamp = new Date(Date.now() - i * 24 * 60 * 60 * 1000);

		history.push({
			timestamp: timestamp.toISOString(),
			btc: Math.round(btc * 100) / 100, // Zaokrąglij do 2 miejsc
			eth: Math.round(eth * 100) / 100,
			altcoins: Math.round((100 - btc - eth) * 100) / 100,
		});
	}

	console.log(`✅ Wygenerowano ${history.length} punktów mock data`);
	return history;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initCharts);

function debugChartsData() {
	console.log('🔍 Debug danych wykresów:');
	console.log('scannerData:', scannerData);
	console.log('strategies:', scannerData?.strategies?.length || 0);

	if (scannerData?.strategies) {
		scannerData.strategies.forEach((strategy, i) => {
			console.log(
				`Strategy ${i}: ${strategy.name}, coins: ${strategy.topCoins?.length || 0}`
			);
		});
	}

	const allCoins = getAllCoinsFromStrategies(scannerData);
	console.log('All coins:', allCoins.length);
	console.log('First coin:', allCoins[0]);
}

// Dodaj do window dla łatwego debugowania
window.debugChartsData = debugChartsData;
window.regenerateChartMockData = () => {
	scannerData = generateMockData();
	console.log('🔄 Mock data wygenerowane, odświeżam wykresy...');
	createMomentumChart();
	createVolumeChart();
	createRiskRewardChart();
	updateStats();
};
