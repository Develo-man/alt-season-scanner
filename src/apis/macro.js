const axios = require('axios');
require('dotenv').config();

const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_BASE_URL =
	'https://api.fred.stlouisfed.org/fred/series/observations';

// Funkcja pomocnicza do zapytań do FRED API
async function getFredData(seriesId) {
	if (!FRED_API_KEY) {
		console.warn(`⚠️  Brak klucza FRED_API_KEY. Pomijam dane makro.`);
		return null;
	}
	try {
		const response = await axios.get(FRED_BASE_URL, {
			params: {
				series_id: seriesId,
				api_key: FRED_API_KEY,
				file_type: 'json',
				sort_order: 'desc',
				limit: 1, // Pobieramy tylko najnowszą wartość
			},
		});
		return response.data.observations[0] || null;
	} catch (error) {
		console.error(
			`❌ Błąd podczas pobierania danych dla serii ${seriesId} z FRED:`,
			error.message
		);
		return null;
	}
}

/**
 * Pobiera aktualną stopę procentową (Federal Funds Rate).
 * @returns {Promise<Object|null>}
 */
async function getInterestRate() {
	// ID serii dla Federal Funds Effective Rate w FRED to 'FEDFUNDS'
	const data = await getFredData('FEDFUNDS');
	if (!data) return null;

	const rate = parseFloat(data.value);
	let interpretation = 'Neutralna';
	if (rate > 4) interpretation = 'Restrykcyjna (Jastrzębia)';
	else if (rate < 2.5) interpretation = 'Luźna (Gołębia)';

	return {
		value: rate,
		date: data.date,
		interpretation: interpretation,
		trend:
			rate > 4
				? 'Wysokie stopy, negatywne dla ryzyka'
				: 'Niskie stopy, pozytywne dla ryzyka',
	};
}

/**
 * Pobiera aktualną wartość indeksu dolara (DXY).
 * @returns {Promise<Object|null>}
 */
async function getDXYIndex() {
	// ID serii dla Trade Weighted U.S. Dollar Index w FRED to 'DTWEXBGS'
	const data = await getFredData('DTWEXBGS');
	if (!data) return null;

	const value = parseFloat(data.value);
	let interpretation = 'Neutralny';
	if (value > 103) interpretation = 'Silny Dolar (Niedźwiedzi dla krypto)';
	else if (value < 98) interpretation = 'Słaby Dolar (Byczy dla krypto)';

	return {
		value: value,
		date: data.date,
		interpretation: interpretation,
		trend:
			value > 103 ? 'Spadek apetytu na ryzyko' : 'Wzrost apetytu na ryzyko',
	};
}

module.exports = {
	getInterestRate,
	getDXYIndex,
};
