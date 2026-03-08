<conversation_summary>
<decisions>

Infrastruktura i uruchamianie: Aplikacja będzie uruchamiana lokalnie za pomocą skryptów .bat (Windows) / .sh (Mac/Linux), które podniosą kontenery Docker Compose. Wdrożono również skrypty do automatycznej aktualizacji z repozytorium GitHub.

Zarządzanie kluczem API i modelem: Klucz API OpenAI będzie wprowadzany przez UI (zakładka Ustawienia) i przechowywany bezpiecznie w bazie SQLite/pamięci. Użytkownik będzie miał możliwość wyboru modelu (np. domyślnie tańszy gpt-5-mini).

Obsługa plików źródłowych: Limit wielkości plików to 10MB. Pliki tekstowe (PDF, DOCX) będą odczytywane przez pypdf i python-docx. Pliki graficzne (IMG) trafiają do modelu Vision. Dla plików PDF wyświetlany będzie tooltip o odczytywaniu tylko tekstu. Pliki przechowujemy w wolumenie Dockerowym (dostęp tylko przez UI).

Zaawansowana obsługa PDF (Skany): Jeśli pypdf nie wykryje tekstu w PDF, backend użyje biblioteki (np. pdf2image) do konwersji na obrazy i wyśle do OpenAI Vision. Wprowadzono miękki limit powyżej 5 stron – system poprosi o wskazanie konkretnego zakresu stron.

*Edytor i proces poprawy (1): Zintegrowany lekki edytor WYSIWYG operujący na HTML/Markdown, ograniczony tylko do funkcji wspieranych przez DOCX (z czyszczeniem wklejanego kodu HTML). Poprawki nanoszone są na jeden główny "master dokument". Dodano przycisk "Przywróć oryginał". Klucz odpowiedzi jest widoczny na dole edytora.

Generowanie i asynchroniczność: Generowanie działa w tle (BackgroundTasks z aiosqlite), z globalnym powiadomieniem w Next.js i wskaźnikami ładowania. W przypadku awarii podczas generowania, proces należy powtórzyć ręcznie. Formularz konfiguracyjny jest zapisywany w localStorage.

*Formatowanie docelowe (2): Szablony DOCX oparte o docxtpl (jeden uniwersalny szablon MVP). Wszystkie warianty (grupy) w jednym pliku DOCX rozdzielone znakiem podziału strony, z kluczem odpowiedzi na samym końcu. Pytania i odpowiedzi w wariantach są automatycznie mieszane. Wzory matematyczne wymuszone w formacie liniowym/Unicode (brak LaTeX).

Zarządzanie danymi: Paginacja i wyszukiwarka dla plików. Automatyczne, jednozdaniowe podsumowania dodawanych plików. Miękkie usuwanie plików (referencja NULL) oraz przedmiotów z ustawień.

Bezpieczeństwo: Aplikacja chroniona jednym stałym hasłem. Dostępny skrypt .bat do resetu hasła. Wylogowanie po 15 minutach bezczynności.

Kopie zapasowe i diagnostyka: Możliwość ręcznego pobrania/przywrócenia backupu (.zip), automatyczne codzienne backupy bazy SQLite (z 7-dniową historią) oraz opcja pobrania logów diagnostycznych.

</decisions>

<matched_recommendations>

Wykorzystanie edytora WYSIWYG z paskiem narzędzi ograniczonym do funkcji natywnie mapujących się na DOCX, aby zminimalizować błędy formatowania.

Zastosowanie biblioteki docxtpl na backendzie do wstrzykiwania wygenerowanych treści w przygotowany, uniwersalny szablon .docx.

Zastosowanie mechanizmu przesuwanego okna (sliding window) w celu zarządzania historią konwersacji i unikania przekroczenia limitu tokenów.

Przeniesienie zapytań do OpenAI i generowania dokumentów do asynchronicznych zadań w tle (BackgroundTasks) połączonych z globalnym systemem powiadomień na frontendzie (Next.js).

Zastąpienie parametru temperature dedykowanym polem wyboru (Enum), które wstrzykuje precyzyjne instrukcje systemowe dotyczące trzymania się źródeł lub kreatywności.

Rozdzielenie promptów systemowych dla "Kart pracy" (dla ucznia) i "Materiałów na zajęcia" (sztywna struktura dla nauczyciela: cele, rozgrzewka, podsumowanie).

