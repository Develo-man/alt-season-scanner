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
	} catch (error) {
		console.error('Error initializing charts:', error);
	} finally {
		showLoading(false);
	}
}

// Fetch scanner data
async function fetchScannerData() {
	try {
		const response = await fetch('/api/scanner-results');
		scannerData = await response.json();
	} catch (error) {
		console.error('Error fetching scanner data:', error);
		// Use mock data for demo
		scannerData = generateMockData();
	}
}

// Fetch dominance history
async function fetchDominanceHistory() {
	try {
		const response = await fetch('/api/dominance-history');
		dominanceHistory = await response.json();
	} catch (error) {
		console.error('Error fetching dominance history:', error);
		// Generate mock history
		dominanceHistory = generateMockDominanceHistory();
	}
}

// 1. BTC Dominance Line Chart
function createDominanceChart() {
	const ctx = document.getElementById('dominanceChart').getContext('2d');

	const data = {
		labels: dominanceHistory.map((d) =>
			new Date(d.timestamp).toLocaleDateString()
		),
		datasets: [
			{
				label: 'BTC Dominance %',
				data: dominanceHistory.map((d) => d.btc),
				borderColor: colors.bitcoin,
				backgroundColor: `${colors.bitcoin}20`,
				borderWidth: 2,
				fill: true,
				tension: 0.4,
			},
			{
				label: 'ETH Dominance %',
				data: dominanceHistory.map((d) => d.eth || 0),
				borderColor: colors.info,
				backgroundColor: `${colors.info}20`,
				borderWidth: 2,
				fill: true,
				tension: 0.4,
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
			},
			tooltip: {
				backgroundColor: 'rgba(0, 0, 0, 0.8)',
				titleColor: colors.bitcoin,
				bodyColor: colors.text,
				borderColor: colors.bitcoin,
				borderWidth: 1,
			},
		},
		scales: {
			x: {
				grid: {
					color: colors.gridLines,
				},
			},
			y: {
				grid: {
					color: colors.gridLines,
				},
				ticks: {
					callback: function (value) {
						return value + '%';
					},
				},
			},
		},
	};

	charts.dominance = new Chart(ctx, {
		type: 'line',
		data: data,
		options: options,
	});
}

// 2. Momentum Bar Chart
function createMomentumChart() {
	const ctx = document.getElementById('momentumChart').getContext('2d');

	const top10 = scannerData.coins.slice(0, 10);

	const data = {
		labels: top10.map((c) => c.symbol),
		datasets: [
			{
				label: 'Momentum Score',
				data: top10.map((c) => c.momentum.score),
				backgroundColor: top10.map((c) => {
					if (c.momentum.score >= 60) return colors.success;
					if (c.momentum.score >= 40) return colors.bitcoin;
					return colors.warning;
				}),
				borderWidth: 0,
			},
			{
				label: '7D Change %',
				data: top10.map((c) => c.priceChange7d),
				backgroundColor: colors.info + '60',
				borderWidth: 0,
			},
		],
	};

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
			},
		},
		scales: {
			x: {
				grid: {
					display: false,
				},
			},
			y: {
				grid: {
					color: colors.gridLines,
				},
			},
		},
	};

	charts.momentum = new Chart(ctx, {
		type: 'bar',
		data: data,
		options: options,
	});
}

// 3. Volume Bubble Chart
function createVolumeChart() {
	const ctx = document.getElementById('volumeChart').getContext('2d');

	const volumeData = scannerData.coins.slice(0, 20).map((coin) => ({
		x: coin.rank,
		y: coin.volumeToMcap * 100,
		r: Math.sqrt(coin.momentum.score) * 2,
		label: coin.symbol,
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
				callbacks: {
					label: function (context) {
						const point = context.raw;
						return `${point.label}: ${point.y.toFixed(2)}% Vol/MCap`;
					},
				},
			},
		},
		scales: {
			x: {
				title: {
					display: true,
					text: 'Market Cap Rank',
				},
				grid: {
					color: colors.gridLines,
				},
			},
			y: {
				title: {
					display: true,
					text: 'Volume/MCap %',
				},
				grid: {
					color: colors.gridLines,
				},
			},
		},
	};

	charts.volume = new Chart(ctx, {
		type: 'bubble',
		data: data,
		options: options,
	});
}

