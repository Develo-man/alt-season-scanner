#!/bin/bash

# Zatrzymaj wykonywanie skryptu, jeśli wystąpi błąd
set -e

PROJECT_NAME="alt-season-scanner"

# Sprawdź, czy folder projektu już istnieje
if [ -d "$PROJECT_NAME" ]; then
  echo "⚠️  Folder '$PROJECT_NAME' już istnieje. Anulowano."
  exit 1
fi

echo "🚀 Tworzenie pełnej struktury projektu '$PROJECT_NAME' v1.3.0..."

# --- GŁÓWNE FOLDERY ---
mkdir $PROJECT_NAME
cd $PROJECT_NAME
mkdir -p src/{apis,core,utils,web} test data/dominance logs results

echo "✅ Utworzono główne foldery."

# --- PLIKI W GŁÓWNYM KATALOGU ---
touch README.md README_PL.md QUICKSTART.md charts-example.md run-scanner.js dominance-monitor.js

# --- PLIKI W /src ---
touch src/config.js src/scanner.js src/server.js

# --- PLIKI W /src/apis ---
touch src/apis/binance.js src/apis/coingecko.js src/apis/btcDominance.js src/apis/fearAndGreed.js src/apis/dexAnalytics.js

# --- PLIKI W /src/core ---
touch src/core/scannerLogic.js src/core/cache.js

# --- PLIKI W /src/utils ---
touch src/utils/momentum.js src/utils/filters.js src/utils/analysis.js src/utils/sectors.js src/utils/accumulation.js src/utils/dexScoring.js

# --- PLIKI W /src/web ---
touch src/web/index.html src/web/charts.html src/web/styles.css src/web/main.js src/web/charts.js src/web/ui.js

# --- PLIKI W /test ---
touch test/test-binance.js test/test-coingecko.js test/test-momentum.js test/test-dominance.js test/test-smart-volume.js test/test-dex-analytics.js test/test-accumulation.js

echo "✅ Utworzono wszystkie puste pliki projektu."

# --- PLIK .gitignore ---
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Environment variables
.env

# Data, Logs, Results
data/
logs/
results/

# IDE & OS files
.vscode/
.idea/
.DS_Store
Thumbs.db
EOF

# --- PLIK .env.example ---
cat > .env.example << 'EOF'
# Wymagane: Darmowy klucz API z CoinGecko
COINGECKO_API_KEY=

# Opcjonalne: Ustawienia interwałów (w godzinach)
SCAN_INTERVAL_HOURS=6
DOMINANCE_CHECK_HOURS=1
EOF

# --- PLIK package.json (zaktualizowany) ---
cat > package.json << 'EOF'
{
	"name": "alt-season-scanner",
	"version": "1.3.0",
	"description": "Personal cryptocurrency scanner for identifying promising altcoins during alt season",
	"main": "src/scanner.js",
	"scripts": {
		"scan": "node src/scanner.js",
		"scan:interactive": "node src/scanner.js --interactive",
		"web": "node src/server.js",
		"dev": "nodemon src/server.js",
		"dominance:monitor": "node dominance-monitor.js --continuous",
		"dominance:check": "node dominance-monitor.js --once",
		"test:all": "node test/test-coingecko.js && node test/test-binance.js"
	},
	"keywords": [
		"cryptocurrency",
		"altcoins",
		"scanner",
		"binance",
		"coingecko"
	],
	"author": "DeveloMan",
	"license": "MIT",
	"dependencies": {
		"axios": "^1.6.0",
		"dotenv": "^16.3.1",
		"express": "^5.1.0",
		"node-cron": "^3.0.3"
	},
	"devDependencies": {
		"nodemon": "^3.0.1"
	},
	"engines": {
		"node": ">=16.0.0"
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
echo "4. Uruchom interfejs webowy: npm run web"