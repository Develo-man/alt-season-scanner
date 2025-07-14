// src/utils/sectors.js

/**
 * Mapping cryptocurrency symbols to their market sectors.
 * Maintained manually for quality assurance.
 */
const sectorMapping = {
	// Layer 1 (L1)
	BTC: 'Layer 1',
	ETH: 'Layer 1',
	SOL: 'Layer 1',
	BNB: 'Layer 1',
	AVAX: 'Layer 1',
	ADA: 'Layer 1',
	TRX: 'Layer 1',
	TON: 'Layer 1',
	NEAR: 'Layer 1',
	SUI: 'Layer 1',

	// Memecoiny
	DOGE: 'Memecoin',
	SHIB: 'Memecoin',
	PEPE: 'Memecoin',
	WIF: 'Memecoin',
	FLOKI: 'Memecoin',
	BONK: 'Memecoin',

	// DeFi
	UNI: 'DeFi',
	LINK: 'DeFi', // Oracles
	LDO: 'DeFi', // Liquid Staking
	AAVE: 'DeFi',
	MAKER: 'DeFi',
	ENA: 'DeFi', // Synthetic Dollar
	PENDLE: 'DeFi', // Yield Trading

	// AI
	TAO: 'AI',
	RNDR: 'AI', // DePIN
	FET: 'AI',
	AGIX: 'AI',
	OCEAN: 'AI',

	// Gaming / Metaverse
	IMX: 'Gaming',
	SAND: 'Gaming',
	MANA: 'Gaming',
	GALA: 'Gaming',

	// RWA (Real World Assets)
	ONDO: 'RWA',
	POLYX: 'RWA',

	// DePIN (Decentralized Physical Infrastructure Networks)
	FIL: 'DePIN',
	ICP: 'DePIN',
	HNT: 'DePIN',
	AR: 'DePIN',
};

/**
 * Retrieves the sector for a given cryptocurrency symbol.
 * @param {string} symbol - Symbol crypto (np. 'BTC').
 * @returns {string} - Sector name or 'Unknown'
 */
function getSector(symbol) {
	return sectorMapping[symbol.toUpperCase()] || 'Unknown';
}

module.exports = {
	getSector,
};
