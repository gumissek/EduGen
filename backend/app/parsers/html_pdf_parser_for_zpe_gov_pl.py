import re
from typing import Optional, List
from datetime import datetime
import json
import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel



#####
# Uniwersalny parser HTML z zachowaniem hierarchii (kategorie, podkategorie, rozdziały, tematy, punkty, podpunkty)
#####

# 1. Metadane dla całego dokumentu
class MetadaneDokumentu(BaseModel):
    przedmiot: str
    poziom_edukacji: str
    rok_podstawy_programowej: str = "2025/2026"
    zrodlo: str = "zpe.gov.pl"
    data_wygenerowania: str
    url_zrodlowy: str  # Dodajemy pole z linkiem dla zachowania historii


# 2. Główna struktura dla każdego wycinka (chunka)
class Wymaganie(BaseModel):
    kategoria: str
    subkategoria: Optional[str] = None
    rozdzial: Optional[str] = None
    temat: Optional[str] = None
    punkt: Optional[str] = None
    podpunkt: Optional[str] = None
    akapit: str
    strona: int
    metadane: MetadaneDokumentu


class PodstawaProgramowa(BaseModel):
    dokument: List[Wymaganie]


# --- Uniwersalne wyrażenia regularne ---
re_cele = re.compile(r"^Cele kształcenia.*wymagania ogólne", re.IGNORECASE)
re_tresci = re.compile(r"^Treści nauczania.*wymagania szczegółowe", re.IGNORECASE)
re_warunki = re.compile(r"^Warunki i sposób realizacji", re.IGNORECASE)

re_subkategoria = re.compile(r"^(Zakres\s+.*|Klas[ya]\s+[IVX\-i\s]+|Podstawa\s+programowa.*|Etap\s+edukacyjny.*)",
                             re.IGNORECASE)

re_roman = re.compile(r"^([IVX]+)\.\s+(.*)$")
re_num_dot = re.compile(r"^(\d+)\.\s+(.*)$")
re_num_bracket = re.compile(r"^(\d+)\)\s+(.*)$")
re_letter = re.compile(r"^([a-z])\)\s+(.*)$")


