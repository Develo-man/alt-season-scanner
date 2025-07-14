const axios = require('axios');

// Setup
const BASE_URL = 'https://api.alternative.me/fng/';

/**
 * Downloads the current Fear & Greed Index.
 * The API provides data from the last day.
 * @returns {Promise<Object|null>} Object with pointer data or null in case of error.
 */
async function getFearAndGreedIndex() {
	try {
		const response = await axios.get(BASE_URL);

		// We check whether the response has the expected structure
		if (response.data && response.data.data && response.data.data.length > 0) {
			const fngData = response.data.data[0];
			console.log(
				`📊 Pobrany wskaźnik Fear & Greed: ${fngData.value} (${fngData.value_classification})`
			);

			return {
				value: parseInt(fngData.value, 10),
				classification: fngData.value_classification,
				timestamp: new Date(
					parseInt(fngData.timestamp, 10) * 1000
				).toISOString(),
			};
		}

				// We log a warning if the data is in a different format
		console.warn(
			'⚠️ Otrzymano nieprawidłową lub pustą odpowiedź z API Fear & Greed.'
		);
		return null;
	} catch (error) {
		console.error(
			'❌ Błąd podczas pobierania wskaźnika Fear & Greed:',
			error.message
		);
		// We return null so that the rest of the application can work even if this API fails
		return null;
	}
}

module.exports = {
	getFearAndGreedIndex,
};
