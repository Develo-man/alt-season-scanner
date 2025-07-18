// src/core/cache.js
const cache = new Map();

/**
 * Pobiera dane z cache, jeśli są aktualne.
 * @param {string} key Klucz identyfikujący dane.
 * @returns {any|null} Zwraca dane lub null, jeśli są nieaktualne lub nie istnieją.
 */
function get(key) {
	if (!cache.has(key)) {
		return null;
	}

	const item = cache.get(key);

	// Sprawdź, czy cache nie wygasł
	if (Date.now() > item.expiry) {
		cache.delete(key);
		return null;
	}

	return item.value;
}

/**
 * Zapisuje dane w cache.
 * @param {string} key Klucz identyfikujący dane.
 * @param {any} value Wartość do zapisania.
 * @param {number} ttl Czas życia w milisekundach (Time To Live).
 */
function set(key, value, ttl) {
	const item = {
		value,
		expiry: Date.now() + ttl,
	};
	cache.set(key, item);
}

module.exports = { get, set };