def parsuj_html_zpe_z_urla(url: str, przedmiot: str, poziom_edukacji: str,
                           sciezka_wyjsciowa_json: Optional[str] = None) -> PodstawaProgramowa:
    print(f"Pobieranie i parsowanie HTML z adresu: {url}...")

    # Pobieranie strony
    try:
        response = requests.get(url)
        response.raise_for_status()  # Rzuca błąd, jeśli status HTTP to np. 404 lub 500
        html_content = response.text
    except requests.RequestException as e:
        print(f"Błąd podczas pobierania strony: {e}")
        return PodstawaProgramowa(dokument=[])

    aktualna_data = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    stale_metadane = MetadaneDokumentu(
        przedmiot=przedmiot,
        poziom_edukacji=poziom_edukacji,
        data_wygenerowania=aktualna_data,
        url_zrodlowy=url
    )

    # Inicjalizacja BeautifulSoup pobranym tekstem
    soup = BeautifulSoup(html_content, 'html.parser')
    structured_data: List[Wymaganie] = []

    # Szukamy głównego kontenera
    container = soup.find('div', id='cc-container')
    if not container:
        print("Błąd: Nie znaleziono głównego kontenera 'cc-container' na podanej stronie.")
        return PodstawaProgramowa(dokument=[])

    def parse_children(parent_node, current_state):
        children = parent_node.find_all('div', recursive=False)
        i = 0

        while i < len(children):
            child = children[i]
            classes = child.get('class', [])

            # KROK 1: Nagłówki sekcji
            if 'cc2_group-header' in classes:
                text_el = child.find(class_='cc2_title') or child
                header_text = text_el.get_text(separator=" ", strip=True)

                next_state = current_state.copy()

                if re.search(r"^Wstęp", header_text, re.IGNORECASE):
                    next_state['kategoria'] = "Wstęp"
                    next_state['subkategoria'] = next_state['rozdzial'] = next_state['temat'] = next_state['punkt'] = \
                        next_state['podpunkt'] = None
                elif re_cele.match(header_text):
                    next_state['kategoria'] = "Cele kształcenia – wymagania ogólne"
                    next_state['subkategoria'] = next_state['rozdzial'] = next_state['temat'] = next_state['punkt'] = \
                        next_state['podpunkt'] = None
                elif re_tresci.match(header_text):
                    next_state['kategoria'] = "Treści nauczania – wymagania szczegółowe"
                    next_state['subkategoria'] = next_state['rozdzial'] = next_state['temat'] = next_state['punkt'] = \
                        next_state['podpunkt'] = None
                elif re_warunki.match(header_text):
                    next_state['kategoria'] = "Warunki i sposób realizacji"
                    next_state['subkategoria'] = next_state['rozdzial'] = next_state['temat'] = next_state['punkt'] = \
                        next_state['podpunkt'] = None
                elif re_subkategoria.match(header_text):
                    next_state['subkategoria'] = header_text
                    next_state['rozdzial'] = next_state['temat'] = next_state['punkt'] = next_state['podpunkt'] = None
                else:
                    m_roman = re_roman.match(header_text)
                    m_dot = re_num_dot.match(header_text)

                    if m_roman:
                        next_state['rozdzial'] = header_text
                        next_state['temat'] = next_state['punkt'] = next_state['podpunkt'] = None
                    elif m_dot:
                        next_state['temat'] = header_text
                        next_state['punkt'] = next_state['podpunkt'] = None
                    else:
                        next_state['temat'] = header_text
                        next_state['punkt'] = next_state['podpunkt'] = None

                if i + 1 < len(children) and 'cc2_group-content' in children[i + 1].get('class', []):
                    content_child = children[i + 1]
                    parse_children(content_child, next_state)
                    i += 2
                else:
                    i += 1

            # KROK 2: Liście z tekstami
            elif 'cc2_node' in classes:
                node_text = child.get_text(separator=" ", strip=True)
                node_state = current_state.copy()
                akapit_text = node_text

                m_bracket = re_num_bracket.match(node_text)
                m_letter = re_letter.match(node_text)
                m_dot = re_num_dot.match(node_text)

                if m_bracket:
                    node_state['punkt'] = m_bracket.group(0)
                    akapit_text = m_bracket.group(2)
                elif m_letter:
                    node_state['podpunkt'] = m_letter.group(0)
                    akapit_text = m_letter.group(2)
                elif m_dot:
                    node_state['temat'] = m_dot.group(0)
                    akapit_text = m_dot.group(2)

                wymaganie = Wymaganie(
                    kategoria=node_state.get('kategoria', 'Brak kategorii'),
                    subkategoria=node_state.get('subkategoria'),
                    rozdzial=node_state.get('rozdzial'),
                    temat=node_state.get('temat'),
                    punkt=node_state.get('punkt'),
                    podpunkt=node_state.get('podpunkt'),
                    akapit=akapit_text,
                    strona=1,
                    metadane=stale_metadane
                )
                structured_data.append(wymaganie)
                i += 1

            else:
                i += 1

    # Uruchamiamy parsowanie
    initial_state = {
        'kategoria': 'Wstęp',
        'subkategoria': None,
        'rozdzial': None,
        'temat': None,
        'punkt': None,
        'podpunkt': None
    }

    parse_children(container, initial_state)

    podstawa = PodstawaProgramowa(dokument=structured_data)

    if sciezka_wyjsciowa_json:
        with open(sciezka_wyjsciowa_json, "w", encoding="utf-8") as f:
            json.dump(podstawa.model_dump(), f, ensure_ascii=False, indent=2)
        print(f"Zapisano strukturę ({len(structured_data)} wpisów) do pliku: {sciezka_wyjsciowa_json}")

    return podstawa


