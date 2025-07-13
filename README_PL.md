# Alt Season Scanner 🚀

## Przegląd projektu  
Osobisty skaner kryptowalut zaprojektowany do identyfikowania obiecujących altcoinów podczas tzw. "alt season". Skupia się na swing tradingu (utrzymywanie pozycji przez 3–7 dni) bez potrzeby ciągłego monitorowania.

## Aktualny status: ✅ v1.2.0 – Działający skaner
- [x] Zdefiniowanie wymagań projektu  
- [x] Ustalenie kryteriów selekcji  
- [x] Zbudowanie MVP skanera  
- [x] Integracja z API CoinGecko  
- [x] Weryfikacja dostępności na Binance  
- [x] Zaawansowane ocenianie momentum  
- [ ] Stworzenie interfejsu webowego  
- [ ] Testowanie w trybie paper trading  
- [ ] Wdrożenie do użytku osobistego  

## Kluczowe funkcje

### 1. Codzienny skaner momentum  
- Analizuje 100 najpopularniejszych kryptowalut  
- Filtruje według naszych konkretnych kryteriów  
- Dostarcza konkretnych informacji do działania, nie tylko danych cenowych  

### 2. Kryteria selekcji  
- **Cena**: < 3 USD (efekt psychologiczny dla detalistów)  
- **Giełda**: Musi być notowana na Binance  
- **Kapitalizacja rynkowa**: Tylko top 100  
- **Momentum**: Lepsza wydajność niż BTC w ciągu 7 dni  
- **Wolumen**: Znaczący wzrost oznaczający prawdziwe zainteresowanie  

### 3. Śledzone metryki  
- Wyniki z 7 dni względem BTC  
- Stosunek wolumenu do kapitalizacji rynkowej  
- Rotacja sektorowa (DeFi, Gaming, warstwy L1 itd.)  
- Trend dominacji BTC  
- "Wskaźnik Ulicy" (potencjał FOMO detalistów)  

## Stos technologiczny  

### Backend  
- **Język**: Node.js (czysty, bez frameworków)  
- **API**:  
  - CoinGecko (dane ogólnorynkowe)  
  - Binance (wolumen, orderbook)  
  - Możliwe: Bybit (dane z rynku futures)  
- **Baza danych**: Początkowo lokalnie – JSON/CSV  

### Frontend  
- **Framework**: Czysty JavaScript (bez Reacta)  
- **Stylowanie**: Prosty CSS  
- **Hosting**: Najpierw lokalny, później Vercel  

## Filozofia projektu  
1. **Zasada KISS** – Keep It Simple, Stupid  
2. **Oparte na danych** – Bez FOMO, tylko liczby  
3. **Narzędzie osobiste** – Budowane pod moje potrzeby  
4. **Skupienie na swing tradingu** – Bez funkcji dla day tradingu  

## Wymagane klucze API  
- [ ] CoinGecko API (darmowy tier)  
- [ ] Binance API (tylko do odczytu)  
- [ ] (Opcjonalnie) Bybit API  

## Fazy rozwoju  

### Faza 1: Główny skaner (Tydzień 1)  
- Podstawowa integracja z API  
- Algorytm oceny momentum  
- Wyniki w konsoli z najlepszymi typami  

### Faza 2: Interfejs webowy (Tydzień 2)  
- Prosty dashboard  
- Widok codziennych raportów  
- Podstawowe śledzenie portfela  

### Faza 3: Rozszerzone funkcje (Tydzień 3+)  
- Powiadomienia e-mail / push  
- Historia wyników  
- Integracja z wydarzeniami makroekonomicznymi  

## Struktura plików  
```
crypto-alt-scanner/
├── README.md           # Ten plik
├── .env.example        # Szablon kluczy API
├── src/
│   ├── scanner.js      # Główna logika skanowania
│   ├── apis/           # Integracje z API
│   ├── utils/          # Funkcje pomocnicze
│   └── web/            # Pliki frontendowe
├── data/               # Lokalna baza danych
└── docs/               # Dodatkowa dokumentacja
```

## Użycie  
```bash
# Jednorazowe uruchomienie skanera
npm run scan

# Uruchomienie z logowaniem i zapisem wyników
npm run scan:once

# Uruchamianie cykliczne (co 6 godzin)
npm run scan:continuous

# Testowanie poszczególnych komponentów
npm run test:all           # Wszystkie testy
npm run test:gecko         # Test API CoinGecko
npm run test:binance       # Test API Binance
npm run test:momentum      # Test kalkulatora momentum

# Tryb deweloperski (auto-restart przy zmianach)
npm run dev
```

## Zrozumienie wyników

### Warunki rynkowe  
- **Dominacja Bitcoina >65%** = Sezon Bitcoina (ciężko dla altów)  
- **Dominacja Bitcoina 60–65%** = Preferowany BTC  
- **Dominacja Bitcoina 55–60%** = Faza przejściowa  
- **Dominacja Bitcoina <55%** = Dobry czas na alty  

### Oceny momentum  
- **70+** = 🔥 GORĄCY (rzadko w bessie)  
- **60+** = 💪 SILNY  
- **50+** = 🌟 OBIECUJĄCY  
- **40+** = 👀 INTERESUJĄCY  
- **30+** = 😐 NEUTRALNY  
- **<30** = 💤 SŁABY  

### Kluczowe sygnały  
- ⚠️ **Wydłużony rajd** = Warto poczekać na korektę  
- ⚡ **Potencjał na dołek** = Spadek w 24h, ale wzrost w 7d  
- 🔥 **Ekstremalny wolumen** = Coś ważnego się dzieje  
- 💹 **Duża płynność** = Łatwo kupić/sprzedać  
- ✅ **Niskie ryzyko** = Stabilne momentum bez przegrzania  

## Ważne uwagi  
- **Ryzyko**: Krypto to rynek zmienny. To narzędzie nie gwarantuje zysków.  
- **Użytek prywatny**: Nieprzeznaczone do publicznej dystrybucji na tym etapie  
- **Brak porady finansowej**: To tylko narzędzie analityczne  

## Kontekst dla Asystenta AI  
Podczas kontynuowania prac nad projektem, uwzględnij:  
1. Obecną fazę / zadanie  
2. Występujące błędy lub blokery  
3. Pliki, nad którymi pracujesz  
4. Ostatnie zmiany wprowadzone  

## Ostatnia aktualizacja  
Lipiec 2025 – v1.2.0 Działający skaner z oceną momentum  

## Zaimplementowane funkcje  
- ✅ Analiza top 100 coinów z CoinGecko  
- ✅ Inteligentne filtrowanie (cena, wolumen, kapitalizacja)  
- ✅ Weryfikacja dostępności na Binance  
- ✅ Zaawansowany system oceny momentum  
- ✅ Ocena ryzyka  
- ✅ Wiele strategii tradingowych  
- ✅ Analiza warunków rynkowych  
- ✅ Opcja automatycznego harmonogramu  
- ✅ Logowanie wyników i historia