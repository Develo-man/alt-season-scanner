# Alt Season Scanner - Przewodnik Szybkiego Startu 🚀

Ten przewodnik pomoże Ci uruchomić aplikację w mniej niż 5 minut.

## Instalacja

1.  **Sklonuj repozytorium i zainstaluj zależności**

    ```bash
    git clone [adres-twojego-repozytorium]
    cd alt-season-scanner
    npm install
    ```

2.  **Skonfiguruj klucze API**

    ```bash
    # Skopiuj plik przykładowy
    cp .env.example .env
    ```

    Następnie otwórz plik `.env` i wklej swój darmowy klucz API z CoinGecko.

3.  **Uruchom aplikację!**
    ```bash
    # Startuje serwer i interfejs webowy
    npm run web
    ```
    Otwórz przeglądarkę i wejdź na **http://localhost:3000**.

## Jak używać aplikacji (krok po kroku)

### Krok 1: Zanalizuj warunki rynkowe

Na górze strony znajdziesz kluczowe wskaźniki:

- **Dominacja BTC:** Najważniejszy wskaźnik. Jeśli spada poniżej 55%, warunki dla altcoinów są dobre.
- **Fear & Greed:** Pokazuje ogólny sentyment na rynku.
- **Rekomendowana Strategia:** Aplikacja automatycznie sugeruje, która ze strategii (Momentum, Value, Balanced) jest obecnie najsensowniejsza.

### Krok 2: Wybierz strategię i przeglądaj monety

Kliknij na jedną ze strategii, aby zobaczyć listę najlepszych monet, które pasują do jej kryteriów. Monety są posortowane od najlepszej (najwyższy `Total Score`).

### Krok 3: Zrozumienie kart monet

Każda karta monety zawiera kluczowe informacje:

- **Ocena (Score):** Ogólny wynik od 0 do 100. Im wyższy, tym lepsza okazja według algorytmu.
- **Ryzyko:** Ocena ryzyka (0-100). Im niższa, tym bezpieczniej.
- **Aktywność:** Stosunek wolumenu do kapitalizacji. Wysoka wartość oznacza duże zainteresowanie.
- **💡 Dlaczego warto?:** Automatycznie wygenerowane sygnały, które podsumowują, dlaczego dana moneta jest interesująca.

### Krok 4: Sprawdź szczegóły

Kliknij przycisk **"📊 Więcej szczegółów"** lub **"🏪 DEX Info"**, aby otworzyć okno z dogłębną analizą techniczną oraz danymi z giełd zdecentralizowanych.

## Zaawansowane użycie (Terminal)

Jeśli wolisz pracę w konsoli:

- **`npm run scan -- --interactive`**: Uruchamia skaner w trybie interaktywnym z menu w terminalu.
- **`npm run dominance:monitor`**: Uruchamia w tle monitor dominacji BTC, który informuje o kluczowych zmianach na rynku.

## Bezpieczeństwo przede wszystkim 🛡️

1.  **To NIE jest porada inwestycyjna.** Aplikacja jest narzędziem analitycznym.
2.  **DYOR** - Zawsze wykonaj własną, dogłębną analizę przed zainwestowaniem.
3.  **Zarządzaj ryzykiem.** Zawsze używaj zleceń stop-loss i nigdy не inwestuj więcej, niż możesz stracić.
