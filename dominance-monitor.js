#!/usr/bin/env node

/**
 * BTC Dominance Monitor
 * Tracks BTC dominance and alerts on significant changes
 */

require('dotenv').config();
const cron = require('node-cron');
const {
	generateDominanceReport,
	displayReport,
	loadHistory,
} = require('./src/apis/btcDominance');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const MONITOR_INTERVAL = process.env.DOMINANCE_CHECK_HOURS || 1; // Check every hour by default
const ALERT_THRESHOLD = 1; // Alert if dominance changes by more than 1% in 24h
const ALERTS_FILE = path.join(__dirname, 'data', 'dominance', 'alerts.json');

// Alert types
const AlertType = {
	ALT_SEASON_START: '🚀 ALT SEASON STARTING',
	ALT_SEASON_END: '🔴 ALT SEASON ENDING',
	MAJOR_SHIFT: '⚡ MAJOR DOMINANCE SHIFT',
	PHASE_CHANGE: '🔄 MARKET PHASE CHANGE',
};

/**
 * Check for alert conditions
 * @param {Object} report - Dominance report
 * @returns {Array} Alerts to trigger
 */
async function checkAlerts(report) {
	const alerts = [];
	const history = await loadHistory();

	if (history.length < 24) return alerts; // Need at least 24 hours of data

	// Get previous phase (24h ago)
	const prev24h = history[history.length - 24];
	const prevPhase = getPhaseForDominance(prev24h.btc);

	// Check for phase change
	if (prevPhase !== report.phase.phase) {
		alerts.push({
			type: AlertType.PHASE_CHANGE,
			message: `Market shifted from ${prevPhase} to ${report.phase.phase}`,
			severity: 'HIGH',
			data: report.phase,
		});
	}

	// Check for major dominance shift
	const change24h = parseFloat(report.trend.changes['24h']);
	if (Math.abs(change24h) > ALERT_THRESHOLD) {
		alerts.push({
			type: AlertType.MAJOR_SHIFT,
			message: `BTC dominance changed ${change24h}% in 24h`,
			severity: Math.abs(change24h) > 2 ? 'CRITICAL' : 'HIGH',
			data: {
				current: report.current.btc,
				change: change24h,
			},
		});
	}

	// Check for alt season signals
	if (
		report.current.btc < 50 &&
		prevPhase !== 'ALT_SEASON' &&
		prevPhase !== 'PEAK_EUPHORIA'
	) {
		alerts.push({
			type: AlertType.ALT_SEASON_START,
			message: 'BTC dominance below 50% - Alt season confirmed!',
			severity: 'CRITICAL',
			data: report.current,
		});
	} else if (
		report.current.btc > 60 &&
		(prevPhase === 'ALT_SEASON' || prevPhase === 'BALANCED')
	) {
		alerts.push({
			type: AlertType.ALT_SEASON_END,
			message: 'BTC dominance above 60% - Alt season may be ending',
			severity: 'HIGH',
			data: report.current,
		});
	}

	return alerts;
}

/**
 * Get phase for a given dominance level
 * @param {number} dominance - BTC dominance percentage
 * @returns {string} Phase name
 */
function getPhaseForDominance(dominance) {
	if (dominance > 70) return 'BITCOIN_WINTER';
	if (dominance > 65) return 'BITCOIN_SEASON';
	if (dominance > 60) return 'BTC_FAVORED';
	if (dominance > 55) return 'TRANSITION';
	if (dominance > 50) return 'BALANCED';
	if (dominance > 45) return 'ALT_SEASON';
	return 'PEAK_EUPHORIA';
}

/**
 * Save alerts to file
 * @param {Array} alerts - Alerts to save
 */
async function saveAlerts(alerts) {
	if (alerts.length === 0) return;

	try {
		// Ensure directory exists
		await fs.mkdir(path.dirname(ALERTS_FILE), { recursive: true });

		// Load existing alerts
		let existingAlerts = [];
		try {
			const data = await fs.readFile(ALERTS_FILE, 'utf8');
			existingAlerts = JSON.parse(data);
		} catch (error) {
			// File doesn't exist yet
		}

		// Add new alerts with timestamp
		const newAlerts = alerts.map((alert) => ({
			...alert,
			timestamp: new Date().toISOString(),
		}));

		existingAlerts.push(...newAlerts);

		// Keep only last 100 alerts
		if (existingAlerts.length > 100) {
			existingAlerts = existingAlerts.slice(-100);
		}

		await fs.writeFile(ALERTS_FILE, JSON.stringify(existingAlerts, null, 2));
	} catch (error) {
		console.error('Error saving alerts:', error.message);
	}
}

