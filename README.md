# Alt Season Scanner 🚀

## Project Overview
Personal cryptocurrency scanner designed to identify promising altcoins during alt season. Focus on swing trading (3-7 day holds) without the need for constant monitoring.

## Current Status: 🔨 Planning Phase
- [x] Define project requirements
- [x] Establish selection criteria
- [ ] Build MVP scanner
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
- **Framework**: Pure JavaScript 
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

## Usage (Planned)
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your API keys to .env

# Run scanner
npm run scan

# Start web interface
npm run web
```

## Important Notes
- **Risk**: Crypto is volatile. This tool doesn't guarantee profits.
- **Private use**: Not intended for public distribution initially
- **No financial advice**: Just a tool for analysis

## Context for AI Assistant
When continuing work on this project, mention:
1. Current phase/task
2. Any errors or blockers
3. Specific files being worked on
4. Recent changes made

## Last Updated
November 2024 - Project inception and planning phase