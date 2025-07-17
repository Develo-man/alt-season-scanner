#!/usr/bin/env node

/**
 * Alt Season Scanner Runner
 * This script can run the scanner continuously or on schedule
 */

require('dotenv').config();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL_HOURS) || 6;
const LOG_DIR = './logs';
const RESULTS_DIR = './results';

// Ensure directories exist
[LOG_DIR, RESULTS_DIR].forEach((dir) => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
});

// Run scanner once
function runScanner() {
	return new Promise((resolve, reject) => {
		console.log(`\n🚀 Starting scan at ${new Date().toLocaleString()}`);

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const logFile = path.join(LOG_DIR, `scan-${timestamp}.log`);
		const resultsFile = path.join(RESULTS_DIR, `results-${timestamp}.json`);

		const scanner = spawn('node', ['src/scanner.js'], {
			stdio: ['inherit', 'pipe', 'pipe'],
		});

		let output = '';
		let results = [];

		scanner.stdout.on('data', (data) => {
			const text = data.toString();
			output += text;
			console.log(text);

			// Try to extract coin data from output
			// This is a simple parser - you might want to improve it
			const coinMatch = text.match(/(\w+)\s+-\s+Score:\s+([\d.]+)/g);
			if (coinMatch) {
				coinMatch.forEach((match) => {
					const [symbol, score] = match.split(/\s+-\s+Score:\s+/);
					results.push({
						symbol,
						score: parseFloat(score),
						timestamp: new Date(),
					});
				});
			}
		});

		scanner.stderr.on('data', (data) => {
			console.error(data.toString());
		});

		scanner.on('close', (code) => {
			// Save log
			fs.writeFileSync(logFile, output);
			console.log(`📝 Log saved to: ${logFile}`);

			// Save results if any
			if (results.length > 0) {
				fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
				console.log(`💾 Results saved to: ${resultsFile}`);
			}

			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Scanner exited with code ${code}`));
			}
		});
	});
}

// Run once or continuously
async function main() {
	const args = process.argv.slice(2);
	const continuous = args.includes('--continuous') || args.includes('-c');
	const once = args.includes('--once') || args.includes('-o');

	if (!continuous && !once) {
		console.log(`
Alt Season Scanner Runner

Usage:
  node run-scanner.js --once       Run scanner once
  node run-scanner.js --continuous  Run continuously every ${SCAN_INTERVAL} hours
  
Options:
  -o, --once        Run the scanner once and exit
  -c, --continuous  Run the scanner continuously
  
Environment:
  SCAN_INTERVAL_HOURS  Interval between scans (default: 6)
        `);
		process.exit(0);
	}

	try {
		if (once) {
			await runScanner();
			console.log('\n✅ Scan completed successfully');
		} else if (continuous) {
			console.log(`🔄 Running scanner every ${SCAN_INTERVAL} hours`);
			console.log('Press Ctrl+C to stop\n');

			// Run immediately
			await runScanner();

			// Then run on interval
			setInterval(
				async () => {
					try {
						await runScanner();
					} catch (error) {
						console.error('❌ Scan failed:', error.message);
					}
				},
				SCAN_INTERVAL * 60 * 60 * 1000
			);
		}
	} catch (error) {
		console.error('❌ Error:', error.message);
		process.exit(1);
	}
}

// Handle graceful shutdown
process.on('SIGINT', () => {
	console.log('\n\n👋 Scanner runner stopped');
	process.exit(0);
});

main();
