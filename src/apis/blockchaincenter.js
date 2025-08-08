const axios = require('axios');
const cache = require('../core/cache');

const API_URL =
	'https://www.blockchaincenter.net/data/altcoin-season-index/data.json';
const CACHE_KEY = 'altcoinSeasonIndex';
const CACHE_TTL = 4 * 60 * 60 * 1000;

async function getAltcoinSeasonIndex() {
	const cachedData = cache.get(CACHE_KEY);
	if (cachedData) {
		console.log('✅ Pobrano Altcoin Season Index z CACHE.');
		return cachedData;
	}

	try {
		console.log('📊 Pobieram świeży Altcoin Season Index (ostatnia próba)...');

		const response = await axios.get(API_URL, {
			headers: {
				Accept: 'application/json, text/plain, */*',
				'Accept-Encoding': 'gzip, deflate, br',
				'Accept-Language': 'en-US,en;q=0.9',
				Referer: 'https://www.blockchaincenter.net/en/altcoin-season-index/',
				'Sec-Ch-Ua':
					'"Not A;Brand";v="99", "Chromium";v="91", "Google Chrome";v="91"',
				'Sec-Ch-Ua-Mobile': '?0',
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-origin',
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
			},
		});

		const lastEntry = response.data.history[response.data.history.length - 1];
		const indexValue = Math.round(lastEntry.y);

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

//do poprawy