// 4. Risk vs Reward Scatter Plot
function createRiskRewardChart() {
	const ctx = document.getElementById('riskRewardChart').getContext('2d');

	const scatterData = scannerData.coins.map((coin) => ({
		x: coin.momentum.risk,
		y: coin.momentum.score,
		label: coin.symbol,
		price: coin.price,
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
				callbacks: {
					label: function (context) {
						const point = context.raw;
						return [
							`${point.label}`,
							`Score: ${point.y}`,
							`Risk: ${point.x}`,
							`Price: $${point.price.toFixed(4)}`,
						];
					},
				},
			},
			annotation: {
				annotations: {
					quadrant1: {
						type: 'box',
						xMin: 0,
						xMax: 50,
						yMin: 50,
						yMax: 100,
						backgroundColor: colors.success + '10',
						borderWidth: 0,
					},
					label1: {
						type: 'label',
						xValue: 25,
						yValue: 90,
						content: 'Sweet Spot',
						color: colors.success,
						font: {
							size: 12,
						},
					},
				},
			},
		},
		scales: {
			x: {
				title: {
					display: true,
					text: 'Risk Score →',
				},
				grid: {
					color: colors.gridLines,
				},
				min: 0,
				max: 100,
			},
			y: {
				title: {
					display: true,
					text: 'Momentum Score →',
				},
				grid: {
					color: colors.gridLines,
				},
				min: 0,
				max: 100,
			},
		},
	};

	charts.riskReward = new Chart(ctx, {
		type: 'scatter',
		data: data,
		options: options,
	});
}

// 5. Performance Heatmap
function createHeatmapChart() {
	const ctx = document.getElementById('heatmapChart').getContext('2d');

	// Create matrix data
	const matrixData = [];
	const labels = [];

	scannerData.coins.slice(0, 15).forEach((coin, index) => {
		labels.push(coin.symbol);

		// Color intensity based on performance
		const performance24h = coin.priceChange24h;
		const performance7d = coin.priceChange7d;

		matrixData.push({
			x: '24h',
			y: coin.symbol,
			v: performance24h,
			color: performance24h > 0 ? colors.success : colors.danger,
		});

		matrixData.push({
			x: '7d',
			y: coin.symbol,
			v: performance7d,
			color: performance7d > 0 ? colors.success : colors.danger,
		});
	});

	const data = {
		labels: {
			x: ['24h', '7d'],
			y: labels,
		},
		datasets: [
			{
				label: 'Performance %',
				data: matrixData,
				backgroundColor(context) {
					const value = context.dataset.data[context.dataIndex].v;
					const alpha = Math.min(Math.abs(value) / 50, 1);
					const color = value > 0 ? colors.success : colors.danger;
					return (
						color +
						Math.round(alpha * 255)
							.toString(16)
							.padStart(2, '0')
					);
				},
				borderWidth: 1,
				borderColor: colors.gridLines,
				width: 100,
				height: 20,
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
				callbacks: {
					label: function (context) {
						const data = context.dataset.data[context.dataIndex];
						return `${data.y} ${data.x}: ${data.v.toFixed(2)}%`;
					},
				},
			},
		},
		scales: {
			x: {
				type: 'category',
				labels: ['24h', '7d'],
				grid: {
					display: false,
				},
			},
			y: {
				type: 'category',
				labels: labels,
				grid: {
					display: false,
				},
			},
		},
	};

	// Create custom matrix chart using bar chart
	charts.heatmap = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: labels,
			datasets: [
				{
					label: '24h Change',
					data: scannerData.coins.slice(0, 15).map((c) => c.priceChange24h),
					backgroundColor: scannerData.coins
						.slice(0, 15)
						.map((c) =>
							c.priceChange24h > 0
								? colors.success + '80'
								: colors.danger + '80'
						),
				},
				{
					label: '7d Change',
					data: scannerData.coins.slice(0, 15).map((c) => c.priceChange7d),
					backgroundColor: scannerData.coins
						.slice(0, 15)
						.map((c) =>
							c.priceChange7d > 0 ? colors.success + '80' : colors.danger + '80'
						),
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			indexAxis: 'y',
			plugins: {
				legend: {
					display: true,
				},
			},
			scales: {
				x: {
					grid: {
						color: colors.gridLines,
					},
					ticks: {
						callback: function (value) {
							return value + '%';
						},
					},
				},
			},
		},
	});
}

