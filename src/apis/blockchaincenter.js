const axios = require('axios');
const cache = require('../core/cache');

const API_URL = 'https://www.blockchaincenter.net/altcoin-season-index/api';
const CACHE_KEY = 'altcoinSeasonIndex';
const CACHE_TTL = 4 * 60 * 60 * 1000; // Cache na 4 godziny

/**
 * Pobiera Altcoin Season Index.
 * Wartość > 75 = Altcoin Season.
 * @returns {Promise<Object|null>} Obiekt z indeksem i interpretacją.
 */
async function getAltcoinSeasonIndex() {
	const cachedData = cache.get(CACHE_KEY);
	if (cachedData) {
		console.log('✅ Pobrano Altcoin Season Index z CACHE.');
		return cachedData;
	}

	try {
		console.log('📊 Pobieram świeży Altcoin Season Index...');
		const response = await axios.get(API_URL);
		const indexValue = Math.round(response.data.altcoin_season_meter * 100);

		let interpretation = 'Faza neutralna';
		if (indexValue > 75) {
			interpretation = 'Potwierdzony Sezon na Alty';
		} else if (indexValue < 25) {
			interpretation = 'Sezon Bitcoina';
		}

		const result = {
			value: indexValue,
			interpretation: interpretation,
		};

		cache.set(CACHE_KEY, result, CACHE_TTL);
		return result;
	} catch (error) {
		console.error(
			'❌ Błąd podczas pobierania Altcoin Season Index:',
			error.message
		);
		return null;
	}
}

module.exports = { getAltcoinSeasonIndex };
