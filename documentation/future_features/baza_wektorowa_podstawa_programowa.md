

Integrację z Podstawą Programową: Automatyczne sprawdzanie, czy dany test realizuje wymagania ministerialne.


2. Obsługa LaTeX i Rysunków
Jeśli Twoja aplikacja ma wspierać matematyków czy chemików, czysty tekst nie wystarczy.

Wdrożenie renderowania LaTeX dla wzorów.

Możliwość generowania prostych schematów (np. obwód elektryczny czy układ współrzędnych) przez AI lub gotowe komponenty.



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

``` przemyślenia

strona /state-documents/pp gdzie każdy użytkownik może wejść i sprawdzić na jakich danych bazuje system i pobrać te plki (bedzie wyswietlone to jako lista) , a administrator będzie miał możliwość aktualizacji tych danych na /admin-panel (np. po zmianie podstawy programowej). Administrator bedzie mogł wgrać nowy PDF, ktory zostanie przesłany do folderu na backendzie oraz dodany do nowej tabeli w bazie danych z informacja kiedy zostal wgrany i innnymi metdanymi. Nastepnie zostanie zainicjalizowana procedura ekstrakcji danych z tego PDF-a , ustandaryzowanie tych danych zeby miały jasno okreslony format ( tutaj uzyjemy biblietki markdrop https://pypi.org/project/markdrop/ (bardzo dobre do AI / RAG)

Jedna z ciekawszych bibliotek.

Cechy:

zachowuje nagłówki (#, ##, ###)

wykrywa tabele

wyciąga obrazy

może generować opisy tabel/obrazów przez LLM

Instalacja:

pip install markdrop

Przykład:

from markdrop import markdrop

markdrop("input.pdf", "output_dir")

Obsługuje:

markdown

html

tabele

obrazy). Taki plik z pdf zostanie przerobiony na markdown, zapisany do rownoległego folderu w formacie `.md` . Następnie ten zostanie podzielony textsplitterem (https://pypi.org/project/langchain-text-splitters/ pip install langchain-text-splitters docs:) na mniejsze (chunki) fragmenty zachwujac ważne informacje o nagłowkach róznego poziomu zagłebienia, rozdziałach ,tabelach i innych ważnych danych gdzie dany fragment tekstu występuje. Następnie każdy chunk zostanie przetworzony przez model embeddingowy openai/text-embedding-3-large poprzez openrouter. Ten wektor zostanie zapisany do nowej tabeli w bazie danych postgres ktora zaktualizujemy o dodatek pgvector (https://www.pgvectors.org/), gdzie bedziemy przechowywac wektory. tutaj musimy rozwazyc mechanizm cacheowania tych wektorow, zeby nie generowac ich od nowa przy kazdym uruchomieniu backednu (mam pomysl nad to ze z tekstu bedzie robiony hash i bedziemy sprawdzac czy taki hash juz istnieje w bazie danych, jesli tak to nie bedziemy generowac nowego wektora tylko uzyjemy tego z bazy danych). Następnie majac wektor dla i metadane chunka (jak nagłowek, rozdział, tabela, strona z której pochodzi) bedziemy dodawac do to nowej tabeli. Następnie dodamy mechanzim RAG ( Retrieval Augmented Generation) do procesu. Z każdego pytania bedziemy generowac wektor i sprawdzac w bazie danych który wektor z podstawy programowej jest najblizej tego pytania (np. poprzez cosine similarity) i wyciagac z bazy danych metadane tego chunka (np. nagłowek, rozdział, tabela, strona z której pochodzi) i dodawac te informacje do promptu dla AI. W ten sposób AI bedzie mialo dostep do oficjalnych danych z podstawy programowej i bedzie moglo generowac pytania zgodne z tymi danymi oraz bedziemy mieli pewnosc ze przypisany punkt z podstawy programowej jest poprawny.


Na frontendzie dodamy strone gdzie beda przechywyane te dokumenty strona /state-documents/pp gdzie kazdy użytkownik może wejsc i sprawdzic na jakich danych bazuje system, a administrator będzie miał możliwość aktualizacji tych danych (np. po zmianie podstawy programowej). 





Proces weryfikacji: Gdy AI generuje pytanie, system sprawdza, który "wektor" z oficjalnej podstawy jest najbliższy treści pytania. To daje niemal 100% pewności, że przypisany punkt jest poprawny.
```

Mój pomysł na "Killer Feature" dla EduGen:
Dodałbym przyciski szybkiej akcji w czacie prototypu:

[+ Utrudnij pod egzamin ósmoklasisty]

[+ Dostosuj dla ucznia z opinią o dysleksji] (automatyczna zmiana czcionki, uproszczenie poleceń).