url_do_podstawy = "https://zpe.gov.pl/podstawa-programowa/branzowa-szkola-ii-stopnia/wychowanie-fizyczne"

wynik = parsuj_html_zpe_z_urla(
    url=url_do_podstawy,
    przedmiot="Język polski",
    poziom_edukacji="Szkoła podstawowa",
    sciezka_wyjsciowa_json="polski_z_url.json"
)

######
# Uniwersalny parser PDF (niezależnie od układu, ale bez zachowania hierarchii)
######


import re
import json
import pdfplumber
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List


# 1. Metadane dla całego dokumentu
class MetadaneDokumentu(BaseModel):
    przedmiot: str
    poziom_edukacji: str
    rok_podstawy_programowej: str = "2025/2026"
    zrodlo: str = "zpe.gov.pl"
    pdf_zrodlowy: str
    data_wygenerowania: str


# 2. Główna struktura dla każdego wycinka (chunka)
class Wymaganie(BaseModel):
    kategoria: str  # np. Wstęp, Cele, Treści, Warunki
    subkategoria: Optional[str] = None  # np. Klasa IV, Zakres podstawowy (jeśli występuje)
    rozdzial: Optional[str] = None  # np. I. Rozwój fizyczny...
    temat: Optional[str] = None  # np. 1. W zakresie wiedzy...
    punkt: Optional[str] = None  # np. 1) omawia sposoby...
    podpunkt: Optional[str] = None  # np. a) dba o...
    akapit: str  # Główny tekst
    strona: int
    metadane: MetadaneDokumentu


class PodstawaProgramowa(BaseModel):
    dokument: List[Wymaganie]


# --- Uniwersalne wyrażenia regularne ---
re_cele = re.compile(r"^Cele kształcenia.*wymagania ogólne", re.IGNORECASE)
re_tresci = re.compile(r"^Treści nauczania.*wymagania szczegółowe", re.IGNORECASE)
re_warunki = re.compile(r"^Warunki i sposób realizacji", re.IGNORECASE)

# Wyłapuje opcjonalne podziały (niezależnie czy to liceum, zawodówka czy podstawówka)
re_subkategoria = re.compile(
    r"^(Zakres\s+.*|Klas[ya]\s+[IVX\-]+|Podstawa\s+programowa\s*-\s*wariant.*|Etap\s+edukacyjny.*)", re.IGNORECASE)

# Hierarchia wypunktowań
re_roman = re.compile(r"^([IVX]+)\.\s+(.*)$")  # I. Tekst
re_num_dot = re.compile(r"^(\d+)\.\s+(.*)$")  # 1. Tekst
re_num_bracket = re.compile(r"^(\d+)\)\s+(.*)$")  # 1) Tekst
re_letter = re.compile(r"^([a-z])\)\s+(.*)$")  # a) Tekst


