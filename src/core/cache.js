const marketDataCache = new Map();
const longTermCache = new Map();

/**
 * Funkcja generyczna do pobierania danych z wybranego cache'u.
 * @param {Map} cacheInstance Instancja mapy cache'u.
 * @param {string} key Klucz.
 * @returns {any|null}
 */
function getFromCache(cacheInstance, key) {
	if (!cacheInstance.has(key)) {
		return null;
	}
	const item = cacheInstance.get(key);
	if (Date.now() > item.expiry) {
		cacheInstance.delete(key);
		return null;
	}
	return item.value;
}

/**
 * Funkcja generyczna do zapisywania danych w wybranym cache'u.
 * @param {Map} cacheInstance Instancja mapy cache'u.
 * @param {string} key Klucz.
 * @param {any} value Wartość.
 * @param {number} ttl Czas życia w ms.
 */
function setInCache(cacheInstance, key, value, ttl) {
	const item = {
		value,
		expiry: Date.now() + ttl,
	};
	cacheInstance.set(key, item);
}

// Zaktualizuj istniejące funkcje, aby używały nowego, generycznego mechanizmu
function get(key) {
	return getFromCache(marketDataCache, key);
}

function set(key, value, ttl) {
	setInCache(marketDataCache, key, value, ttl);
}

// DODAJ NOWE FUNKCJE DLA DŁUGOTERMINOWEGO CACHE'U
const DEV_DATA_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 godziny

function getDevData(coinId) {
	return getFromCache(longTermCache, `dev_${coinId}`);
}

function setDevData(coinId, data) {
	setInCache(longTermCache, `dev_${coinId}`, data, DEV_DATA_CACHE_TTL);
}

module.exports = { get, set, getDevData, setDevData };
