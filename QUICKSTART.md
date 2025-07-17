# Alt Season Scanner - Quick Start Guide 🚀

## Installation (5 minutes)

1. **Clone & Install**

```bash
git clone [your-repo-url]
cd alt-season-scanner
npm install
```

2. **Configure API Keys**

```bash
cp .env.example .env
# Edit .env and add your CoinGecko API key
```

3. **Test Everything Works**

```bash
npm run test:all
```

## Running the Scanner

### Option 1: Command Line Only

```bash
# Single scan
npm run scan

# Continuous scanning (every 6 hours)
npm run scan:continuous
```

### Option 2: Web Dashboard

```bash
# Start web server
npm run web

# Open browser
http://localhost:3000
```

## Understanding Results

### Momentum Scores

- **70+** = 🔥 HOT (rare, extreme opportunity)
- **60+** = 💪 STRONG (good momentum)
- **50+** = 🌟 PROMISING (worth watching)
- **40+** = 👀 INTERESTING (early stage)
- **30+** = 😐 NEUTRAL (wait and see)

### Key Signals

- ⚠️ **Extended rally** = Already pumped hard
- ⚡ **Dip opportunity** = Recent pullback
- 🔥 **Extreme volume** = Something happening
- ✅ **Low risk** = Steady growth

### Market Conditions

- **BTC Dominance >65%** = Hard mode for alts
- **BTC Dominance 55-65%** = Be selective
- **BTC Dominance <55%** = Alt season vibes

## Trading Strategy

### Entry Checklist

- [ ] Score above 40
- [ ] Positive 7-day trend
- [ ] Listed on Binance
- [ ] Risk score under 50
- [ ] Not already pumped >70%

### Position Sizing

- **Score 60+**: Up to 5% of portfolio
- **Score 50-60**: Up to 3% of portfolio
- **Score 40-50**: Up to 2% of portfolio
- **Always use stop losses!**

## Troubleshooting

### "No coins found"

- Check BTC dominance - might be bad timing
- Lower filter thresholds in .env

### "API rate limit"

- Using free CoinGecko? Wait 1 minute
- Consider getting API key

### "Can't connect to Binance"

- Check internet connection
- Binance API might be down

## Safety First 🛡️

1. **This is NOT financial advice**
2. **Never invest more than you can lose**
3. **DYOR - Do Your Own Research**
4. **Start small, test the system**
5. **Keep a trading journal**

## Next Steps

1. Run scanner daily for a week
2. Paper trade the recommendations
3. Track which signals work best
4. Adjust filters based on results
5. Consider automating with cron

---

**Remember**: The best trader is a disciplined trader. Stick to your rules!
