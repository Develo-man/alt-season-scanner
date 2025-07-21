// src/apis/santiment.js
const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.SANTIMENT_API_KEY;
const API_URL = 'https://api.santiment.net/graphql';

/**
 * Pobiera dane on-chain (w tym przepływy giełdowe) dla danej monety.
 * @param {string} slug Identyfikator monety w Santiment (np. 'bitcoin', 'ethereum').
 * @returns {Promise<Object|null>} Obiekt z danymi on-chain lub null.
 */
async function getOnChainData(slug) {
	if (!API_KEY) {
		console.warn('⚠️  Brak klucza API Santiment. Pomijam analizę on-chain.');
		return null;
	}

	const query = `
      query getMetric($slug: String!) {
        getMetric(metric: "exchange_flows_per_exchange") {
          timeseriesData(
            slug: $slug
            from: "utc_now-7d"
            to: "utc_now"
            interval: "1d"
          ) {
            datetime
            value
          }
        }
      }
    `;

	try {
		const response = await axios.post(
			API_URL,
			{ query, variables: { slug } },
			{
				headers: { Authorization: `Apikey ${API_KEY}` },
			}
		);

		const data = response.data.data.getMetric.timeseriesData;
		if (data && data.length > 0) {
			// Przetwarzamy dane, aby były bardziej użyteczne
			const latestData = data[data.length - 1].value;
			const netflow7d = data.reduce(
				(sum, day) => sum + (day.value.net_inflow_usd || 0),
				0
			);

			return {
				inflow_24h_usd: latestData.inflow_usd,
				outflow_24h_usd: latestData.outflow_usd,
				netflow_24h_usd: latestData.net_inflow_usd,
				netflow_7d_usd: netflow7d,
			};
		}
		return null;
	} catch (error) {
		console.warn(`- Brak danych on-chain dla ${slug} na Santiment.`);
		return null;
	}
}

module.exports = { getOnChainData };