/**
 * Display alerts
 * @param {Array} alerts - Alerts to display
 */
function displayAlerts(alerts) {
	if (alerts.length === 0) return;

	console.log('\n🚨 ALERTS TRIGGERED 🚨');
	console.log('═'.repeat(50));

	alerts.forEach((alert) => {
		console.log(`\n${alert.type}`);
		console.log(`Severity: ${alert.severity}`);
		console.log(`Message: ${alert.message}`);
		if (alert.data) {
			console.log(`Details:`, JSON.stringify(alert.data, null, 2));
		}
	});

	console.log('\n' + '═'.repeat(50));
}

/**
 * Run monitoring check
 */
async function runMonitoringCheck() {
	try {
		console.log(
			`\n🔍 Running dominance check at ${new Date().toLocaleString()}`
		);

		// Generate report
		const report = await generateDominanceReport();

		// Display report
		displayReport(report);

		// Check for alerts
		const alerts = await checkAlerts(report);

		// Display and save alerts
		if (alerts.length > 0) {
			displayAlerts(alerts);
			await saveAlerts(alerts);
		} else {
			console.log('\n✅ No alerts triggered');
		}

		console.log('\n' + '─'.repeat(70) + '\n');
	} catch (error) {
		console.error('❌ Monitoring error:', error.message);
	}
}

/**
 * Show recent alerts
 */
async function showRecentAlerts() {
	try {
		const data = await fs.readFile(ALERTS_FILE, 'utf8');
		const alerts = JSON.parse(data);

		console.log('\n📋 RECENT ALERTS (Last 10)');
		console.log('═'.repeat(50));

		alerts
			.slice(-10)
			.reverse()
			.forEach((alert) => {
				const date = new Date(alert.timestamp).toLocaleString();
				console.log(`\n${date} - ${alert.type}`);
				console.log(`${alert.message}`);
			});
	} catch (error) {
		console.log('No alerts found yet');
	}
}

/**
 * Main function
 */
async function main() {
	const args = process.argv.slice(2);

	if (args.includes('--once') || args.includes('-o')) {
		// Run once and exit
		await runMonitoringCheck();
		process.exit(0);
	} else if (args.includes('--alerts') || args.includes('-a')) {
		// Show recent alerts
		await showRecentAlerts();
		process.exit(0);
	} else if (args.includes('--continuous') || args.includes('-c')) {
		// Run continuously
		console.log(`
╔═══════════════════════════════════════════════════╗
║          BTC DOMINANCE MONITOR v1.0               ║
╚═══════════════════════════════════════════════════╝

🔄 Monitoring BTC dominance every ${MONITOR_INTERVAL} hour(s)
📊 Alert threshold: ${ALERT_THRESHOLD}% change in 24h
📁 Alerts saved to: ${ALERTS_FILE}

Press Ctrl+C to stop monitoring
        `);

		// Run immediately
		await runMonitoringCheck();

		// Schedule regular checks
		const cronExpression = `0 */${MONITOR_INTERVAL} * * *`; // Every N hours
		cron.schedule(cronExpression, runMonitoringCheck);

		console.log(`\n⏰ Next check scheduled in ${MONITOR_INTERVAL} hour(s)`);
	} else {
		// Show usage
		console.log(`
BTC Dominance Monitor

Usage:
  node dominance-monitor.js [options]

Options:
  -o, --once        Run analysis once and exit
  -c, --continuous  Run continuously with scheduled checks
  -a, --alerts      Show recent alerts

Environment Variables:
  DOMINANCE_CHECK_HOURS  Interval between checks (default: 1)

Examples:
  node dominance-monitor.js --once
  node dominance-monitor.js --continuous
  DOMINANCE_CHECK_HOURS=4 node dominance-monitor.js -c
        `);
	}
}

// Handle graceful shutdown
process.on('SIGINT', () => {
	console.log('\n\n👋 Dominance monitor stopped');
	process.exit(0);
});

// Run main
if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}

module.exports = {
	runMonitoringCheck,
	checkAlerts,
};
