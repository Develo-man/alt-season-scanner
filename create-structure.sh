#!/bin/bash

# Zatrzymaj wykonywanie skryptu, jeśli wystąpi błąd
set -e

PROJECT_NAME="alt-season-scanner"

# Sprawdź, czy folder projektu już istnieje
if [ -d "$PROJECT_NAME" ]; then
  echo "⚠️  Folder '$PROJECT_NAME' już istnieje. Anulowano."
  exit 1
fi

echo "🚀 Tworzenie struktury projektu '$PROJECT_NAME'..."

# Utwórz główny folder i przejdź do niego
mkdir $PROJECT_NAME
cd $PROJECT_NAME

# Utwórz podfoldery
mkdir -p src/{apis,utils,web} data/dominance logs results

# Utwórz pliki w strukturze
touch src/scanner.js
touch src/server.js
touch src/apis/coingecko.js
touch src/apis/binance.js
touch src/apis/btcDominance.js
touch src/utils/filters.js
touch src/utils/momentum.js
touch src/web/index.html
touch src/web/charts.html
touch src/web/charts.js
touch dominance-monitor.js
touch run-scanner.js
touch README.md

# Utwórz plik .gitignore na podstawie istniejącego w projekcie
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Data & Logs
data/
logs/
*.log
results/
output/

# Test coverage
coverage/
.nyc_output/

# Build files
dist/
build/

# Temporary files
tmp/
temp/
*.tmp

# API keys backup (just in case)
*api_keys*
*secret*
*private*

# Scanner output
scanner-results-*.json
daily-reports/

# OS files
Thumbs.db
EOF

# Utwórz plik .env.example
cat > .env.example << 'EOF'
# CoinGecko API Key (darmowy klucz wystarczy na początek)
COINGECKO_API_KEY=

# Opcjonalne: Ustawienia skanera
MAX_PRICE=3
TOP_N_COINS=100

# Opcjonalne: Interwał skanowania w godzinach
SCAN_INTERVAL_HOURS=6
DOMINANCE_CHECK_HOURS=1
EOF

# Utwórz plik package.json
cat > package.json << 'EOF'
{
	"name": "alt-season-scanner",
	"version": "1.0.0",
	"description": "Personal cryptocurrency scanner",
	"main": "src/scanner.js",
	"scripts": {
		"scan": "node src/scanner.js",
        "start": "node src/server.js",
		"dev": "nodemon src/server.js"
	},
	"keywords": [
		"cryptocurrency",
		"altcoins",
		"scanner"
	],
	"author": "Your Name",
	"license": "MIT",
	"dependencies": {
		"axios": "^1.6.0",
		"dotenv": "^16.3.1",
		"node-cron": "^3.0.3"
	},
	"devDependencies": {
		"nodemon": "^3.0.1"
	}
}
EOF


echo ""
echo "✅ Struktura projektu '$PROJECT_NAME' została utworzona pomyślnie!"
echo ""
echo "🎯 Co dalej?"
echo "1. Wejdź do folderu projektu: cd $PROJECT_NAME"
echo "2. Zainstaluj zależności: npm install"
echo "3. Skopiuj .env.example do .env i uzupełnij klucz API: cp .env.example .env"
echo "4. Uruchom skaner: npm run scan"