def parsuj_dowolna_podstawe(sciezka_do_pdf: str, przedmiot: str, poziom_edukacji: str,
                            sciezka_wyjsciowa_json: Optional[str] = None) -> PodstawaProgramowa:
    print(f"Parsowanie uniwersalne: {przedmiot} ({poziom_edukacji})...")

    aktualna_data = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    stale_metadane = MetadaneDokumentu(
        przedmiot=przedmiot,
        poziom_edukacji=poziom_edukacji,
        data_wygenerowania=aktualna_data,
        pdf_zrodlowy=sciezka_do_pdf
    )

    current_kategoria = "Wstęp"
    current_subkategoria = None
    current_rozdzial = None
    current_temat = None
    current_punkt = None
    current_podpunkt = None

    structured_data: List[Wymaganie] = []

    with pdfplumber.open(sciezka_do_pdf) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            lines = [l.strip() for l in text.split("\n") if l.strip()]

            for line in lines:
                # 1. Filtrowanie śmieci i stopek
                if "zpe.gov.pl" in line or re.match(r"^\d{2}\.\d{2}\.\d{4}", line) or re.match(r"^\d+/\d+$", line):
                    continue
                # Filtrowanie nagłówka przypominającego nazwę przedmiotu na każdej stronie
                if re.match(fr"^{przedmiot}\s*-", line, re.IGNORECASE):
                    continue

                line = line.replace("\uf374", "").strip()
                if not line or re.match(r"^[IVX]+\.$", line):
                    continue

                # 2. Wykrywanie głównych sekcji dokumentu
                if re_cele.match(line):
                    current_kategoria = "Cele kształcenia - wymagania ogólne"
                    current_subkategoria, current_rozdzial, current_temat, current_punkt, current_podpunkt = None, None, None, None, None
                    continue
                if re_tresci.match(line):
                    current_kategoria = "Treści nauczania - wymagania szczegółowe"
                    current_subkategoria, current_rozdzial, current_temat, current_punkt, current_podpunkt = None, None, None, None, None
                    continue
                if re_warunki.match(line):
                    current_kategoria = "Warunki i sposób realizacji"
                    current_subkategoria, current_rozdzial, current_temat, current_punkt, current_podpunkt = None, None, None, None, None
                    continue

                if re_subkategoria.match(line):
                    current_subkategoria = line
                    current_rozdzial, current_temat, current_punkt, current_podpunkt = None, None, None, None
                    continue

                # 3. Analiza hierarchii w danej linii
                is_new_node = False
                text_content = ""

                m_roman = re_roman.match(line)
                m_dot = re_num_dot.match(line)
                m_bracket = re_num_bracket.match(line)
                m_letter = re_letter.match(line)

                if m_roman:
                    current_rozdzial = m_roman.group(0)
                    current_temat, current_punkt, current_podpunkt = None, None, None
                    is_new_node = True
                    text_content = m_roman.group(2)
                elif m_dot:
                    current_temat = m_dot.group(0)
                    current_punkt, current_podpunkt = None, None
                    is_new_node = True
                    text_content = m_dot.group(2)
                elif m_bracket:
                    current_punkt = m_bracket.group(0)
                    current_podpunkt = None
                    is_new_node = True
                    text_content = m_bracket.group(2)
                elif m_letter:
                    current_podpunkt = m_letter.group(0)
                    is_new_node = True
                    text_content = m_letter.group(2)

                # 4. Tworzenie obiektu lub doklejanie tekstu
                if is_new_node:
                    node = Wymaganie(
                        kategoria=current_kategoria,
                        subkategoria=current_subkategoria,
                        rozdzial=current_rozdzial,
                        temat=current_temat,
                        punkt=current_punkt,
                        podpunkt=current_podpunkt,
                        akapit=text_content,
                        strona=page_num,
                        metadane=stale_metadane
                    )
                    structured_data.append(node)
                else:
                    # Linia to zwykły tekst (np. akapit z warunków realizacji)
                    if not structured_data or structured_data[-1].kategoria != current_kategoria:
                        # Jesteśmy w nowej sekcji, ale nie było jeszcze punktora
                        node = Wymaganie(
                            kategoria=current_kategoria,
                            subkategoria=current_subkategoria,
                            akapit=line,
                            strona=page_num,
                            metadane=stale_metadane
                        )
                        structured_data.append(node)
                    else:
                        # Doklejamy do ostatniego istniejącego punktu
                        structured_data[-1].akapit += f" {line}"

    podstawa = PodstawaProgramowa(dokument=structured_data)

    if sciezka_wyjsciowa_json:
        with open(sciezka_wyjsciowa_json, "w", encoding="utf-8") as f:
            json.dump(podstawa.model_dump(), f, ensure_ascii=False, indent=2)
        print(f"Zapisano uniwersalnie ({len(structured_data)} elementów): {sciezka_wyjsciowa_json}")

    return podstawa


result = parsuj_dowolna_podstawe(
    sciezka_do_pdf="historia.pdf",
    przedmiot="historia",
    poziom_edukacji="Liceum",
    sciezka_wyjsciowa_json="historia.json"
)
