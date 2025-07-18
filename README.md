# Alt Season Scanner v1.3.0 🚀

## Przegląd projektu

Osobisty, zaawansowany skaner kryptowalut zaprojektowany do identyfikowania obiecujących altcoinów. Aplikacja wykorzystuje trzy strategie tradingowe (Momentum, Value, Balanced) i prezentuje wyniki w profesjonalnym interfejsie webowym z interaktywnymi wykresami i szczegółową analityką.

## Aktualny status: ✅ v1.3.0 – W pełni funkcjonalna aplikacja analityczna

- [x] Zbudowanie rdzenia skanera z API CoinGecko i Binance
- [x] Wdrożenie zaawansowanego systemu oceny (Momentum & Ryzyko)
- [x] Rozbudowa o trzy strategie tradingowe (Momentum, Value, Balanced)
- [x] Stworzenie profesjonalnego interfejsu webowego z interaktywnymi wykresami
- [x] Zbudowanie autonomicznego monitora dominacji BTC z alertami
- [x] Integracja z analityką DEX (DexScreener) oraz Smart Volume (Binance)
- [x] Dodanie analizy sektorów rynkowych

## Kluczowe funkcje

### 1. Profesjonalny Dashboard Webowy

Uruchamiany lokalnie na `http://localhost:3000`, prezentuje wszystkie dane w czasie rzeczywistym. Zawiera interaktywne wykresy, szczegóły monet, analizę strategii i warunków rynkowych.

### 2. Analiza w oparciu o 3 strategie

Skaner automatycznie kategoryzuje monety według trzech różnych strategii, dopasowanych do różnych warunków rynkowych i apetytu na ryzyko:

- **🚀 Momentum Leaders:** Monety w silnym trendzie wzrostowym.
- **💎 Value Hunters:** Okazje po spadkach z potencjałem na odbicie.
- **⚖️ Balanced Plays:** Stabilne monety w fazie konsolidacji.

### 3. Zaawansowany Skoring Wielowymiarowy

Każda moneta jest oceniana na podstawie złożonego algorytmu, który uwzględnia:

- **Momentum Ceny i Wolumenu:** Dynamika wzrostów i aktywność handlowa.
- **Współczynnik Ryzyka:** Ocena oparta na zmienności (ATR), przegrzaniu rynku (FOMO) i sentymencie (Fear & Greed).
- **Analityka DEX:** Płynność, jakość wolumenu i presja kupna na giełdach zdecentralizowanych.
- **Sygnały Akumulacji:** Wykrywanie potencjalnej akumulacji przez "smart money".

### 4. Monitor Dominacji BTC

Niezależne narzędzie do śledzenia dominacji Bitcoina – kluczowego wskaźnika sezonu na alty. Analizuje trendy, fazy rynku i wysyła alerty o kluczowych zmianach.

### 5. Analiza Sektorów i Smart Volume

System automatycznie grupuje monety w sektory (AI, DeFi, Gaming), aby śledzić rotację kapitału. Dodatkowo analizuje wolumen transakcji, aby odróżnić aktywność "wielorybów" od inwestorów detalicznych.

## Stos technologiczny

- **Backend:** Node.js, Express.js
- **Frontend:** Czysty HTML, CSS i JavaScript (ES Modules)
- **Wizualizacja Danych:** Chart.js
- **API:** CoinGecko, Binance, Fear & Greed (alternative.me), DexScreener

## Użycie (Nowa Wersja)

### 1. Uruchomienie Interfejsu Webowego (Główna metoda)

To najwygodniejszy sposób korzystania z aplikacji.

```bash
# Uruchamia serwer i interfejs webowy
npm run web
```

Następnie otwórz przeglądarkę i wejdź na **http://localhost:3000**.

### 2. Uruchomienie Skanera w Konsoli

Dla szybkich analiz lub integracji z innymi narzędziami.

```bash
# Uruchamia jednorazowy skan z podsumowaniem w konsoli
npm run scan

# Uruchamia skaner w trybie interaktywnym z menu
npm run scan -- --interactive
```

### 3. Monitorowanie Dominacji BTC

Uruchom w osobnym terminalu, aby śledzić rynek w tle.

```bash
# Uruchamia monitor, który sprawdza dominację co godzinę
npm run dominance:monitor

# Wykonuje jednorazowy raport dominacji
npm run dominance:check
```

## Zrozumienie wyników

### Fazy Rynku (wg Dominacji BTC)

- **>65% (SEZON BITCOINA):** Trudny czas dla altów. Szukaj okazji w strategii **VALUE**.
- **55-65% (FAZA PRZEJŚCIOWA):** Rynek jest zmienny. Najlepsze podejście to **BALANCED**.
- **<55% (SEZON ALTCOINÓW):** Idealne warunki dla altów. Skup się na strategii **MOMENTUM**.

### Oceny Momentum (Total Score)

- **70+ (🔥 GORĄCY):** Bardzo silny sygnał, ale może być blisko szczytu.
- **60+ (💪 SILNY):** Potwierdzony, zdrowy trend.
- **50+ (🌟 OBIECUJĄCY):** Warto obserwować, trend się buduje.
- **<40 (💤 SŁABY):** Prawdopodobnie nieciekawy w danym momencie.
