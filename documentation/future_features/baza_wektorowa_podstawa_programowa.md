Gdybym to ja projektowała takie narzędzie w 2026 roku, dodałabym:

Integrację z Podstawą Programową: Automatyczne sprawdzanie, czy dany test realizuje wymagania ministerialne.

Generator "Grup A i B": Automatyczne mieszanie pytań i zadań parzystych/nieparzystych, żeby ukrócić ściąganie.

OCR (Skanowanie): Możliwość zrobienia zdjęcia odręcznym notatkom nauczyciela i zamiana ich w ładny PDF dla uczniów.



2. Obsługa LaTeX i Rysunków
Jeśli Twoja aplikacja ma wspierać matematyków czy chemików, czysty tekst nie wystarczy.

Wdrożenie renderowania LaTeX dla wzorów.

Możliwość generowania prostych schematów (np. obwód elektryczny czy układ współrzędnych) przez AI lub gotowe komponenty.



3. "Tryb Szybkiego Konspektu"
Nauczyciele rzadko potrzebują 5-stronicowego elaboratu. Częściej potrzebują "mapy drogowej" lekcji:

Cel lekcji (zgodny z podstawą programową),

3 kluczowe pojęcia,

"Zadanie na wejście" (5-minutowy rozgrzewacz),

Praca domowa.
Jeśli EduGen będzie miał gotowe "szablony" na te konkretne moduły, będzie niesamowicie użyteczny.



1. Moduł "Asystent Zgodności" w oknie Prototypu
Kiedy pojawia się okienko z prototypem, obok każdego pytania lub na dole całego materiału, dodałbym mały badge lub sekcję "Zgodność z PP".

Jak to działa technicznie: Podczas gdy AI generuje pytania z materiałów źródłowych, w tle (drugim wątkiem) wysyłasz zapytanie do bazy z Podstawą Programową.

Wynik: AI dopasowuje treść pytania do konkretnego numeru z rozporządzenia (np. "II.1.2. Uczeń rozpoznaje i nazywa części mowy").



2. Funkcja "Luki w materiale"
Skoro nauczyciel wrzuca pliki i wybiera klasę/poziom, EduGen może zrobić coś genialnego:

Analiza: AI sprawdza, co jest w plikach źródłowych nauczyciela.

Porównanie: Porównuje to z wymaganiami dla danej klasy.

Sugestia: W oknie prototypu AI wyświetla komunikat: "Hej, w Twoich materiałach brakuje zagadnienia X, które jest wymagane w klasie 6. Chcesz, żebym wygenerował o to jedno pytanie dodatkowe?".



3. "Raport dla Dyrekcji" przy eksporcie
To funkcja, za którą nauczyciele Cię pokochają. Przy generowaniu PDF/DOCX dodaj checkbox: "Dołącz metryczkę zgodności".

Aplikacja na końcu dokumentu generuje tabelę:
| Zadanie | Materiał źródłowy | Punkt Podstawy Programowej |
| :--- | :--- | :--- |
| Zad. 1 | PDF "Rozdział 3" | Klasa 7, IV.2.a |
| Zad. 2 | Notatka z zeszytu | Klasa 7, IV.3.b |




Jak to ugryźć od strony technicznej? (Moja rada)
Aby weryfikacja była precyzyjna, nie możesz polegać tylko na ogólnej wiedzy modelu (np. GPT-4o czy Gemini). One znają podstawę programową, ale mogą się mylić w numeracji.

Stwórz "Złote Źródło": Pobierz aktualne PDF-y z Ministerstwa Edukacji (MEN) i przemień je w czysty tekst/JSON.

Użyj "Embeddings": Zamień te punkty z podstawy na wektory.

Proces weryfikacji: Gdy AI generuje pytanie, system sprawdza, który "wektor" z oficjalnej podstawy jest najbliższy treści pytania. To daje niemal 100% pewności, że przypisany punkt jest poprawny.


Mój pomysł na "Killer Feature" dla EduGen:
Dodałbym przyciski szybkiej akcji w czacie prototypu:

[+ Utrudnij pod egzamin ósmoklasisty]

[+ Dostosuj dla ucznia z opinią o dysleksji] (automatyczna zmiana czcionki, uproszczenie poleceń).