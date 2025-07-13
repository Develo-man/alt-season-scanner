#!/bin/bash

# Create Alt Season Scanner project structure

echo "🚀 Creating Alt Season Scanner project structure..."

# Create main directories
mkdir -p src/{apis,utils,web}
mkdir -p data/historical
mkdir -p docs
mkdir -p logs
mkdir -p test

# Create placeholder files
touch src/scanner.js
touch src/server.js
touch src/test.js

# API integrations
touch src/apis/coingecko.js
touch src/apis/binance.js
touch src/apis/btcDominance.js

# Utilities
touch src/utils/filters.js
touch src/utils/momentum.js
touch src/utils/storage.js
touch src/utils/report.js
touch src/utils/alerts.js

# Web interface
touch src/web/index.html
touch src/web/dashboard.js
touch src/web/styles.css
touch src/web/portfolio.js

# Documentation
touch docs/API_GUIDE.md
touch docs/ARCHITECTURE.md
touch docs/DECISIONS.md

# Create initial scanner.js with basic structure
cat > src/scanner.js << 'EOF'
require('dotenv').config();

console.log('🚀 Alt Season Scanner v1.0.0');
console.log('📊 Starting scan...\n');

// TODO: Import modules
// const { getTop100 } = require('./apis/coingecko');
// const { filterByPrice } = require('./utils/filters');
// const { checkIfListed } = require('./apis/binance');

async function main() {
    try {
        console.log('✅ Scanner initialized successfully!');
        console.log('📝 Next step: Implement CoinGecko API integration');
        
        // TODO: Implement scanning logic
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run scanner
main();
EOF

echo "✅ Project structure created successfully!"
echo ""
echo "📁 Directory structure:"
echo "crypto-alt-scanner/"
echo "├── src/"
echo "│   ├── apis/         # API integrations"
echo "│   ├── utils/        # Helper functions"
echo "│   ├── web/          # Frontend files"
echo "│   ├── scanner.js    # Main scanner"
echo "│   ├── server.js     # Web server"
echo "│   └── test.js       # Tests"
echo "├── data/             # Data storage"
echo "├── docs/             # Documentation"
echo "├── logs/             # Log files"
echo "└── test/             # Test files"
echo ""
echo "🎯 Next steps:"
echo "1. Run: npm install"
echo "2. Copy .env.example to .env and add your API keys"
echo "3. Test: npm run scan"