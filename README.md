# Alt Season Scanner 🚀

## Project Overview

Personal cryptocurrency scanner designed to identify promising altcoins during alt season. Focus on swing trading (3-7 day holds) without the need for constant monitoring.

## Current Status: ✅ v1.2.0 - Working Scanner

- [x] Define project requirements
- [x] Establish selection criteria
- [x] Build MVP scanner
- [x] CoinGecko API integration
- [x] Binance verification
- [x] Advanced momentum scoring
- [ ] Create web interface
- [ ] Test with paper trading
- [ ] Deploy for personal use

## Core Features

### 1. Daily Momentum Scanner

- Analyzes top 100 cryptocurrencies
- Filters by our specific criteria
- Provides actionable insights, not just price data

### 2. Selection Criteria

- **Price**: < $3 USD (retail psychology factor)
- **Exchange**: Must be listed on Binance
- **Market Cap**: Top 100 only
- **Momentum**: Outperforming BTC over 7 days
- **Volume**: Significant increase indicating real interest

### 3. Key Metrics Tracked

- 7-day performance vs BTC
- Volume/Market Cap ratio
- Sector rotation (DeFi, Gaming, L1s, etc.)
- BTC dominance trend
- "Ulica Score" (retail FOMO potential)

## Technical Stack

### Backend

- **Language**: Node.js (vanilla)
- **APIs**:
  - CoinGecko (general market data)
  - Binance (volume, order book)
  - Potential: Bybit (futures data)
- **Database**: Local JSON/CSV initially

### Frontend

- **Framework**: Pure JavaScript (no React)
- **Styling**: Simple CSS
- **Hosting**: Local initially, then Vercel

## Project Philosophy

1. **KISS Principle** - Keep it simple
2. **Data-driven** - No FOMO, just numbers
3. **Personal tool first** - Built for my needs
4. **Swing trading focus** - No day trading features

## API Keys Required

- [ ] CoinGecko API (free tier)
- [ ] Binance API (read-only)
- [ ] (Optional) Bybit API

## Development Phases

### Phase 1: Core Scanner (Week 1)

- Basic API integration
- Momentum scoring algorithm
- Console output of top picks

### Phase 2: Web Interface (Week 2)

- Simple dashboard
- Daily report view
- Basic portfolio tracking

### Phase 3: Enhanced Features (Week 3+)

- Email/push alerts
- Historical performance tracking
- Macro events integration

## File Structure

```
crypto-alt-scanner/
├── README.md           # This file
├── .env.example        # API keys template
├── src/
│   ├── scanner.js      # Core scanning logic
│   ├── apis/           # API integrations
│   ├── utils/          # Helper functions
│   └── web/            # Frontend files
├── data/               # Local data storage
└── docs/               # Additional documentation
```

## Usage

```bash
# Run scanner once
npm run scan

# Run with logging and results saving
npm run scan:once

# Run continuously (every 6 hours)
npm run scan:continuous

# Test individual components
npm run test:all           # Run all tests
npm run test:gecko         # Test CoinGecko API
npm run test:binance       # Test Binance API
npm run test:momentum      # Test momentum calculator

# Development mode (auto-restart on changes)
npm run dev
```

## Understanding Output

### Market Conditions

- **Bitcoin Dominance** >65% = Bitcoin Season (tough for alts)
- **Bitcoin Dominance** 60-65% = BTC Favored
- **Bitcoin Dominance** 55-60% = Transitioning
- **Bitcoin Dominance** <55% = Good for alts

### Momentum Scores

- **70+** = 🔥 HOT (rare in bear market)
- **60+** = 💪 STRONG
- **50+** = 🌟 PROMISING
- **40+** = 👀 INTERESTING
- **30+** = 😐 NEUTRAL
- **<30** = 💤 WEAK

### Key Signals

- ⚠️ **Extended rally** = Consider waiting for pullback
- ⚡ **Potential dip buy** = Negative 24h but positive 7d
- 🔥 **Extreme volume** = Something significant happening
- 💹 **Very liquid** = Easy to buy/sell
- ✅ **Low risk** = Stable momentum without overextension

## BTC Dominance Tracker 📊

Advanced tracking of Bitcoin dominance - the key indicator for alt seasons.

### Running Dominance Analysis

```bash
# One-time dominance report
npm run dominance

# Check dominance with alerts
npm run dominance:check

# Continuous monitoring (every hour)
npm run dominance:monitor

# View recent alerts
npm run dominance:alerts
```

### Market Phases

- **70%+** = 🥶 Bitcoin Winter (best time to accumulate alts)
- **65-70%** = 🟡 Bitcoin Season (BTC outperforms)
- **60-65%** = 🟠 BTC Favored (challenging for alts)
- **55-60%** = 🟢 Transition (market shifting)
- **50-55%** = ⚖️ Balanced (both BTC and alts perform)
- **45-50%** = 🚀 Alt Season (alts outperform)
- **<45%** = 🎯 Peak Euphoria (consider taking profits)

### Alerts System

The dominance tracker will alert you when:

- Market phase changes (e.g., entering alt season)
- Major dominance shifts (>1% in 24h)
- Critical levels are reached (<50% or >60%)

## Web Interface 🌐

The scanner includes a professional web dashboard with Bitcoin-themed design.

### Starting the Web Interface

```bash
# Start the web server
npm run web

# Open in browser
http://localhost:3000
```

### Features

- **Real-time Data**: Auto-refreshes every 5 minutes
- **Bitcoin Theme**: Professional gold & black design
- **Mobile Responsive**: Works on all devices
- **Filter Options**: Hot picks, safe bets, value plays
- **No Dependencies**: Pure HTML/CSS/JS - under 100KB

### API Endpoint

```
GET http://localhost:3000/api/scanner-results
```

Returns current scanner results in JSON format.

## Context for AI Assistant

When continuing work on this project, mention:

1. Current phase/task
2. Any errors or blockers
3. Specific files being worked on
4. Recent changes made

## Last Updated

December 2024 - v1.3.0 Full scanner with charts and dominance tracking

## Features Implemented

- ✅ Top 100 coin analysis from CoinGecko
- ✅ Smart filtering (price, volume, market cap)
- ✅ Binance availability verification
- ✅ Advanced momentum scoring system
- ✅ Risk assessment
- ✅ Multiple trading strategies
- ✅ Market condition analysis
- ✅ BTC Dominance Tracker with alerts
- ✅ Historical dominance tracking
- ✅ Automated scheduling option
- ✅ Results logging and history
- ✅ Professional web dashboard
- ✅ Advanced interactive charts
