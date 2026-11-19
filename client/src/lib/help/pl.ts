import type { HelpLocaleText } from "./types";

export const pl: HelpLocaleText = {
  ui: {
    guide_title: "Pomoc i przewodnik",
    guide_subtitle: "Wszystko, czego musisz nauczyć się o HapCargo, rozdział po rozdziale",
    guide_search: "Szukaj w przewodniku: strona, funkcja, status…",
    guide_no_results: "Żaden rozdział nie pasuje do wyszukiwania.",
    guide_clear: "Wyczyść wyszukiwanie",
    guide_categories: "Kategorie",
    guide_chapters: "rozdziałów",
    guide_quick_start: "Pierwszy raz? Wykonaj te trzy kroki",
    guide_continue: "Kontynuuj czytanie",
    guide_progress: "Postęp przewodnika",
    guide_mark_read: "Oznacz jako przeczytane",
    guide_read: "Przeczytane",
    guide_open_page: "Otwórz tę stronę",
    guide_print: "Drukuj rozdział",
    guide_prev: "Poprzedni",
    guide_next: "Następny",
    guide_in_chapter: "W tym rozdziale",
    guide_tip: "Warto wiedzieć",
    guide_warning: "Uwaga",
    guide_steps: "Krok po kroku",
    guide_fields: "Kluczowe opcje",
    guide_results: "wyników",
    guide_all: "Wszystkie rozdziały",
    guide_back: "Wróć do przeglądu",
    guide_chapter: "Rozdział",
    guide_minutes: "min czytania",
    guide_shortcut_hint: "Wskazówka: naciśnij ?, aby zobaczyć skróty klawiaturowe.",
    guide_read_chapters: "przeczytanych rozdziałów",
    guide_reset: "Zresetuj postęp",
    guide_start_here: "Zacznij tutaj",
    guide_open_menu: "Otwórz menu rozdziałów",
    guide_close_menu: "Zamknij menu rozdziałów",
    guide_language_note: "Ten przewodnik jest napisany we wszystkich siedmiu językach aplikacji i podąża za językiem wybranym na górnym pasku.",
    guide_updated: "Ostatnio sprawdzony z bieżącą wersją TMS.",
    guide_search_results: "Wyniki wyszukiwania",
  },
  categories: {
    start: {
      title: "Pierwsze kroki",
      summary: "Interfejs, codzienny przepływ i nawyki, które przyspieszają wszystko inne.",
    },
    operations: {
      title: "Codzienna operacja",
      summary: "Zlecenia, trasy, planowanie, śledzenie na żywo, czat i dokumenty — serce TMS.",
    },
    fleet: {
      title: "Flota i kierowcy",
      summary: "Ciężarówki, naczepy, kierowcy, serwis, telematyka i tachograf.",
    },
    finance: {
      title: "Finanse",
      summary: "Faktury, płatności, wydatki, płace, rozliczenia, analizy i raporty.",
    },
    commercial: {
      title: "Sprzedaż i zgodność",
      summary: "Klienci, strona www, zapytania ofertowe, tranzyt UE i portal klienta.",
    },
    admin: {
      title: "Administracja",
      summary: "Użytkownicy, role, uprawnienia, dane firmy, taryfy i połączenia.",
    },
    assist: {
      title: "Pomoc i rozwiązywanie problemów",
      summary: "Co zrobić, gdy coś blokuje, plus słownik wszystkich pojęć.",
    },
  },
  chapters: {
    welcome: {
      title: "Ekran w jednym spojrzeniu",
      summary: "Co gdzie jest w HapCargo i z jakich elementów korzystasz codziennie.",
      blocks: [
        {
          kind: "diagram",
          variant: "layout",
          title: "Anatomia każdego ekranu",
          callouts: [
            "Pasek boczny — moduły, które twoja rola może otwierać.",
            "Tytuł strony i zakładki modułów (Zlecenia / Oferty, Ciężarówki / Naczepy, Płace / Rozliczenia).",
            "Wyszukiwanie globalne — znajdź dowolną stronę, zlecenie, trasę, klienta lub fakturę przez Ctrl+K.",
            "Pomoc i przewodnik — ta strona, z opisem każdej funkcji.",
            "Skróty klawiaturowe — naciśnij ?, aby otworzyć ten sam panel.",
            "Jasny / ciemny motyw obszaru pracy.",
            "Powiadomienia — zmiany statusu, wygasające dokumenty, czaty i ryzyko opóźnienia.",
            "Wybór języka i menu profilu (instalacja, wylogowanie, wylogowanie wszędzie).",
          ],
        },
        {
          kind: "p",
          text: "HapCargo to system zarządzania transportem (TMS) firmy: zlecenia handlowe, planowanie, trasy, flota, kierowcy, dokumenty, fakturowanie i raporty w jednym miejscu. Pasek boczny jest budowany według twojej roli, więc dwóch kolegów może widzieć różne moduły.",
        },
        { kind: "h", text: "Co możesz tu zrobić" },
        {
          kind: "list",
          items: [
            "Przełączać moduły z paska bocznego; zwinąć go strzałką na krawędzi.",
            "Zmienić język interfejsu w dowolnym momencie — wybór zapisuje się w przeglądarce.",
            "Szukać globalnie przez Ctrl+K lub nacisnąć /, aby przejść do wyszukiwania bieżącej strony.",
            "Nacisnąć N na stronie listy, aby utworzyć rekord, i ? aby zobaczyć wszystkie skróty.",
            "Zainstalować TMS jako aplikację desktopową (PWA) z ikony pobierania lub menu profilu.",
            "Czytać ten przewodnik we wszystkich siedmiu językach; każdy rozdział linkuje do opisanej strony.",
          ],
        },
        { kind: "h", text: "Twoje pierwsze dziesięć minut" },
        {
          kind: "steps",
          items: [
            "Sprawdź swoje imię i rolę w prawym górnym rogu — decydują, co możesz otworzyć.",
            "Wybierz język na górnym pasku.",
            "Otwórz Pulpit i ustaw interesujący cię okres (dziś, tydzień, miesiąc).",
            "Użyj Ctrl+K, aby znaleźć prawdziwe zlecenie lub klienta i otworzyć je; to najszybszy sposób nauki układu.",
            "Wracaj do tego przewodnika przez ikonę książki, gdy ekran nie jest jasny.",
          ],
        },
        {
          kind: "tip",
          text: "TMS pamięta filtry, rozmiar strony i ostatni widok podczas przechodzenia między stronami. Zainstalowany jako PWA pokazuje też offline strony, które już odwiedziłeś.",
        },
        {
          kind: "warn",
          text: "Brak modułu na pasku bocznym to uprawnienie, nie błąd. Administrator musi dodać tę stronę do twojego konta w Użytkownicy i role.",
        },
      ],
    },
    "first-day": {
      title: "Jedno zlecenie transportowe od początku do końca",
      summary: "Normalne życie zlecenia: od prośby klienta do pieniędzy na koncie.",
      blocks: [
        {
          kind: "p",
          text: "Prawie każde zadanie w TMS należy do jednego łańcucha. Naucz się go raz i zawsze będziesz wiedzieć, gdzie jesteś i co dalej.",
        },
        {
          kind: "diagram",
          variant: "flow",
          title: "Łańcuch operacyjny",
          callouts: [
            "Zlecenie — czego chce klient: trasa, terminy, ładunek, cena.",
            "Planowanie — najtańsza wykonalna pozycja tego zlecenia na ciężarówce.",
            "Trasa — wykonalny objazd z postojami, ETA, kierowcą i dokumentami.",
            "Dokumenty — CMR, POD, zdjęcia i wszystko, czego potrzebuje klient lub biuro.",
            "Faktura — wystawiona z dostarczonego zlecenia lub trasy, z automatyczną numeracją.",
            "Płatność — zapisana na fakturze; raporty i wiekowanie naliczeń idą automatycznie.",
          ],
        },
        {
          kind: "steps",
          items: [
            "Administrator uzupełnia dane firmy, dane bankowe i taryfy w Ustawieniach.",
            "Dodaj klienta, potem ciężarówkę, naczepę i kierowcę w Flota i Kierowcy.",
            "Utwórz zlecenie w Zlecenia kreatorem trzech kroków.",
            "Otwórz Planowanie, przypisz zlecenie do najtańszej wykonalnej ciężarówki i potwierdź.",
            "Kierowca wykonuje trasę w aplikacji mobilnej; biuro śledzi ją na Mapie na żywo i w Czacie.",
            "Wgraj CMR/POD w Dokumenty i podepnij do trasy.",
            "Wystaw fakturę, zapisz płatność i zamknij miesiąc w Płace i Raporty.",
          ],
        },
        {
          kind: "tip",
          text: "Konfigurację robi się raz i używa wszędzie: dane firmy są na PDF-ach, wymiary floty decydują, co Planowanie może załadować, a taryfy zasilają kalkulator ceny.",
        },
        {
          kind: "warn",
          text: "Planowanie nigdy nie wymyśla danych. Jeśli ciężarówka nie ma wymiarów wewnętrznych, brakuje trasy lub kierowca nie ma zapisów tachografu, system pokazuje NIEZWERYFIKOWANE zamiast zgadywać.",
        },
      ],
    },
    orders: {
      title: "Zlecenia — od zapytania do dostawy",
      summary: "Twórz, edytuj, filtruj i fakturować zlecenia transportowe kreatorem trzech kroków.",
      blocks: [
        {
          kind: "p",
          text: "Zlecenia to handlowy punkt wejścia. Każde zlecenie zawiera klienta, cenę, okna załadunku i dostawy, ładunek, a później powiązanie z trasą i fakturą. Zapytania ofertowe są w zakładce obok Zleceń, jeśli rola na to pozwala.",
        },
        {
          kind: "diagram",
          variant: "wizard",
          title: "Kreator zlecenia",
          callouts: [
            "Trzy kroki: Informacje ogólne, Załadunek i dostawa, Pozycje ładunku.",
            "Ogólne — klient, uzgodniona cena, waluta, typ transportu, sprzęt i priorytet.",
            "Trasa — adresy z autouzupełnianiem, daty, okna czasowe, kontakty i referencje.",
            "Ładunek — opis, palety/ilość, waga w kg, metry ładunkowe i objętość.",
            "Zapisz — system waliduje zlecenie i udostępnia je Planowaniu.",
          ],
        },
        { kind: "h", text: "Co możesz tu zrobić" },
        {
          kind: "list",
          items: [
            "Szukać i filtrować po statusie, kliencie, kraju, typie transportu, priorytecie i dacie.",
            "Otworzyć wiersz, aby zobaczyć kartę zlecenia, lub edytować je z akcji wiersza.",
            "Zduplikować zlecenie dla stałej trasy i usunąć lub zarchiwizować to, czego już nie używasz.",
            "Wyeksportować filtrowaną listę do Excel, CSV lub PDF albo zaimportować zlecenia z Excel / dokumentu odczytanego przez AI.",
            "Wygenerować fakturę ze zlecenia po dostawie; powiązanie zostaje dla audytu.",
            "Zaznaczyć kilka wierszy, aby wyeksportować lub usunąć je jedną akcją.",
          ],
        },
        { kind: "h", text: "Trzy kroki kreatora" },
        {
          kind: "table",
          head: ["Krok", "Co wypełniasz"],
          rows: [
            ["Informacje ogólne", "Klient, cena i waluta, typ transportu, sprzęt, priorytet, notatki."],
            ["Załadunek i dostawa", "Adres, data, okno czasowe, osoba kontaktowa, telefon, referencje załadunku/rozładunku."],
            ["Pozycje ładunku", "Opis, ilość/palety, waga (kg), LDM, objętość (m³), szczegóły ADR, jeśli potrzeba."],
          ],
        },
        { kind: "h", text: "Pola, które decydują o całej reszcie" },
        {
          kind: "list",
          items: [
            "Cena i waluta — z nich liczone są zysk, marża i raporty.",
            "Waga i palety — Planowanie porównuje je z pojemnością ciężarówki i naczepy.",
            "LDM i m³ — używane, gdy ciężarówka jest ograniczona metrami ładunkowymi lub objętością, nie tylko wagą.",
            "ADR — oznacza towary niebezpieczne i pokazuje plakietkę wszędzie, gdzie pojawia się zlecenie.",
            "Okna czasowe — Planowanie i ETA ich przestrzegają; pominięte okno to twardy konflikt.",
          ],
        },
        {
          kind: "tip",
          text: "Wpisz miasto i wybierz podpowiedź: adres jest geokodowany, dzięki czemu działa trasowanie, ETA i mapa na żywo. Adres wpisany swobodnie, bez współrzędnych, nie może być trasowany.",
        },
        {
          kind: "warn",
          text: "Załadunek i dostawa nie mogą być pod tym samym adresem w jednym zleceniu. Ładunek ponad pojemność przypisanej ciężarówki nie jest blokowany przy tworzeniu, ale Planowanie odmówi potwierdzenia.",
        },
      ],
    },
    trips: {
      title: "Trasy — realizacja i monitoring",
      summary: "Śledź, co jest w drodze, kto prowadzi, ile to kosztuje i co dostarczono.",
      blocks: [
        {
          kind: "p",
          text: "Trasa to wykonalna strona jednego lub kilku zleceń: ciężarówka, naczepa, kierowca, uporządkowana lista postojów i harmonogram. Trasy powstają w Planowaniu, a potem aktualizuje je aplikacja kierowcy i biuro.",
        },
        { kind: "h", text: "Lista" },
        {
          kind: "list",
          items: [
            "Pasek wskaźników z trasami aktywnymi, zaplanowanymi, opóźnionymi i zakończonymi oraz przychodem i zyskiem.",
            "Filtry po statusie, ciężarówce, kierowcy i dacie, wyszukiwanie po numerze trasy, rejestracji, kierowcy i mieście.",
            "Sortowalne kolumny wyjazdu, dystansu, wagi, przychodu, kosztu i zysku.",
            "Wielokrotny wybór do eksportu lub usunięcia i profil PDF dla każdej trasy.",
            "Odświeżanie na żywo, gdy kierowca zmieni status lub zgłosi incydent.",
          ],
        },
        { kind: "h", text: "W karcie trasy" },
        {
          kind: "list",
          items: [
            "Podsumowanie: status, ciężarówka, naczepa, kierowca, przychód, szacowany koszt i zysk.",
            "Trasa i postoje w kolejności, z przyjazdem/wyjazdem, ETA i statusem okna.",
            "Ładunek na pokładzie: waga, palety, LDM i objętość wobec zapisanych limitów.",
            "Dokumenty i historia aktywności — każda zmiana statusu jest zapisana z czasem i autorem.",
            "Linki do zleceń, tablicy planowania i mapy na żywo.",
          ],
        },
        { kind: "h", text: "Główne statusy" },
        {
          kind: "list",
          items: [
            "PLANNING / ACCEPTED — utworzona, czeka na start kierowcy.",
            "EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → LOADING — sekwencja załadunku.",
            "EN_ROUTE_TO_DELIVERY → ARRIVED_AT_DELIVERY → UNLOADING — sekwencja dostawy.",
            "COMPLETED — dostarczona i zamknięta; DELAYED / EXCEPTION — wymaga uwagi.",
            "DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — wyniki dostawy wpływające na fakturowanie.",
            "CANCELLED — trasa odwołana; zlecenia można zaplanować ponownie.",
          ],
        },
        {
          kind: "tip",
          text: "Otwórz trasę ze zlecenia lub zlecenie z trasy: oba widoki zawsze wskazują na siebie, więc nie tracisz kontekstu handlowego.",
        },
        {
          kind: "warn",
          text: "Nie usuwaj trasy, która ma dokumenty lub fakturę. Zamknij ją jako CANCELLED lub COMPLETED, aby audyt i portal klienta pozostały poprawne.",
        },
      ],
    },
    planning: {
      title: "Planowanie — tablica i jej narzędzia",
      summary: "Przypisz zlecenia do najtańszej wykonalnej ciężarówki, rozwiąż konflikty i potwierdź realny harmonogram.",
      blocks: [
        {
          kind: "p",
          text: "Planowanie to kokpit dyspozytora: nieprzypisane zlecenia po jednej stronie, tablica floty po drugiej. Tablica pokazuje ciężarówki i dni, os czasu pokazuje godziny, a każde przypisanie jest walidowane przez backend, zanim cokolwiek zostanie zapisane.",
        },
        { kind: "h", text: "Jak planować" },
        {
          kind: "list",
          items: [
            "Przeciągnij nieprzypisane zlecenie na komórkę ciężarówka/dzień lub otwórz je i wybierz ciężarówkę.",
            "Użyj osi czasu dla godzin, przerw, odpoczynku dziennego i nakładających się tras.",
            "Użyj inteligentnej konsolidacji dla najtańszej wykonalnej pozycji wstawienia w istniejącej trasie.",
            "Zapisz widok (filtry, zoom, układ) i wróć do niego później.",
            "Porównaj scenariusze przed potwierdzeniem i cofnij ostatnią potwierdzoną zmianę, jeśli trzeba.",
            "Wydrukuj lub wyeksportuj tablicę na poranne spotkanie.",
          ],
        },
        { kind: "h", text: "Narzędzia na pasku" },
        {
          kind: "table",
          head: ["Narzędzie", "Kiedy używać"],
          rows: [
            ["Inteligentna konsolidacja", "Dodanie zlecenia do istniejącej trasy; pokazuje zalecaną i alternatywne kolejności postojów z realnymi dodatkowymi km."],
            ["Podziel / Połącz trasy", "Trasa jest za długa lub dwie trasy mogą jechać razem."],
            ["Cross-dock / Drop & hook", "Zamiana naczepy lub ładunku w hubie bez pełnej dostawy."],
            ["Podwykonawca", "Oddanie odcinka partnerowi przy zachowaniu zlecenia klienta w TMS."],
            ["Optymalizacja floty", "System proponuje najlepszą ciężarówkę dla zestawu zleceń."],
            ["Porównanie tras", "Porównaj dostawców, dystans, opłaty drogowe i czas przed wyborem."],
            ["Incydenty drogowe", "Zobacz zakłócenia na żywo wpływające na dzisiejszy plan."],
            ["Paleta poleceń", "Uruchom akcję planowania z klawiatury, bez szukania przycisku."],
          ],
        },
        { kind: "h", text: "Potwierdzenie konsolidacji" },
        {
          kind: "steps",
          items: [
            "Wybierz zlecenia do dodania i otwórz kreator.",
            "Przeczytaj werdykt: wykonalne, ostrzeżenie lub zablokowane; zablokowanego nie można wymusić.",
            "Wybierz zalecaną kolejność postojów lub alternatywę; każda pokazuje własny dodatkowy dystans i ETA.",
            "Sprawdź ładunek wobec pojemności, zgodności sprzętu, okien postojów i godzin kierowcy.",
            "Jeśli zostaje ostrzeżenie, wpisz powód odstępstwa — jest zapisywany z twoim nazwiskiem w audycie.",
            "Potwierdź raz. Zapis jest transakcyjny i idempotentny: ponowna próba nie może utworzyć drugiej trasy.",
          ],
        },
        {
          kind: "tip",
          text: "Werdykt jest jedynym źródłem prawdy. Ekran pokazuje dokładnie to, co zdecydował backend — nigdy łagodniejszą wersję.",
        },
        {
          kind: "warn",
          text: "Twarde konflikty zatrzymują potwierdzenie: pominięte okno, nadwaga/za dużo palet, nakładanie ciężarówki/naczepy/kierowcy, brak wymaganego sprzętu. Napraw dane lub plan; nigdy nie obchodź prawdziwej blokady.",
        },
      ],
    },
    "map-chat": {
      title: "Mapa na żywo, linki śledzenia i czat",
      summary: "Zobacz, gdzie jest każda ciężarówka, wyślij klientowi link śledzenia i rozmawiaj z kierowcami w czasie rzeczywistym.",
      blocks: [
        {
          kind: "p",
          text: "Mapa na żywo łączy pozycje GPS z telematyki z planowaną trasą, następnym postojem i ETA na żywo. Czat to bezpośrednia linia do kierowcy, a publiczne śledzenie pozwala klientowi śledzić jedną trasę bez konta w TMS.",
        },
        { kind: "h", text: "Mapa na żywo" },
        {
          kind: "list",
          items: [
            "Znaczniki ciężarówek z rejestracją, kierowcą i bieżącą aktywnością; kliknij, aby zobaczyć szczegóły.",
            "Następny załadunek/dostawa, szacowany przyjazd i pozostała trasa wybranej trasy.",
            "Wyszukiwanie po rejestracji, kierowcy lub mieście; mapa podąża za wyborem.",
            "Aktualizacje na żywo przez WebSocket plus odświeżanie zapasowe, gdy połączenie padnie.",
            "Aktywność tachografu i status połączenia obok ciężarówki, gdy są dostępne.",
          ],
        },
        { kind: "h", text: "Udostępnianie linku śledzenia" },
        {
          kind: "steps",
          items: [
            "Otwórz trasę lub zlecenie i wybierz akcję udostępniania/śledzenia.",
            "Wyślij klientowi wygenerowany link (/track/…); otwiera stronę śledzenia tylko do odczytu.",
            "Link pokazuje bieżącą pozycję i ETA, nie ceny, koszty ani notatki wewnętrzne.",
          ],
        },
        { kind: "h", text: "Czat i powiadomienia" },
        {
          kind: "list",
          items: [
            "Jedno pomieszczenie na trasę plus ogólne pomieszczenie dyspozytorni; wiadomości przychodzą w czasie rzeczywistym.",
            "Załączaj zdjęcia i PDF-y — przydatne przy uszkodzeniu ładunku, stronach CMR lub dowodzie dostawy.",
            "Nieprzeczytane wiadomości i zmiany statusu pojawiają się w menu dzwonka i jako popup.",
            "Powiadomienia desktopowe włączasz w menu dzwonka; przeglądarka pyta o zgodę raz.",
          ],
        },
        {
          kind: "tip",
          text: "Klient dzwoniący po ETA to najczęstsze zapytanie do wsparcia. Link śledzenia odpowiada na nie, bez otwierania TMS.",
        },
        {
          kind: "warn",
          text: "Ciężarówka bez połączenia telematyki pokazuje ostatnią znaną pozycję, nie bieżącą. Stary znacznik czasu traktuj jako „pozycja niezweryfikowana”, nigdy jako aktualną lokalizację.",
        },
      ],
    },
    documents: {
      title: "Dokumenty — CMR, POD i cała reszta",
      summary: "Wgrywaj, klasyfikuj, udostępniaj i znajdź papiery stojące za każdą trasą.",
      blocks: [
        {
          kind: "p",
          text: "Dokumenty trzymają ślad papierowy w jednym miejscu i wiążą go z trasą, aby biuro, portal klienta i faktura wskazywały ten sam plik.",
        },
        {
          kind: "steps",
          items: [
            "Otwórz Dokumenty i wybierz Wgraj (lub naciśnij N).",
            "Wybierz plik z komputera lub przeciągnij go do okna.",
            "Wybierz typ dokumentu i, jeśli to możliwe, trasę, do której należy.",
            "Dodaj notatki dla kolegów — co dokument potwierdza lub czego brakuje.",
            "Zapisz, a potem użyj pobierania, podglądu lub udostępniania z listy.",
          ],
        },
        {
          kind: "table",
          head: ["Typ", "Do czego służy"],
          rows: [
            ["CMR", "Międzynarodowy list przewozowy, dokument prawny transportu."],
            ["POD", "Dowód dostawy podpisany przez odbiorcę."],
            ["List dostawczy / lista pakowa", "Co przekazano i w jakiej ilości."],
            ["Faktura", "Kopia faktury handlowej w teczce."],
            ["Zdjęcie", "Stan przy załadunku, uszkodzenie, plomba lub liczba palet."],
            ["Kwit wagowy / inne", "Kwit z wagi lub dokument bez własnej kategorii."],
          ],
        },
        { kind: "h", text: "Praca z listą" },
        {
          kind: "list",
          items: [
            "Szukaj po nazwie pliku, typie, referencji lub trasie; filtruj po typie i referencji.",
            "Podglądaj zdjęcia i PDF-y bez pobierania.",
            "Udostępnij dokument przez publiczny link z tokenem, a potem go unieważnij.",
            "Usuń błędne wgranie — akcja najpierw prosi o potwierdzenie.",
          ],
        },
        {
          kind: "tip",
          text: "Wgraj CMR i POD przed zamknięciem trasy: portal klienta i faktura pokazują wtedy kompletną teczkę, a rozliczenie miesiąca nie goni papierów.",
        },
        {
          kind: "warn",
          text: "Udostępniony link jest publiczny dla każdego, kto go ma, aż wygaśnie lub zostanie unieważniony. Nigdy nie udostępniaj dokumentu z kosztami lub notatkami wewnętrznymi.",
        },
      ],
    },
    fleet: {
      title: "Flota, naczepy i serwis",
      summary: "Utrzymuj kompletne dane pojazdów — Planowanie od nich zależy — i wyprzedzaj serwisy i terminy.",
      blocks: [
        {
          kind: "p",
          text: "Flota i wyposażenie ma dwie zakładki, Ciężarówki i Naczepy. Dane wpisywane tutaj nie są dekoracją: wymiary, pojemności i wyposażenie decydują, co Planowanie może załadować i co pokazują faktury oraz raporty.",
        },
        { kind: "h", text: "Ciężarówki" },
        {
          kind: "list",
          items: [
            "Tożsamość: rejestracja, marka, model, rok, VIN i kraj rejestracji.",
            "Przypisanie: status, bieżący kierowca i podpięta naczepa.",
            "Pojemność: maksymalna masa, ładowność, palety, LDM, objętość i wymiary wewnętrzne.",
            "Wyposażenie: typ zabudowy, norma euro i cechy używane do sprawdzania zgodności.",
            "Koszty: typ i cena paliwa/energii, średnie zużycie i koszt na km.",
            "Dokumenty: badania, ubezpieczenie, tachograf i inne papiery z datami ważności i alertami.",
          ],
        },
        { kind: "h", text: "Naczepy" },
        {
          kind: "list",
          items: [
            "Rejestracja, typ (mega, frigo, standard, walking floor, kontener, platforma), status i wymiary.",
            "Pojemność w paletach, LDM, m³ i wadze oraz własny zestaw dokumentów z terminami.",
            "Naczepa musi pasować do wymagania sprzętowego zlecenia; brakujące dane stają się NIEZWERYFIKOWANE.",
          ],
        },
        {
          kind: "table",
          head: ["Pole", "Dlaczego ważne"],
          rows: [
            ["Długość / szerokość / wysokość wewnętrzna", "Sprawdzenie zgodności dla mega, frigo i ładunku ograniczonego objętością."],
            ["Ładowność i maksymalna masa", "Nadwaga blokuje potwierdzenie planowania."],
            ["Palety i LDM", "Nadmiar palet i limity metrów ładunkowych też blokują."],
            ["Typ paliwa i zużycie", "Koszt na km, koszt trasy i szacunki CO₂."],
          ],
        },
        { kind: "h", text: "Serwis" },
        {
          kind: "list",
          items: [
            "Zapisuj serwisy prewencyjne i naprawcze, badania, opony i naprawy.",
            "Wpisz datę, przebieg, koszt części i robocizny, dostawcę i notatki; dołącz fakturę lub raport.",
            "Statusy: zaplanowany, w toku, wykonany; zaległe i nadchodzące serwisy są wyróżnione.",
            "Użyj przebiegu i następnego km serwisu, aby zaplanować przegląd przed awarią.",
          ],
        },
        {
          kind: "tip",
          text: "Otwórz ciężarówkę lub naczepę, aby zobaczyć kartę: podsumowanie, dokumenty, historię aktywności, przypisanego kierowcę i profil PDF do druku.",
        },
        {
          kind: "warn",
          text: "Ciężarówki używanej przez aktywną trasę nie można po prostu usunąć. Najpierw zakończ, anuluj lub przypisz trasę ponownie i pozwól zarchiwizować dokumenty razem z nią.",
        },
      ],
    },
    drivers: {
      title: "Kierowcy, dokumenty i godziny jazdy",
      summary: "Karta kierowcy, terminy ważności, dostępność i godziny, których Planowanie musi przestrzegać.",
      blocks: [
        {
          kind: "p",
          text: "Kierowcy łączą osobę, konto używane w aplikacji mobilnej, prawo jazdy i dane medyczne, przypisaną ciężarówkę oraz zapisane godziny jazdy.",
        },
        { kind: "h", text: "Karta kierowcy" },
        {
          kind: "list",
          items: [
            "Imię i nazwisko, e-mail, telefon i hasło do aplikacji mobilnej.",
            "Numer prawa jazdy, dieta dzienna i wynagrodzenie brutto do płac.",
            "Przypisana ciężarówka i status dostępności.",
            "Prawo jazdy, orzeczenie medyczne i karta tachografu z datami ważności.",
            "Zakładka dokumentów na skany oraz historia aktywności każdej zmiany.",
          ],
        },
        {
          kind: "table",
          head: ["Dokument", "Co się dzieje po wygaśnięciu"],
          rows: [
            ["Prawo jazdy", "Alert w powiadomieniach; karta jest oznaczona, a raporty zgodności to pokazują."],
            ["Orzeczenie medyczne", "Ten sam przepływ alertów; zachowaj skan w dokumentach kierowcy."],
            ["Karta tachografu", "Alert o wygaśnięciu; bez ważnej karty kierowca nie może legalnie rejestrować aktywności."],
            ["Status dostępności", "Dostępny, w trasie, wolny, chory lub urlop — Planowanie i dyspozytornia widzą od razu."],
          ],
        },
        { kind: "h", text: "Godziny jazdy (HOS)" },
        {
          kind: "list",
          items: [
            "Zapisuj jazdę, pracę, przerwy i odpoczynek na dzień w karcie kierowcy, gdy tachograf nie jest podłączony.",
            "Limity modelu planowania: 9 h jazdy dziennie, 56 h tygodniowo, 45 min przerwy po 4,5 h, 11 h odpoczynku dziennego.",
            "Brakujące zapisy pokazują się jako niezweryfikowane — nigdy jako nieograniczona dostępność.",
            "Strona Tachograf pokazuje aktywność całej floty na żywo, odświeżaną co kilka sekund.",
          ],
        },
        {
          kind: "tip",
          text: "Kierowca bez ciężarówki i bez godzin może istnieć w systemie, ale Planowanie traktuje jego dostępność jako niezweryfikowaną, zamiast zakładać, że jest wolny.",
        },
        {
          kind: "warn",
          text: "Dezaktywacja kierowcy natychmiast blokuje logowanie mobilne. Najpierw sprawdź, czy żadna otwarta trasa nie zależy od tego konta, i przekaż trasę.",
        },
      ],
    },
    telematics: {
      title: "Telematyka i tachograf",
      summary: "Podłącz urządzenie ciężarówki, zweryfikuj strumień i korzystaj z pozycji oraz aktywności na żywo.",
      blocks: [
        {
          kind: "p",
          text: "Hub telematyki zarządza połączeniem między ciężarówką a jej dostawcą telematyki lub tachografu. Gdy połączenie jest aktywne, pozycje, aktywność jazdy i ETA trafiają na Mapę na żywo i stronę Tachograf.",
        },
        {
          kind: "steps",
          items: [
            "Otwórz Telematykę i wybierz Dodaj połączenie.",
            "Wybierz ciężarówkę i dostawcę (do szkoleń dostępny jest symulator testowy).",
            "Wpisz identyfikator urządzenia/pojazdu dostawcy i typ urządzenia (OBD, FMS, tachograf).",
            "Dla tachografów dodaj markę, model, numer seryjny i generację.",
            "Wpisz dane dostępowe dostawcy dokładnie tak, jak zostały przekazane; są przechowywane po stronie serwera.",
            "Uruchom test połączenia, aktywuj i sprawdź pierwszą pozycję na mapie.",
          ],
        },
        {
          kind: "table",
          head: ["Status", "Znaczenie"],
          rows: [
            ["Online / połączone", "Dostawca wysyła dane dla tej ciężarówki."],
            ["Offline", "Brak świeżych danych; mapa pokazuje ostatnią znaną pozycję ze znacznikiem czasu."],
            ["Błąd / dane dostępowe", "Dostawca odrzucił dane dostępowe lub identyfikator urządzenia — popraw i przetestuj ponownie."],
            ["Symulator", "Dane syntetyczne do szkoleń; nigdy nie używaj ich do realnej obietnicy dla klienta."],
          ],
        },
        { kind: "h", text: "Co zasilają dane" },
        {
          kind: "list",
          items: [
            "Mapa na żywo: pozycja, kierunek, bieżąca aktywność i status połączenia.",
            "Tachograf: jazda, praca, dostępność i odpoczynek, z licznikami dziennymi i tygodniowymi.",
            "Planowanie: rzeczywiste zapisy jazdy/odpoczynku, gdy są; w przeciwnym razie dostępność niezweryfikowana.",
            "Pulpit i raporty: wskaźniki telemetrii i niezawodności.",
          ],
        },
        {
          kind: "tip",
          text: "Używaj symulatora telematyki do szkolenia nowych kolegów: generuje pozycje i aktywności bez dotykania prawdziwej ciężarówki ani obietnicy dla klienta.",
        },
        {
          kind: "warn",
          text: "Klucze API i sekrety klienta dostawcy to dane firmy. Wpisuj je tylko w kreatorze połączenia, nigdy w czacie, e-mailu ani udostępnionym dokumencie.",
        },
      ],
    },
    invoices: {
      title: "Faktury, płatności i przypomnienia",
      summary: "Wystawiaj, wysyłaj, inkasuj i uzgadniaj finansową stronę każdej trasy.",
      blocks: [
        {
          kind: "p",
          text: "Faktury można tworzyć ze zlecenia/trasy lub ręcznie. Numeracja jest automatyczna, a PDF używa danych firmy i banku z Ustawień, więc uzupełnij tę stronę przed pierwszą fakturą.",
        },
        {
          kind: "diagram",
          variant: "finance",
          title: "Od dostawy do gotówki",
          callouts: [
            "Dostarczone zlecenie lub trasa — dokument źródłowy i powiązanie audytowe.",
            "Faktura — szkic, sprawdzona, potem wystawiona z automatycznym numerem.",
            "PDF / e-mail / link — klient otrzymuje ten sam dokument.",
            "Płatność — pełna lub częściowa, z datą, metodą i referencją.",
            "Wiekowanie i raporty — saldo należności na klienta, w przedziałach dni.",
          ],
        },
        {
          kind: "steps",
          items: [
            "Otwórz Faktury i utwórz nową lub użyj akcji fakturowania na dostarczonym zleceniu.",
            "Wybierz klienta, datę wystawienia, termin płatności i walutę.",
            "Dodaj pozycje z opisem, ilością, ceną jednostkową i VAT; sprawdź sumy.",
            "Zapisz jako szkic, sprawdź, a potem wystaw ostateczny numer.",
            "Pobierz PDF, wyślij e-mailem lub udostępnij klientowi.",
            "Zapisz płatność, gdy wpłynie, i sprawdź pozostałe saldo.",
          ],
        },
        {
          kind: "table",
          head: ["Status", "Znaczenie"],
          rows: [
            ["Szkic", "Edytowalna, niewystawiona; brak ostatecznego numeru i wysłanego PDF."],
            ["Wystawiona / wysłana", "Ostateczny dokument przekazany klientowi."],
            ["Częściowo zapłacona", "Niektóre płatności zapisane; saldo pozostaje widoczne."],
            ["Zapłacona", "W pełni rozliczona."],
            ["Przeterminowana", "Termin minął bez pełnej płatności; wyróżniona i w przypomnieniach."],
            ["Anulowana", "Unieważniona; zachowaj ją dla audytu zamiast usuwać."],
          ],
        },
        { kind: "h", text: "Windykacja" },
        {
          kind: "list",
          items: [
            "Zapisuj pełne lub częściowe płatności na fakturze; saldo aktualizuje się automatycznie.",
            "Otwórz raport wiekowania, aby zobaczyć bieżące, 1–30, 31–60, 61–90 i 90+ dni.",
            "Wysyłaj przypomnienia do klientów z przeterminowanymi fakturami z akcji przypomnienia.",
            "Eksportuj filtrowany rejestr do Excel, CSV lub PDF dla księgowości.",
          ],
        },
        {
          kind: "tip",
          text: "Fakturuj ze zlecenia, gdy tylko można: numer zlecenia, klient, trasa i dokumenty pozostają powiązane, a portal klienta pokazuje tę samą fakturę.",
        },
        {
          kind: "warn",
          text: "Szkic nie ma ostatecznego numeru. Nigdy nie wysyłaj klientowi PDF-a szkicu; najpierw go wystaw. Jeśli dane firmy lub IBAN się zmienią, stare PDF-y nie są przepisywane.",
        },
      ],
    },
    "expenses-payroll": {
      title: "Wydatki, płace i rozliczenia",
      summary: "Zapisuj koszty firmy i zamykaj miesiąc dla kierowców i podwykonawców.",
      blocks: [
        { kind: "p", text: "Wydatki rejestrują koszty niezwiązane z jedną trasą, a Płace i Rozliczenia liczą, ile kierowcy zarabiają w miesiącu." },
        { kind: "h", text: "Wydatki" },
        {
          kind: "list",
          items: [
            "Kwota i waluta, kategoria, data i opis.",
            "Kategorie: paliwo, serwis, księgowość, wynagrodzenie, opłaty drogowe i inne.",
            "Dołącz zdjęcie lub PDF paragonu; czytnik AI może uzupełnić pola z paragonu.",
            "Filtruj i szukaj na liście, edytuj lub usuwaj z potwierdzeniem.",
            "Wydatki zasilają kokpit finansowy i strukturę kosztów w raportach.",
          ],
        },
        { kind: "h", text: "Płace" },
        {
          kind: "steps",
          items: [
            "Wybierz miesiąc i rok.",
            "Uruchom Generuj — system liczy płace z tras miesiąca i danych płacowych kierowcy.",
            "Sprawdź listę, otwórz PDF kierowcy i popraw dane źródłowe, jeśli coś się nie zgadza.",
          ],
        },
        { kind: "h", text: "Rozliczenia" },
        {
          kind: "list",
          items: [
            "Generuj rozliczenie na kierowcę i miesiąc, wybierając tryb płatności (za km, procent, stała).",
            "Wpisz stawkę; rozliczenie pokazuje kilometry, przychód i wynikającą kwotę.",
            "Używaj rozliczeń dla kierowców-właścicieli i podwykonawców, gdzie płace nie są właściwym narzędziem.",
            "Zachowaj PDF z dokumentami miesiąca dla księgowości.",
          ],
        },
        {
          kind: "tip",
          text: "Zamykaj miesiąc w kolejności: wydatki → płace/rozliczenia → faktury → raporty. Każdy krok czyta dane wytworzone przez poprzedni.",
        },
        {
          kind: "warn",
          text: "Dwukrotne wygenerowanie płac za ten sam miesiąc może zdublować kwoty. Najpierw sprawdź istniejącą listę; popraw trasy źródłowe zamiast edytować liczby ręcznie.",
        },
      ],
    },
    analytics: {
      title: "Kokpit finansowy i raporty",
      summary: "Czytaj przychód, koszt, marżę i należności, a potem zamień je w raport do druku.",
      blocks: [
        { kind: "p", text: "Finanse to kokpit analityczny; Raporty tworzą wielokrotnego użytku, eksportowalne dokumenty z tych samych danych operacyjnych. Oba respektują wybrany okres i filtry." },
        { kind: "h", text: "Kokpit finansowy" },
        {
          kind: "list",
          items: [
            "Ustawienia okresu (ten miesiąc, poprzedni, 30/90 dni, 12 miesięcy, ten rok) lub własny przedział.",
            "Granularność dzień, tydzień lub miesiąc dla wykresów trendu.",
            "KPI: zafakturowane, zainkasowane, należne, przychód, koszt, zysk i marża.",
            "Struktura kosztów według kategorii i wiekowanie należności/zobowiązań.",
            "Eksport Excel całego kokpitu na spotkanie zarządu.",
          ],
        },
        { kind: "h", text: "Raporty" },
        {
          kind: "list",
          items: [
            "Przeglądaj katalog według sekcji: operacje, serwis, finanse i metodologia.",
            "Filtruj po kliencie, ciężarówce, kierowcy, okresie i granularności, a potem podejrzyj przed eksportem.",
            "Eksportuj do Excel, CSV lub PDF; wykresy są osadzone w PDF.",
            "Zapisz skonfigurowany raport do ponownego użycia, zaplanuj cykliczny i przeglądaj historię uruchomień.",
          ],
        },
        {
          kind: "table",
          head: ["Sekcja", "Typowe raporty"],
          rows: [
            ["Operacje", "Trasy, wykorzystanie, km załadowane/puste, opóźnienia, aktywność floty."],
            ["Serwis", "Punktualny załadunek/dostawa, pominięte okna, incydenty i niezawodność."],
            ["Finanse", "Przychód, koszt, zysk, marża, fakturowanie i należności."],
            ["Metodologia", "Definicje, założenia i uwagi o jakości danych za liczbami."],
          ],
        },
        {
          kind: "tip",
          text: "Przeczytaj sekcję metodologii, zanim przedstawisz liczbę: mówi, jakie dane były dostępne, a co pozostało niezweryfikowane, aby nikt nie obiecał wartości, której TMS nie może udowodnić.",
        },
        {
          kind: "warn",
          text: "Pusty wykres zwykle oznacza brak danych w wybranym okresie, nie zepsuty raport. Rozszerz daty, wyczyść filtr klienta/ciężarówki i sprawdź, czy faktury i trasy są zamknięte.",
        },
      ],
    },
    clients: {
      title: "Klienci i taryfy",
      summary: "Trzymaj kartę handlową, kontakty i dostęp do portalu w jednym miejscu.",
      blocks: [
        {
          kind: "p",
          text: "Karta klienta jest używana przez zlecenia, faktury, oferty i portal klienta. Kompletna karta to jeden rekord, a nie pięć wersji zapisu tej samej firmy.",
        },
        {
          kind: "list",
          items: [
            "Nazwa firmy, NIP/VAT, numer KRS, adres i kraj.",
            "Osoba kontaktowa, e-mail i telefon do ofert i faktur.",
            "Otwórz kartę klienta, aby zobaczyć szczegóły, zlecenia, trasy i faktury.",
            "Nadaj dostęp do portalu, aby klient śledził zlecenia, trasy, faktury i dokumenty.",
            "Szukaj, filtruj i eksportuj listę klientów; usuwaj dopiero po sprawdzeniu otwartych dokumentów.",
            "Taryfy i kalkulator ceny są w Ustawienia → Silnik taryf.",
          ],
        },
        { kind: "h", text: "Dodanie klienta i dostęp do portalu" },
        {
          kind: "steps",
          items: [
            "Utwórz klienta z nazwą prawną i NIP-em dokładnie jak na fakturze.",
            "Dodaj osobę kontaktową i e-mail, który będzie otrzymywał oferty i faktury.",
            "Otwórz szczegóły klienta i włącz dostęp do portalu.",
            "Wyślij zaproszenie/link do ustawienia hasła; klient wybiera hasło i loguje się na /portal/login.",
          ],
        },
        {
          kind: "table",
          head: ["Pole", "Gdzie się pojawia"],
          rows: [
            ["Nazwa prawna i adres", "PDF faktury, CMR, portal klienta."],
            ["NIP / VAT", "Faktura i raporty finansowe."],
            ["E-mail kontaktowy", "Odpowiedzi na oferty, faktury i zaproszenie do portalu."],
            ["Kraj", "Filtry, analiza tranzytu UE i raportowanie."],
          ],
        },
        {
          kind: "tip",
          text: "Zduplikowane karty klientów to zwykła przyczyna „brakujących” faktur. Przed utworzeniem nowego klienta szukaj po NIP.",
        },
        {
          kind: "warn",
          text: "Usunięcie klienta z fakturami lub dostępem do portalu psuje historię. Dezaktywuj portal lub zarchiwizuj; zachowaj powiązanie finansowe.",
        },
      ],
    },
    website: {
      title: "Treść strony, zapytania ofertowe i skrzynka",
      summary: "Publikuj stronę publiczną, odpowiadaj piszącym i zamieniaj oferty w zlecenia.",
      blocks: [
        { kind: "p", text: "Moduł Strona edytuje publiczną stronę firmy i zbiera jej wiadomości. Zapytania ofertowe są zakładką w module Zlecenia i przychodzą z formularza transportowego strony." },
        {
          kind: "table",
          head: ["Zakładka", "Co edytujesz"],
          rows: [
            ["Skrzynka", "Wiadomości kontaktowe ze strony; czytaj, odpowiadaj i śledź status."],
            ["Mapa i kraje", "Kraje i trasy pokazywane na publicznej mapie."],
            ["O nas", "Historia firmy, liczby i treści budujące zaufanie."],
            ["Usługi", "Karty usług i ich opisy."],
            ["Flota", "Pojazdy prezentowane na stronie publicznej."],
            ["Kariera", "Otwarte stanowiska i aplikacje."],
          ],
        },
        { kind: "h", text: "Zapytania ofertowe" },
        {
          kind: "list",
          items: [
            "Statusy: nowe, w analizie, skontaktowano, oferta, zaakceptowane, odrzucone.",
            "Otwórz zapytanie, aby przeczytać trasę, ładunek i dane kontaktowe.",
            "Odpowiedz ofertą cenową; historia odpowiedzi zostaje przy zapytaniu.",
            "Gdy klient zaakceptuje, użyj Utwórz zlecenie, aby zamienić ofertę w realne zlecenie bez przepisywania.",
          ],
        },
        { kind: "h", text: "Publikowanie" },
        {
          kind: "steps",
          items: [
            "Wybierz język edycji (RO, EN i pozostałe języki strony).",
            "Edytuj potrzebny blok i zapisz; TMS potwierdza zmianę.",
            "Otwórz stronę publiczną i sprawdź tekst, zanim ogłosisz go klientom.",
          ],
        },
        {
          kind: "tip",
          text: "Zapytania ofertowe zawierają już trasę i ładunek. Zamieniaj je w zlecenia, zamiast kopiować tekst do kreatora — źródłowe zapytanie pozostaje powiązane dla historii sprzedaży.",
        },
        {
          kind: "warn",
          text: "Zapis bloku zmienia publiczną stronę na żywo. Przeczytaj tekst dwa razy i sprawdź zakładkę języka przed zapisem.",
        },
      ],
    },
    compliance: {
      title: "Tranzyt UE, kabotaż i ADR",
      summary: "Udowodnij, gdzie jeździła flota, utrzymuj towary niebezpieczne widoczne i przestrzegaj zasad jazdy.",
      blocks: [
        { kind: "p", text: "Raport Tranzyt UE i kabotaż (dawniej IFTA) buduje obraz na kraj i ciężarówkę z tras zleceń. ADR jest cechą ładunku, a limity tachografu są ramą prawną używaną przez Planowanie." },
        {
          kind: "table",
          head: ["Pojęcie", "Znaczenie w TMS"],
          rows: [
            ["Tranzyt UE", "Przejazd przez kraj bez załadunku lub dostawy w nim."],
            ["Kabotaż", "Załadunek i dostawa w kraju, w którym nie masz siedziby; ograniczone zasadami UE."],
            ["ADR", "Towary niebezpieczne: zlecenie ma oznaczenie ADR, a plakietka pojawia się na każdym ekranie."],
            ["Tachograf / HOS", "Jazda, praca, dostępność i odpoczynek zapisane na kierowcę i pojazd."],
          ],
        },
        { kind: "h", text: "Raport krajów" },
        {
          kind: "list",
          items: [
            "Wybierz okres; sumy budowane są z tras z wyznaczoną marszrutą.",
            "Czytaj kilometry, trasy i udział na kraj oraz ten sam podział na ciężarówkę.",
            "Eksportuj raport do deklaracji lub teczki zgodności.",
            "Brak geometrii trasy lub kodu kraju pokazuje się jako niekompletne dane, nigdy jako zgadnięty dystans.",
          ],
        },
        { kind: "h", text: "ADR i zasady jazdy" },
        {
          kind: "list",
          items: [
            "Oznacz ADR na pozycji ładunku (klasa, numer UN i szczegóły), aby plakietka podążała za zleceniem i trasą.",
            "Planowanie pokazuje ciężarówki i wymagania ADR; niezgodność to konflikt.",
            "Utrzymuj prawo jazdy, orzeczenie medyczne, kartę tachografu i godziny na bieżąco — wygasłe lub brakujące dane są oznaczane.",
          ],
        },
        {
          kind: "tip",
          text: "Zapisuj rzeczywiste kraje trasy przez geokodowane postoje. Raporty zgodności są tak dobre, jak adresy i trasy za nimi.",
        },
        {
          kind: "warn",
          text: "Ten moduł raportuje to, co wie TMS. Nie zastępuje prawnej analizy tachografu ani odpowiedzialności menedżera transportu za zgodność.",
        },
      ],
    },
    portal: {
      title: "Portal klienta",
      summary: "Co widzą klienci po zalogowaniu i jak bezpiecznie dawać im dostęp.",
      blocks: [
        {
          kind: "p",
          text: "Portal klienta to osobny, głównie odczytowy obszar dla klientów: śledzą swoje zlecenia i trasy, pobierają faktury i dokumenty oraz kontaktują się z biurem. Nigdy nie widzą kosztów, marż ani innych klientów.",
        },
        {
          kind: "diagram",
          variant: "portal",
          title: "Widok klienta",
          callouts: [
            "Pulpit — aktywne zlecenia, faktury do zapłaty, saldo i ostatnia aktywność.",
            "Zlecenia — ich zlecenia, statusy i formularz nowego transportu.",
            "Trasy — aktywne trasy z postojami i śledzeniem.",
            "Faktury — PDF, dane płatności i dane bankowe.",
            "Wsparcie — telefon, e-mail i formularz wiadomości.",
          ],
        },
        { kind: "h", text: "Co może zrobić klient" },
        {
          kind: "list",
          items: [
            "Zalogować się na /portal/login e-mailem zaproszonym przez biuro.",
            "Poprosić o nowy transport; zapytanie staje się zleceniem/ofertą dla zespołu.",
            "Śledzić aktywne trasy i otworzyć stronę śledzenia.",
            "Pobrać faktury, zobaczyć saldo i dane bankowe do płatności.",
            "Skontaktować się z dyspozytornią ze strony wsparcia.",
          ],
        },
        {
          kind: "steps",
          items: [
            "Otwórz kartę klienta i włącz dostęp do portalu.",
            "Wyślij zaproszenie na e-mail kontaktowy.",
            "Klient ustawia hasło z linku i loguje się.",
            "Sprawdź, że klient widzi tylko własne zlecenia, trasy i faktury.",
          ],
        },
        {
          kind: "tip",
          text: "Używaj portalu zamiast wysyłania PDF-ów e-mailem: klient zawsze widzi bieżący status i te same dokumenty co biuro.",
        },
        {
          kind: "warn",
          text: "Konta portalu są na klienta i nigdy nie powinny być współdzielone między firmami. Jeśli osoba kontaktowa odchodzi, unieważnij dostęp i zaproś następcę.",
        },
      ],
    },
    "admin-users": {
      title: "Użytkownicy, role i uprawnienia",
      summary: "Twórz konta, wybierz szablon roli i zdecyduj dokładnie, jakie strony może otwierać każda osoba.",
      blocks: [
        {
          kind: "p",
          text: "Użytkownicy to moduł kontroli dostępu. Rola jest tylko szablonem startowym; pola stron są prawdziwym uprawnieniem, a pasek boczny i strażnik adresu URL przestrzegają obu.",
        },
        {
          kind: "table",
          head: ["Rola", "Zwykle potrzebuje"],
          rows: [
            ["Administrator", "Wszystko, w tym Użytkownicy i Ustawienia."],
            ["Manager", "Operacje, planowanie, flota, kierowcy, raporty i klienci."],
            ["Dyspozytor", "Pulpit, zlecenia, planowanie, trasy, mapa, czat i dokumenty."],
            ["Menedżer floty", "Flota, serwis, kierowcy, tachograf, tranzyt i raporty."],
            ["Księgowy", "Faktury, finanse, wydatki, raporty i klienci."],
            ["Specjalista ds. płac", "Płace, rozliczenia, kierowcy, wydatki i raporty."],
            ["Zgodność / obsługa klienta / sprzedaż", "Strony związane z pracą, bez finansów i administracji."],
            ["Kierowca", "Tylko aplikacja mobilna; bez modułów web."],
          ],
        },
        {
          kind: "steps",
          items: [
            "Wybierz Nowy użytkownik i wypełnij krok konta: imię, e-mail, hasło i język.",
            "Wybierz szablon roli najbliższy pracy.",
            "Dostosuj pola stron; sekcje wewnątrz modułu można przyznawać osobno.",
            "Ustaw konto jako aktywne lub nieaktywne.",
            "Zapisz i poproś osobę o zalogowanie; sprawdź, czy menu odpowiada przyznanym stronom.",
          ],
        },
        { kind: "h", text: "Akcje bezpieczeństwa" },
        {
          kind: "list",
          items: [
            "Zresetuj hasło bez znajomości starego; użytkownik może je później zmienić w Ustawienia → Mój profil.",
            "Dezaktywuj konto natychmiast, gdy ktoś odchodzi; dostęp kończy się przy następnym żądaniu.",
            "Wyloguj użytkownika ze wszystkich urządzeń, gdy zgubiono laptop lub telefon.",
            "Usuń konto tylko gdy żaden audyt go nie potrzebuje; dezaktywacja jest zwykle właściwym wyborem.",
          ],
        },
        {
          kind: "tip",
          text: "Daj najmniejszy zestaw stron, który pozwala wykonać pracę. Dyspozytor nie potrzebuje Użytkowników, Ustawień ani danych bankowych firmy.",
        },
        {
          kind: "warn",
          text: "Konta administratora mogą zmienić wszystko, w tym innych administratorów. Utrzymuj co najmniej dwóch aktywnych administratorów, aby firma nigdy nie została zablokowana.",
        },
      ],
    },
    settings: {
      title: "Ustawienia firmy, taryfy i połączenia",
      summary: "Dane, od których zależy każdy PDF, plan i faktura — ustaw je raz, starannie.",
      blocks: [
        {
          kind: "p",
          text: "Ustawienia to konfiguracja firmy. Większość zakładek jest dla administratorów; zakładka profilu jest dla każdego użytkownika. Zmiany wpływają natychmiast na dokumenty, także PDF-y generowane później.",
        },
        {
          kind: "table",
          head: ["Zakładka", "Co kontroluje"],
          rows: [
            ["Dane firmy i fakturowanie", "Nazwa prawna, NIP, KRS, kontakt, adres, bank, IBAN i logo."],
            ["Silnik taryf i kalkulator", "Stawki używane przez kalkulator ceny i oferty."],
            ["Mój profil i bezpieczeństwo", "Twoje imię, e-mail i hasło."],
            ["Połączenia i serwer", "Adresy API i WebSocket używane przez klienta."],
            ["Telematyka i integracje", "Te same połączenia zarządzane przez Hub telematyki."],
          ],
        },
        { kind: "h", text: "Dane firmy" },
        {
          kind: "list",
          items: [
            "Używaj nazwy prawnej, NIP-u i numeru KRS dokładnie tak, jak mają być na fakturach.",
            "Wgraj czytelne logo; pojawia się na PDF-ach i na pasku bocznym.",
            "Uzupełnij dane banku i IBAN — portal klienta pokazuje je do płatności.",
            "Godziny pracy i dane kontaktowe trafiają też na stronę publiczną i stronę wsparcia portalu.",
            "Zapis wymaga roli administratora.",
          ],
        },
        { kind: "h", text: "Taryfy i połączenia" },
        {
          kind: "list",
          items: [
            "Silnik taryf przechowuje stawki kalkulatora i odpowiedzi na oferty; utrzymuj spójne waluty i jednostki.",
            "Adresy API i WebSocket to ustawienia środowiska; zmieniaj je tylko z osobą odpowiedzialną za IT.",
            "Dane dostępowe telematyki należą do kreatora połączenia, nie do współdzielonej notatki w ustawieniach.",
          ],
        },
        {
          kind: "tip",
          text: "Przed pierwszą fakturą uzupełnij dane firmy, dane bankowe i logo. Późniejsza poprawka nie regeneruje już wystawionych PDF-ów.",
        },
        {
          kind: "warn",
          text: "Zmiana adresu API odłącza bieżące środowisko od backendu. Rób to tylko podczas planowanej migracji, nigdy jako próbę diagnostyczną.",
        },
      ],
    },
    troubleshooting: {
      title: "Gdy coś blokuje",
      summary: "Najczęstsze problemy, co naprawdę znaczą i najszybsze bezpieczne rozwiązanie.",
      blocks: [
        {
          kind: "table",
          head: ["Objaw", "Co sprawdzasz"],
          rows: [
            ["„Konto nieaktywne” przy logowaniu", "Administrator musi reaktywować konto lub zresetować hasło w Użytkownikach."],
            ["Brak modułu w menu", "Twoja rola/zestaw stron go nie zawiera; poproś administratora, nie twórz użytkownika ponownie."],
            ["Błąd sieci / pusta strona", "Połączenie, adres API w Ustawienia → Serwer i czy backend działa."],
            ["Nie znaleziono adresu", "Wpisz miasto i wybierz podpowiedź; adres bez współrzędnych nie może być trasowany."],
            ["Planowanie odmawia potwierdzenia", "Przeczytaj kod konfliktu: pominięte okno, nadwaga/palety, nakładanie ciężarówki/naczepy/kierowcy, brak sprzętu."],
            ["Sprzęt NIEZWERYFIKOWANY", "Uzupełnij wymiary wewnętrzne i typ zabudowy we Flocie."],
            ["Godziny kierowcy NIEZWERYFIKOWANE", "Brak zapisów tachografu w okresie; zapisz HOS lub podłącz telematykę. Nie czytaj tego jako czas wolny."],
            ["Brak pozycji na żywo dla ciężarówki", "Połączenie telematyki jest offline; ostatni znacznik czasu to nie bieżąca pozycja."],
            ["PDF faktury pokazuje złe dane", "Popraw Ustawienia → Dane firmy; stare PDF-y nie są przepisywane."],
            ["Brak powiadomień desktopowych", "Włącz je w menu dzwonka i zezwól przeglądarce."],
          ],
        },
        { kind: "h", text: "Kody konfliktów planowania" },
        {
          kind: "list",
          items: [
            "STOP_WINDOW_MISSED — przyjazd po oknie; zmień datę, podziel trasę lub renegocjuj okno.",
            "WEIGHT_OVERLOAD / PALLET_OVERLOAD — ładunek przekracza zapisaną pojemność ciężarówki + naczepy.",
            "TRUCK_OVERLAP / TRAILER_OVERLAP / DRIVER_OVERLAP — zasób jest już zajęty w tym przedziale.",
            "EQUIPMENT_MISSING / EQUIPMENT_UNVERIFIED — zlecenie wymaga sprzętu, którego pojazd nie potwierdza.",
            "ROUTE_UNVERIFIED / CARGO_DIMENSIONS_UNVERIFIED — trasa lub dane ładunku są niekompletne; system nie zgaduje.",
            "PROPOSAL_CHANGED — sprawdzona propozycja już nie pasuje; otwórz kreator ponownie i sprawdź.",
            "ASSIGNMENT_BLOCKED — istnieje twarda blokada, której nie można wymusić.",
          ],
        },
        {
          kind: "tip",
          text: "Jeśli komunikat mówi NIEZWERYFIKOWANE, właściwe rozwiązanie prawie zawsze leży w danych: uzupełnij pojazd, trasę lub zapisy kierowcy. Nigdy nie fałszuj wymiaru ani pozycji GPS, aby plan przeszedł.",
        },
        {
          kind: "warn",
          text: "Nie obchodź prawdziwej blokady odstępstwem ani ręczną edycją. Pominięte prawne okno lub przeciążona ciężarówka to realne ryzyko, nie niedogodność software'u.",
        },
      ],
    },
    glossary: {
      title: "Słownik i statusy",
      summary: "Język TMS, aby każdy kolega rozumiał to samo.",
      blocks: [
        {
          kind: "table",
          head: ["Pojęcie", "Znaczenie"],
          rows: [
            ["TMS", "Transport Management System — oprogramowanie, którego używasz."],
            ["Zlecenie", "Zapytanie handlowe: klient, trasa, ładunek, cena."],
            ["Trasa", "Wykonalny objazd: ciężarówka, naczepa, kierowca, uporządkowane postoje."],
            ["Postój", "Punkt załadunku lub dostawy w trasie, z oknem i ETA."],
            ["Tablica planowania", "Siatka ciężarówki × dni, w której przypisuje się zlecenia."],
            ["Wstawienie", "Najtańsza wykonalna pozycja pary załadunek/dostawa w istniejącej trasie."],
            ["Konsolidacja", "Dodanie zlecenia do istniejącej trasy zamiast tworzenia nowej."],
            ["ETA", "Szacowany czas przyjazdu, przeliczany z trasy i harmonogramu."],
            ["LDM", "Metry ładunkowe — długość podłogi zajmowana przez ładunek."],
            ["CMR / POD", "Międzynarodowy list przewozowy / dowód dostawy."],
            ["ADR", "Umowa europejska o przewozie towarów niebezpiecznych."],
            ["Kabotaż", "Załadunek i dostawa w kraju, w którym przewoźnik nie ma siedziby."],
            ["Tachograf", "Urządzenie rejestrujące jazdę, pracę, dostępność i odpoczynek."],
            ["Rozliczenie", "Miesięczne wyliczenie kierowcy lub podwykonawcy, oddzielne od płac."],
            ["Wiekowanie (aging)", "Należne faktury pogrupowane według dni opóźnienia."],
            ["Odstępstwo (override)", "Udokumentowana decyzja o akceptacji miękkiego ostrzeżenia; zapisywane są powód i użytkownik."],
            ["Werdykt", "Decyzja backendu o wykonalności: wykonalne, ostrzeżenie lub zablokowane."],
            ["NIEZWERYFIKOWANE", "Brakuje danych, więc system nie zgaduje — uzupełnij dane źródłowe."],
          ],
        },
        { kind: "h", text: "Statusy zlecenia" },
        {
          kind: "list",
          items: [
            "draft — w przygotowaniu, jeszcze niewidoczne dla planowania.",
            "new — kompletne, czeka na planowanie.",
            "planned / assigned — powiązane z trasą i ciężarówką.",
            "loading / in_transit — realizacja w toku.",
            "delivered — odbiorca przyjął towar.",
            "pod_received — podpisany dowód jest wgrany.",
            "ready_for_invoice / invoiced / paid — finansowy ogon zlecenia.",
            "cancelled — zlecenie nie będzie realizowane.",
          ],
        },
        { kind: "h", text: "Statusy trasy" },
        {
          kind: "list",
          items: [
            "PLANNING, ACCEPTED — utworzona i potwierdzona, nierozpoczęta.",
            "EN_ROUTE_TO_PICKUP, ARRIVED_AT_PICKUP, LOADING — sekwencja załadunku.",
            "EN_ROUTE_TO_DELIVERY, ARRIVED_AT_DELIVERY, UNLOADING — sekwencja dostawy.",
            "COMPLETED — zamknięta pomyślnie; DELAYED, EXCEPTION — wymaga uwagi.",
            "DELIVERY_REJECTED, PARTIALLY_REJECTED, DELIVERY_ACCEPTED_WITH_REMARKS — wyniki dostawy.",
            "CANCELLED — odwołana; jej zlecenia można zaplanować ponownie.",
          ],
        },
        {
          kind: "tip",
          text: "Gdy dwóch kolegów opisuje zadanie inaczej, najpierw sprawdź ten słownik. Jedno słowo, jedno znaczenie, mniej błędów.",
        },
        {
          kind: "warn",
          text: "Statusy nie są kosmetyczne. Raporty, portal i fakturowanie je czytają; przesunięcie trasy bez rzeczywistego zdarzenia psuje wszystkie dalsze liczby.",
        },
      ],
    },
  },
};