// Update statistics
function updateStats() {
	if (!scannerData) return;

	// BTC Dominance
	document.getElementById('btc-dominance').textContent =
		scannerData.marketStatus.btcDominance + '%';
	document.getElementById('dominance-change').textContent =
		scannerData.marketStatus.dominanceChange;
	document.getElementById('dominance-change').className =
		scannerData.marketStatus.dominanceChange.startsWith('+')
			? 'stat-change negative'
			: 'stat-change positive';

	// Top Gainer
	const topGainer = scannerData.coins.reduce((max, coin) =>
		coin.priceChange7d > max.priceChange7d ? coin : max
	);
	document.getElementById('top-gainer').textContent = topGainer.symbol;
	document.getElementById('top-gainer-change').textContent =
		'+' + topGainer.priceChange7d.toFixed(2) + '%';

	// Average Momentum
	const avgMomentum =
		scannerData.coins.reduce((sum, coin) => sum + coin.momentum.score, 0) /
		scannerData.coins.length;
	document.getElementById('avg-momentum').textContent = avgMomentum.toFixed(1);
	document.getElementById('momentum-trend').textContent =
		avgMomentum > 50 ? 'Strong' : avgMomentum > 40 ? 'Moderate' : 'Weak';

	// Market Phase
	document.getElementById('market-phase').textContent =
		scannerData.marketStatus.condition;
	document.getElementById('phase-desc').textContent =
		scannerData.marketStatus.advice;
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
	return {
		marketStatus: {
			btcDominance: 62.5,
			dominanceChange: '-0.8%',
			condition: 'BTC FAVORED',
			advice: 'Challenging for alts - be selective',
		},
		coins: [
			{
				symbol: 'PENGU',
				rank: 1,
				price: 0.0231,
				priceChange24h: -3.9,
				priceChange7d: 48.25,
				volumeToMcap: 0.8497,
				momentum: { score: 54, risk: 25 },
			},
			{
				symbol: 'XLM',
				rank: 2,
				price: 0.3835,
				priceChange24h: 1.69,
				priceChange7d: 62.08,
				volumeToMcap: 0.1922,
				momentum: { score: 47, risk: 35 },
			},
			{
				symbol: 'ENA',
				rank: 3,
				price: 0.3222,
				priceChange24h: -7.97,
				priceChange7d: 27.57,
				volumeToMcap: 0.2216,
				momentum: { score: 40, risk: 20 },
			},
			// Add more mock coins...
		].concat(
			Array.from({ length: 17 }, (_, i) => ({
				symbol: 'COIN' + (i + 4),
				rank: i + 4,
				price: Math.random() * 3,
				priceChange24h: (Math.random() - 0.5) * 20,
				priceChange7d: (Math.random() - 0.3) * 50,
				volumeToMcap: Math.random() * 0.5,
				momentum: {
					score: Math.floor(Math.random() * 60) + 20,
					risk: Math.floor(Math.random() * 80) + 10,
				},
			}))
		),
	};
}

function generateMockDominanceHistory() {
	const history = [];
	const days = 30;
	let btc = 65;

	for (let i = days; i >= 0; i--) {
		btc += (Math.random() - 0.5) * 2;
		btc = Math.max(55, Math.min(70, btc));

		history.push({
			timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
			btc: btc,
			eth: 17 + (Math.random() - 0.5) * 2,
		});
	}

	return history;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initCharts);