Zaimplementowanie exponential backoff w przypadku błędów limitu zapytań (Rate Limits) API OpenAI.
</matched_recommendations>

<prd_planning_summary>
a. Główne wymagania funkcjonalne produktu (MVP):
Produkt to lokalna aplikacja webowa dla nauczycieli, uruchamiana przez Docker Compose, służąca do generowania materiałów edukacyjnych (sprawdziany, kartkówki, karty pracy, materiały do zajęć). System wspiera parametryzację (klasa, przedmiot, poziom językowy) i pozwala na bazowanie na własnych plikach (PDF, DOCX, IMG). Backend w FastAPI asynchronicznie komunikuje się z API OpenAI (w tym Vision dla skanów). Użytkownik edytuje wygenerowany prototyp w edytorze WYSIWYG, a następnie generuje finalny plik DOCX zawierający wybraną liczbę wariantów (grup) oraz klucz odpowiedzi. Aplikacja posiada wbudowane zarządzanie plikami, autoryzację hasłem oraz system lokalnych kopii zapasowych.

b. Kluczowe historie użytkownika i ścieżki korzystania:

Jako nauczyciel chcę przesłać zdjęcia lub skany z podręcznika, aby system automatycznie odczytał z nich treść i wygenerował na ich podstawie test.

Jako nauczyciel chcę wygenerować test z matematyki, zachowując proste formatowanie wzorów, aby ostateczny plik DOCX otworzył się poprawnie na każdym komputerze.

Jako nauczyciel chcę wygenerować 3 warianty (grupy) tego samego sprawdzianu, aby uczniowie nie mogli od siebie ściągać (zmieniona kolejność pytań i odpowiedzi).

Jako nauczyciel chcę przejrzeć i edytować pytania w łatwym w obsłudze edytorze przed utworzeniem finalnego pliku do druku, a w razie błędów przywrócić wersję wygenerowaną przez AI.

Jako nauczyciel chcę pracować w sposób ciągły, nie martwiąc się o utratę wpisanych danych w formularzu (zapis w localStorage) i bez blokowania interfejsu podczas ładowania (zadania w tle).

c. Ważne kryteria sukcesu i sposoby ich mierzenia:

Główną metryką jakości działania AI będzie ukryty wskaźnik zliczający ilość iteracji (pętla *1) koniecznych do zaakceptowania prototypu przez nauczyciela przed przejściem do generowania finalnego pliku (*2). Im niższa średnia liczba poprawek, tym lepsze dopasowanie promptów.

Stabilność mierzona brakiem błędów krytycznych wymuszających ręczne użycie skryptów aktualizacyjnych lub ratunkowych (reset hasła).

d. Wszelkie nierozwiązane kwestie lub obszary wymagające dalszego wyjaśnienia:

Aktualnie ustalono, że po awarii backendu w trakcie generowania użytkownik musi ponowić proces od nowa. Ze względu na potencjalnie długi czas generowania zadań (często płatnych w API), brak automatycznego wznawiania (resume) może prowadzić do frustracji i start strat finansowych.

Dostęp przez sieć LAN z innych urządzeń (np. telefonu) został na razie celowo wstrzymany ("pomijamy"), co ogranicza korzystanie z aplikacji tylko do urządzenia, na którym zainstalowano Dockera. Należy monitorować, czy użytkownicy nie zgłoszą tego jako istotnego braku.
</prd_planning_summary>

<unresolved_issues>

Zarządzanie awariami zadań asynchronicznych: Brak mechanizmu wznawiania przerwanych procesów generowania. Wymóg rozpoczynania od nowa po awarii kontenera może generować dodatkowe koszty API i frustrację, zwłaszcza przy długich dokumentach.

Dostępność sieciowa: Świadomie zrezygnowano z udostępniania aplikacji wewnątrz sieci LAN (port 0.0.0.0), ograniczając system do architektury strictly-localhost. Wymaga weryfikacji po MVP.

Czyszczenie dysku z plików docelowych: Choć ustalono miękkie usuwanie, nie potwierdzono ostatecznie modułu do masowego "twardego" usuwania starych plików generowanych, co w przyszłości może prowadzić do nadmiernego rozrostu wolumenu Dockerowego.
</unresolved_issues>
</conversation_summary>