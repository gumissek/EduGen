Aplikacja lokalna dla nauczycieli do tworzenia karta pracy / sprawdzianow / kartkowek / testow / treści na zajecia 
Tech stack:
Backend: Fastapi - python, uv manager paczek
Front: Next js - typescript, mui 
Build: Docker compose
Baza danych: SQqlite 

Specyfikacja frontendu:

Na frontendzie mamy obslugiwac:
- wybor trsci generowanej ( karta pracy / sprawdzian / kartkowka / testow / materiały na zajecia - ENUM )
- klasa ( szkoła podstawowa [1-8] , szkoła srednia [ 1-4] - ENUM)
- przedmiot ( do wyboru z listy, jeśli nie ma na liscie samemu można dodac - ENUM )
- jeśli wybranym przedmiotem jest jezyk to wybór poziomu jezyka od A1 do C2
- opcjonalnie pliki źrodłowe na których ma bazować do wygenerowania treśći ( tutaj można załączac pliki pdf, obrazki, docx) - maja być zapisywane do folderu wybranego przedmiotu i potem możliwe do wyboru ich z listy po nazwie  do kolejnych generacji

- jeśli tresc generowana to ( sprawdzain / kartkowka / test ):
	- temat 
	- zalecenia ( text field )
	- ilość pytan łączna
	- ilość pytan zamkniętych ( a/b/c/d)
	- ilość pytan otwartych 
	- poziom trudności do wyboru ( łatwy, sredni , trudny , bardzo trudny ) 
	- ilość wariantów do wyboru np. dwie grupy A i B z innymi pytaniami ( tutaj chodzi o ilość grup które będą np. na teście / sprawdzanie ) 
	- wszystkie warianty generuja sie do jednego pliku 
	- opcje do wybrania plików zrodłowych z listy które maja służyc do bazowania na nich przy generowaniu  ( opcjonalne - nullable )
	- opcja dodania kolejnych plików zrodłowch ( opcjonalne - nullable )
- Jeśli tresc generowana to ( karta pracy / materiały na zajecia):
	- temat 
	- zalecenia ( text field )
	- opcje do wybrania plików zrodłowych z listy które maja służyc do bazowania na nich przy generowaniu ( opcjonalne - nullable )
	- opcja dodania kolejnych plików zrodłowch ( opcjonalne - nullable )

- Wysyąłmy zapytanie do backendu, backend obiera pliki i całe żadanie, odczytuje załączone pliki pdf, docx, obrazki i wysyła prompta do openai aby na podstawie danych przesłanych wygenerował taki prototyp jak może wygladac cos takiego i to jest zwracane na front. 
- *1 Na frontendzie weryfikujemy to dodajemy swoje uwagi ( tutaj osobne pole) , zmieniamy to co chcemy i tutaj dwie opcje do wyboru albo generuj finalne treści (idziemy do *2) albo wdróż poprawki ( idziemy do *1)
- *2 Generowanie finalnej tresci - Bierzemy poprawione dane i tworzymy n grup według zaleceń i tworzomy docx z treścia i zwracamy na front-Tutaj mamy poglad wygenerowanych plików - tylko Docx ( tyle ile było wariantów ) opcje zapisywania do folderu ( po nazwie Przedmiot/Rodzaj_tresci/<data_dzisiejsza>/<własna_nazwa> ) i możliwości ich pobrania natychmiast
- Opcja do przegladania stwrzonych treści w folderach, pobierania ich ( single / bulk ), dodawania własnych plików do folderu , i usuwania ich. 
- Opcje przeglądania plików źródłowych po nazwie przedmiotu i opcje dodawania ich i usuwania w folderze, aby mogły zasilać
- Switch dark/light mode
- 

Backend:
- wszystkie endpointy do obsługi frontendu
- healthckech 
- endpoint do spradzenia czy klucz openai jest ustawiony w .env zwraca bool 
- generowanie docx 
- przyjmowanie plików img ( z nich ekstrakcja danych poprzez strzał do openai co sie na nim znajduje ) , pliki docx/pdf ( odczytywanie zwartosci )
- oblusga bazy danych ( tam maja sie znadować wszystkie pliki źrodłowe w jednej tabeli ze wszystkimi metadaymi, oraz pliki wygenerowane z metadanymi do osobnej tabeli, logger requestow do openai z requestem a potem z responsem )

