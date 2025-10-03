import os
import sqlite3
import traceback
from typing import Dict, List, Any, Optional
from flask import Flask, jsonify, request, current_app, send_from_directory
import json 
import logging 
import subprocess # För att starta Edge
import asyncio
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
from pathlib import Path # Troligen redan där
from datetime import datetime # För datumvalidering och tidsstämplar
import socket # För att kolla om CDP-porten är öppen

NORDEA_AUTO_LAUNCH_EDGE = True # Eller False om du vill starta manuellt
NORDEA_EDGE_PATH_WINDOWS = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
NORDEA_CDP_ENDPOINT = "http://localhost:9222"
NORDEA_LOGIN_URL = "https://netbank.nordea.se/login/"
NORDEA_TARGET_URL_SUBSTRING = "netbank.nordea.se"
NORDEA_SWITCH_AGREEMENT_TEXT = "Byt avtal"
NORDEA_DATE_FILTER_BUTTON_TEXT = "Datum"
NORDEA_PDF_BUTTON_TEXT = "PDF"
NORDEA_CSV_BUTTON_TEXT = "CSV"
NORDEA_DOWNLOADS_PATH = Path(r"C:\Users\lars-\Downloads") # Exempel, anpassa!
NORDEA_SCREENSHOTS_DIR = Path("nordea_screenshots") # Egen mapp för skärmdumpar
NORDEA_AUTO_LAUNCH_EDGE = True 
NORDEA_EDGE_PATH_WINDOWS = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
# Konfigurera logger direkt i modulen
logger = logging.getLogger(__name__) 
logger.setLevel(logging.DEBUG) 
handler = logging.StreamHandler() 
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.debug("--- app.py startar ---")

# ----------------------------------------------------------------------------
# Grund‑inställningar
# ----------------------------------------------------------------------------
app = Flask(
    __name__,
    static_folder=os.path.abspath(os.path.dirname(__file__)),
    static_url_path=""
)
logger.debug("--- Flask-app instanserad ---")

DATABASE_FILE = "huvudman_data.sqlite"
HTML_FILE = "index.html"

logger.debug("--- Globala variabler satta ---")

def ensure_nordea_screenshots_dir() -> Path:
    NORDEA_SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    return NORDEA_SCREENSHOTS_DIR
    
    
# ----------------------------------------------------------------------------
# Databas Hjälpfunktioner
# ----------------------------------------------------------------------------
logger.debug("--- Definierar databas hjälpfunktioner ---")

def get_db_connection() -> sqlite3.Connection:
    logger.debug("--- get_db_connection anropad ---") 
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def _get_table_columns(conn: sqlite3.Connection, table_name: str) -> List[str]:
    logger.debug(f"--- _get_table_columns STARTAR för tabell: '{table_name}' ---")
    try:
        cur = conn.execute(f"PRAGMA table_info(\"{table_name}\")") # Tabellnamn inom citationstecken
        columns_info = cur.fetchall()
        logger.debug(f"PRAGMA table_info för '{table_name}' rådata: {columns_info}")
        
        columns = []
        for row_info in columns_info:
            column_name = str(row_info[1]) # Kolumnnamnet är på index 1
            # Ta bort eventuella inledande/avslutande citationstecken eller apostrofer
            column_name = column_name.strip("\"'") # Tar bort både " och ' från början och slut
            columns.append(column_name)
            
        if not columns:
            logger.warning(f"Inga kolumner identifierades för '{table_name}' från PRAGMA.")
        else:
            logger.info(f"RENSADE KOLUMNER IDENTIFIERADE FÖR '{table_name}': {columns}")
        return columns
    except sqlite3.OperationalError as e:
        logger.error(f"sqlite3.OperationalError i _get_table_columns för '{table_name}': {e}", exc_info=True)
        raise # Återkasta felet så att det kan hanteras högre upp om nödvändigt
    except Exception as e_gen:
        logger.error(f"Oväntat fel i _get_table_columns för '{table_name}': {e_gen}", exc_info=True)
        raise
# I app.py

def _safe_select_all(table: str, columns: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    logger.debug(f"--- _safe_select_all STARTAR för tabell: '{table}', begärda kolumner: {columns} ---")
    try:
        with get_db_connection() as conn:
            actual_columns_to_select = []
            if columns is None:
                logger.debug(f"Kolumner är None för '{table}', försöker hämta alla via _get_table_columns.")
                try:
                    actual_columns_to_select = _get_table_columns(conn, table)
                except Exception as e_gtc:
                    logger.error(f"Fel från _get_table_columns inuti _safe_select_all för '{table}': {e_gtc}", exc_info=True)
                    return []
            else:
                actual_columns_to_select = columns
                logger.debug(f"Använder specificerade kolumner för '{table}': {actual_columns_to_select}")

            if not actual_columns_to_select:
                logger.warning(f"Inga faktiska kolumner att selektera för '{table}'. Returnerar tom lista.")
                return []

            # Använd de rena kolumnnamnen som de är (utan extra citationstecken här)
            # SQLite hanterar citationstecken om det behövs för reserverade ord/specialtecken
            # om du använder ? placeholders eller om kolumnnamnen är enkla.
            # För PRAGMA table_info är det bäst att _get_table_columns returnerar rena namn.
            col_sql = ", ".join([f'"{c}"' for c in actual_columns_to_select]) # Behåll citationstecken här för SQL-frågan
            sql_query = f'SELECT {col_sql} FROM "{table}"' 
            logger.debug(f"Exekverar SQL för '{table}': {sql_query}")
            
            cur = conn.execute(sql_query)
            fetched_rows_raw = cur.fetchall() 
            logger.debug(f"Antal råa rader (sqlite3.Row) hämtade från '{table}': {len(fetched_rows_raw)}")

            if table == "Kategoriregler":
                logger.debug(f"RÅDATA från {table} (sqlite3.Row objekt): {fetched_rows_raw}")
                if fetched_rows_raw:
                    logger.debug(f"Första råa raden från {table} (keys): {fetched_rows_raw[0].keys()}")
                    logger.debug(f"Första råa raden från {table} (som dict via dict()): {dict(fetched_rows_raw[0])}")


            if fetched_rows_raw:
                result_list = []
                for row_obj in fetched_rows_raw: # Byt namn på variabeln för tydlighet
                    clean_row_dict = {}
                    # row_obj.keys() ger en lista av kolumnnamnen som de är i SQLite-resultatet
                    for key_from_sqlite in row_obj.keys(): 
                        # Nyckeln som används i Python-dictionaryn ska vara ren
                        # Om _get_table_columns redan returnerar rena namn, och dessa används i SELECT,
                        # bör key_from_sqlite redan vara ren. Men vi gör en extra strip för säkerhets skull.
                        clean_key = str(key_from_sqlite).strip("\"'") 
                        clean_row_dict[clean_key] = row_obj[key_from_sqlite]
                    result_list.append(clean_row_dict)
                
                if result_list:
                    logger.debug(f"Första konverterade raden (dict) från '{table}': {result_list[0]}")
                else:
                     logger.debug(f"Result_list är tom efter konvertering för '{table}'.")

                if table == "Kategoriregler" and result_list:
                     logger.debug(f"KONVERTERAD DATA från {table} (lista av dicts): {result_list}")

                return result_list
            else:
                logger.debug(f"Inga rader hämtades av SQL-frågan för '{table}'.")
                return []
    except sqlite3.OperationalError as e_op: 
        logger.error(f"sqlite3.OperationalError i _safe_select_all för '{table}': {e_op}", exc_info=True)
        return [] 
    except Exception as e_gen:
        logger.error(f"Oväntat generellt fel i _safe_select_all för '{table}': {e_gen}", exc_info=True)
        return []

def _replace_list(
    conn: sqlite3.Connection,
    table: str,
    huvudman_pnr: str,
    # Gör year optionell, eller lägg till en parameter för att styra dess användning
    year: Optional[int], # Behåll year för tabeller som fortfarande är årsspecifika
    rows: List[Dict[str, Any]],
    extra_where: Optional[Dict[str, Any]] = None,
    is_year_specific: bool = True # NY PARAMETER
):
    logger.debug(f"--- _replace_list anropad för tabell: {table}, Pnr: {huvudman_pnr}, År: {year}, ExtraWhere: {extra_where}, Årsspecifik: {is_year_specific} ---")
    logger.debug(f"Data (rows) som ska sparas: {rows}")

    where_delete_cols = ["HuvudmanPnr"]
    where_delete_vals = [huvudman_pnr]

    if is_year_specific and year is not None: # ANVÄND is_year_specific
        # Kontrollera först om tabellen faktiskt HAR ArsrakningAr
        db_table_cols_for_delete_check = []
        try:
            db_table_cols_for_delete_check = _get_table_columns(conn, table)
        except Exception: # Ignorera fel här, vi vill inte krascha delete
            pass
        if "ArsrakningAr" in db_table_cols_for_delete_check:
             where_delete_cols.append("ArsrakningAr")
             where_delete_vals.append(year)
        elif year is not None: # Om year är angett men kolumnen saknas
             logger.warning(f"Försöker använda 'ArsrakningAr' i DELETE för tabell '{table}' men kolumnen finns inte. Ignorerar årsvillkor för DELETE.")

    if extra_where:
        for k, v_extra in extra_where.items():
            where_delete_cols.append(k)
            where_delete_vals.append(v_extra)

    where_sql_delete = " AND ".join([f'"{c}"=?' for c in where_delete_cols])
    delete_query = f'DELETE FROM "{table}" WHERE {where_sql_delete}'
    logger.debug(f"DELETE Query: {delete_query} med värden: {where_delete_vals}")
    try:
        conn.execute(delete_query, tuple(where_delete_vals))
        logger.debug(f"DELETE utförd på {table}. Antal rader påverkade: {conn.total_changes}")
    except sqlite3.Error as e_del:
        logger.error(f"SQLite-fel vid DELETE från {table}: {e_del}", exc_info=True)
        return

    if not rows:
        logger.debug(f"Inga rader att infoga i {table}.")
        return

    try:
        db_table_columns = _get_table_columns(conn, table)
    except Exception as e_get_cols_replace:
        logger.error(f"Kunde inte hämta kolumner för tabell {table} i _replace_list: {e_get_cols_replace}")
        return

    base_db_cols_map = {"HuvudmanPnr": huvudman_pnr}
    if is_year_specific and year is not None and "ArsrakningAr" in db_table_columns: # ANVÄND is_year_specific
        base_db_cols_map["ArsrakningAr"] = year
    elif year is not None and "ArsrakningAr" not in db_table_columns and is_year_specific:
        logger.warning(f"Försöker använda 'ArsrakningAr' i INSERT för tabell '{table}' men kolumnen finns inte. Ignorerar år för INSERT.")


    if extra_where:
        for k_extra, v_extra_val in extra_where.items():
            if k_extra in db_table_columns:
                base_db_cols_map[k_extra] = v_extra_val
            else:
                logger.warning(f"Extra WHERE-kolumn '{k_extra}' för _replace_list finns inte i tabell '{table}'. Ignoreras för INSERT.")

    insert_cols_from_row_data = []
    if rows and isinstance(rows[0], dict):
        insert_cols_from_row_data = [col for col in rows[0].keys() if col in db_table_columns and col not in base_db_cols_map]

    final_insert_cols = list(base_db_cols_map.keys()) + insert_cols_from_row_data

    if not final_insert_cols:
        logger.warning(f"Inga giltiga kolumner att infoga i {table} efter filtrering.")
        return

    col_sql = ", ".join([f'"{c}"' for c in final_insert_cols])
    placeholders = ", ".join(["?"] * len(final_insert_cols))
    sql_insert = f'INSERT INTO "{table}" ({col_sql}) VALUES ({placeholders})'
    logger.debug(f"INSERT Query: {sql_insert}")

    values_to_insert_list: List[tuple] = []
    for r_dict in rows:
        if not isinstance(r_dict, dict):
            logger.warning(f"Skippar rad som inte är en dictionary i _replace_list för {table}: {r_dict}")
            continue

        current_row_values = []
        for col_name in final_insert_cols:
            if col_name in base_db_cols_map:
                current_row_values.append(base_db_cols_map[col_name])
            else:
                current_row_values.append(r_dict.get(col_name))
        values_to_insert_list.append(tuple(current_row_values))

    if values_to_insert_list:
        logger.debug(f"Värden som ska infogas i {table} (första 5): {values_to_insert_list[:5]}")
        try:
            conn.executemany(sql_insert, values_to_insert_list)
            logger.debug(f"INSERT executemany utförd på {table}. Antal rader påverkade: {conn.total_changes}")
        except sqlite3.Error as e_ins:
            logger.error(f"SQLite-fel vid INSERT till {table}: {e_ins}", exc_info=True)
    else:
        logger.debug(f"Inga värden att faktiskt infoga i {table} efter bearbetning.")
        
        
async def _automate_nordea_internal(
    user_to_switch: str,
    kontonamn: str,
    from_date: str,
    to_date: str,
    output_format: str,
    screenshots_folder: Path
) -> bool:
    logger.info(f"Nordea Auto: Startar _automate_nordea_internal för användare '{user_to_switch}', konto '{kontonamn}', period {from_date}-{to_date}, format {output_format}")
    playwright_instance = None
    browser = None
    page = None
    new_page_opened_in_script = False

    try:
        playwright_instance = await async_playwright().start()
        
        logger.info(f"Nordea Auto: Ansluter till CDP-endpoint: {NORDEA_CDP_ENDPOINT}")
        browser = await playwright_instance.chromium.connect_over_cdp(NORDEA_CDP_ENDPOINT)
        contexts = browser.contexts
        if contexts:
            context = contexts[0]
            logger.info("Nordea Auto: Använder befintlig webbläsarkontext.")
        else:
            logger.info("Nordea Auto: Ingen befintlig kontext, skapar ny med accept_downloads=True.")
            context = await browser.new_context(accept_downloads=True)

        page_found = False
        for p_context_page in context.pages:
            if p_context_page.url and NORDEA_TARGET_URL_SUBSTRING in p_context_page.url:
                page = p_context_page
                await page.bring_to_front()
                logger.info(f"Nordea Auto: Hittade befintlig Nordea-flik: {page.url}")
                page_found = True
                break
        
        if not page_found:
            logger.info(f"Nordea Auto: Ingen Nordea-flik hittad. Öppnar ny till: https://{NORDEA_TARGET_URL_SUBSTRING}/overview/")
            page = await context.new_page()
            new_page_opened_in_script = True
            await page.goto(f"https://{NORDEA_TARGET_URL_SUBSTRING}/overview/", timeout=60000)

        logger.info("Nordea Auto: Söker efter cookie-banner...")
        try:
            cookie_banner_button = page.get_by_role("button", name="Acceptera cookies", exact=True)
            await cookie_banner_button.wait_for(state="visible", timeout=7000)
            await cookie_banner_button.click()
            logger.info("Nordea Auto: Klickade på 'Acceptera cookies'.")
            await page.wait_for_timeout(500) 
        except PlaywrightTimeoutError:
            logger.info("Nordea Auto: Ingen cookie-banner hittades eller timeout vid sökning.")
            pass

        logger.info("Nordea Auto: Steg 4 - Klickar på profilikon...")
        profile_button = page.get_by_role("button", name="Öppna Profil-menyn")
        await profile_button.wait_for(state="visible", timeout=30000)
        await profile_button.click()
        await page.screenshot(path=screenshots_folder / "nordea_step4_clicked_profile.png", full_page=True)
        logger.info("Nordea Auto: Profilmeny klickad.")

        logger.info(f"Nordea Auto: Steg 5 - Klickar på '{NORDEA_SWITCH_AGREEMENT_TEXT}'...")
        switch_link = page.get_by_role("link", name=NORDEA_SWITCH_AGREEMENT_TEXT, exact=True)
        await switch_link.wait_for(state="visible", timeout=20000)
        await switch_link.click()
        logger.info("Nordea Auto: 'Byt avtal' klickad.")

        logger.info("Nordea Auto: Steg 6 - Väntar på URL **/switch-agreement...")
        await page.wait_for_url("**/switch-agreement", timeout=20000)
        await page.screenshot(path=screenshots_folder / "nordea_step6_switch_agreement_page.png", full_page=True)
        logger.info("Nordea Auto: Sidan för avtalsbyte nådd.")

        logger.info("Nordea Auto: Steg 7 - Väntar på att listan med huvudmän ska laddas ('Internet & telefon')...")
        await page.wait_for_selector("text=Internet & telefon", timeout=20000)
        logger.info("Nordea Auto: Lista med huvudmän verkar laddad.")

        logger.info(f"Nordea Auto: Steg 8 - Klickar på huvudman: '{user_to_switch}'...")
        user_locator = page.get_by_text(user_to_switch, exact=False).first 
        await user_locator.scroll_into_view_if_needed(timeout=10000)
        await user_locator.wait_for(state="visible", timeout=10000)
        await user_locator.click()
        await page.screenshot(path=screenshots_folder / "nordea_step8_clicked_user.png", full_page=True)
        logger.info(f"Nordea Auto: Klickade på huvudman '{user_to_switch}'.")
        await page.wait_for_load_state('networkidle', timeout=20000) # Vänta på att sidan stabiliseras efter klick

        logger.info(f"Nordea Auto: Steg 9 - Klickar på konto: '{kontonamn}'...")
        account_locator_general = page.get_by_text(kontonamn, exact=False)
        account_element = account_locator_general.first
        await account_element.scroll_into_view_if_needed(timeout=10000)
        await account_element.wait_for(state="visible", timeout=20000)
        await account_element.click()
        
        logger.info("Nordea Auto: Steg 9b - Väntar på URL för kontodetaljer **/accounts/details/**...")
        await page.wait_for_url("**/accounts/details/**", timeout=30000) # Ökad timeout
        await page.screenshot(path=screenshots_folder / "nordea_step9_clicked_account.png", full_page=True)
        logger.info(f"Nordea Auto: Nådde kontodetaljsidan för '{kontonamn}'.")

        logger.info(f"Nordea Auto: Steg 10 - Klickar på datumfilterknapp ('{NORDEA_DATE_FILTER_BUTTON_TEXT}')...")
        date_filter_button_locator = page.get_by_role("button").filter(has=page.locator(f"div.label-text:has-text('{NORDEA_DATE_FILTER_BUTTON_TEXT}')"))
        if await date_filter_button_locator.count() == 0:
            logger.info(f"Nordea Auto: Datumfilterknapp (metod 1) ej funnen. Försöker alternativ.")
            date_locator_div = page.locator(f"div.label-text:has-text('{NORDEA_DATE_FILTER_BUTTON_TEXT}')")
            await date_locator_div.wait_for(state="visible", timeout=20000)
            date_filter_button_locator = date_locator_div.locator("xpath=ancestor::button[1]")
        
        await date_filter_button_locator.wait_for(state="visible", timeout=20000)
        await date_filter_button_locator.click()
        await page.wait_for_timeout(1000) # Liten paus för att låta UI ritas
        await page.screenshot(path=screenshots_folder / "nordea_step10_clicked_date_filter.png", full_page=True)
        logger.info("Nordea Auto: Klickade på datumfilterknapp.")

        logger.info("Nordea Auto: Steg 11 - Försöker fylla i Från- och Till-datum...")
        date_dialog_ok_button = page.get_by_role("button", name="OK", exact=True)
        logger.info("Nordea Auto: Väntar på att OK-knappen i datumdialogen ska bli synlig...")
        await date_dialog_ok_button.wait_for(state="visible", timeout=20000) # Ge mer tid
        logger.info("Nordea Auto: Datumdialogens OK-knapp är synlig.")
        
        await page.screenshot(path=screenshots_folder / "nordea_debug_before_date_input_fill.png", full_page=True)

        from_input_name = "from-date-picker"
        to_input_name = "to-date-picker" 

        from_input_locator = page.locator(f"input[name='{from_input_name}']")
        to_input_locator = page.locator(f"input[name='{to_input_name}']")

        # ----- Detaljerad kontroll för From-input -----
        logger.info(f"Nordea Auto: Kontrollerar from_input_element (name='{from_input_name}')...")
        if await from_input_locator.count() == 0:
            logger.error(f"Nordea Auto: FATALT - from_input_locator (name='{from_input_name}') hittade INGA element.")
            await page.screenshot(path=screenshots_folder / "nordea_error_no_from_input_found.png", full_page=True)
            raise PlaywrightTimeoutError(f"from_input_locator (name='{from_input_name}') hittade inga element.")
        
        logger.info(f"Nordea Auto: from_input_locator hittade {await from_input_locator.count()} element.")
        from_input_element = from_input_locator.first
        try:
            logger.info("Nordea Auto: Väntar på att 'Från datum'-elementet (.first) ska bli synligt...")
            await from_input_element.wait_for(state="visible", timeout=10000)
            logger.info("Nordea Auto: 'Från datum'-elementet är synligt.")
            tag_name = await from_input_element.evaluate("el => el.tagName", timeout=1000)
            el_id = await from_input_element.get_attribute("id")
            el_type = await from_input_element.get_attribute("type")
            el_name_attr = await from_input_element.get_attribute("name") # Byt namn för att undvika skuggning
            is_vis = await from_input_element.is_visible()
            is_ena = await from_input_element.is_enabled()
            is_edi = await from_input_element.is_editable()
            logger.info(f"Nordea Auto: from_input_element.first: Tag={tag_name}, ID={el_id}, Type={el_type}, NameAttr={el_name_attr}, Visible={is_vis}, Enabled={is_ena}, Editable={is_edi}")

            if not is_edi:
                 logger.warning("Nordea Auto: 'Från datum' är synligt men rapporteras inte som is_editable(). Försöker interagera ändå.")
            
            logger.info("Nordea Auto: Interagerar med 'Från datum'-elementet...")
            await from_input_element.click(timeout=5000) 
            await from_input_element.evaluate("el => el.value = ''") 
            await from_input_element.fill(from_date, timeout=5000) 
            logger.info(f"Nordea Auto: Fyllde i from_date: {from_date}")

        except Exception as e_check_from:
            logger.error(f"Nordea Auto: Fel vid kontroll/interaktion med from_input_element: {e_check_from}", exc_info=True)
            await page.screenshot(path=screenshots_folder / "nordea_error_at_from_input_interact.png", full_page=True)
            raise 

        # ----- Detaljerad kontroll för To-input -----
        logger.info(f"Nordea Auto: Kontrollerar to_input_element (name='{to_input_name}')...")
        if await to_input_locator.count() == 0:
            logger.error(f"Nordea Auto: FATALT - to_input_locator (name='{to_input_name}') hittade INGA element.")
            await page.screenshot(path=screenshots_folder / "nordea_error_no_to_input_found.png", full_page=True)
            raise PlaywrightTimeoutError(f"to_input_locator (name='{to_input_name}') hittade inga element.")

        logger.info(f"Nordea Auto: to_input_locator hittade {await to_input_locator.count()} element.")
        to_input_element = to_input_locator.first
        try:
            logger.info("Nordea Auto: Väntar på att 'Till datum'-elementet (.first) ska bli synligt...")
            await to_input_element.wait_for(state="visible", timeout=10000)
            logger.info("Nordea Auto: 'Till datum'-elementet är synligt.")
            tag_name = await to_input_element.evaluate("el => el.tagName", timeout=1000)
            el_id = await to_input_element.get_attribute("id")
            el_type = await to_input_element.get_attribute("type")
            el_name_attr = await to_input_element.get_attribute("name")
            is_vis = await to_input_element.is_visible()
            is_ena = await to_input_element.is_enabled()
            is_edi = await to_input_element.is_editable()
            logger.info(f"Nordea Auto: to_input_element.first: Tag={tag_name}, ID={el_id}, Type={el_type}, NameAttr={el_name_attr}, Visible={is_vis}, Enabled={is_ena}, Editable={is_edi}")

            if not is_edi:
                 logger.warning("Nordea Auto: 'Till datum' är synligt men rapporteras inte som is_editable(). Försöker interagera ändå.")

            logger.info("Nordea Auto: Interagerar med 'Till datum'-elementet...")
            await to_input_element.click(timeout=5000)
            await to_input_element.evaluate("el => el.value = ''")
            await to_input_element.fill(to_date, timeout=5000)
            logger.info(f"Nordea Auto: Fyllde i to_date: {to_date}")
        except Exception as e_check_to:
            logger.error(f"Nordea Auto: Fel vid kontroll/interaktion med to_input_element: {e_check_to}", exc_info=True)
            await page.screenshot(path=screenshots_folder / "nordea_error_at_to_input_interact.png", full_page=True)
            raise
        
        await page.screenshot(path=screenshots_folder / "nordea_step11_filled_dates.png", full_page=True)

        logger.info("Nordea Auto: Steg 12 - Klickar på OK i datumdialogen...")
        await date_dialog_ok_button.click()
        logger.info("Nordea Auto: Klickade OK efter datumval.")

        try:
            logger.info("Nordea Auto: Väntar på networkidle efter OK-klick (max 45s)...") # Ökad timeout
            await page.wait_for_load_state('networkidle', timeout=45000)
            logger.info("Nordea Auto: Networkidle uppnåddes.")
        except PlaywrightTimeoutError:
            logger.warning("Nordea Auto: Timeout vid väntan på networkidle. Fortsätter efter en kort paus...")
            await page.wait_for_timeout(5000)

        await page.screenshot(path=screenshots_folder / "nordea_step12_after_click_ok_and_load.png", full_page=True)
        
        # Steg 13 (Nedladdning)
        download_button_text = NORDEA_PDF_BUTTON_TEXT if output_format == "PDF" else NORDEA_CSV_BUTTON_TEXT
        logger.info(f"Nordea Auto: Steg 13 - Förbereder klick på {output_format}-knapp ('{download_button_text}')...")
        
        download_element = page.get_by_role("link", name=download_button_text, exact=True)
        if await download_element.count() == 0:
            logger.info(f"Nordea Auto: Hittade inte '{download_button_text}' som länk, provar som knapp...")
            download_element = page.get_by_role("button", name=download_button_text, exact=True)
        
        if await download_element.count() == 0:
            await page.screenshot(path=screenshots_folder / f"nordea_error_download_button_{output_format}_not_found.png", full_page=True)
            raise PlaywrightTimeoutError(f"Kunde inte hitta nedladdningsknapp/länk för {output_format} med text '{download_button_text}'")

        await download_element.wait_for(state="visible", timeout=15000)
        logger.info(f"Nordea Auto: Förväntar nedladdning och klickar på '{download_button_text}'...")
        
        NORDEA_DOWNLOADS_PATH.mkdir(parents=True, exist_ok=True)

        async with page.expect_download(timeout=60000) as download_info:
            await download_element.click()
        
        download = await download_info.value
        
        suggested_filename = download.suggested_filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename_stem = "".join(c if c.isalnum() or c in ['-', '_'] else '_' for c in Path(suggested_filename).stem)
        safe_filename = f"{safe_filename_stem}_{timestamp}{Path(suggested_filename).suffix}"
        full_save_path = NORDEA_DOWNLOADS_PATH / safe_filename
        
        logger.info(f"Nordea Auto: Nedladdning påbörjad. Föreslaget filnamn: {suggested_filename}. Sparar till: {full_save_path}")
        await download.save_as(full_save_path)
        logger.info(f"Nordea Auto: Fil sparad som {full_save_path}")
        
        if not full_save_path.exists():
            logger.warning(f"Nordea Auto VARNING: Filen verkar inte ha sparats korrekt på: {full_save_path}")
        
        await page.screenshot(path=screenshots_folder / f"nordea_step13_clicked_{output_format.lower()}.png", full_page=True)
        await asyncio.sleep(2) # Ge lite extra tid för filen att helt sparas/registreras
        logger.info("Nordea Auto: Automatisering slutförd framgångsrikt.")
        return True

    except PlaywrightTimeoutError as e_pw_timeout:
        # ... (din befintliga felhantering för PlaywrightTimeoutError) ...
        error_message = f"Nordea Auto: Timeout i automatiseringen: {e_pw_timeout}\n"
        url_info = "Okänd eller stängd"
        if page and not page.is_closed(): url_info = page.url
        error_message += f"   URL vid fel: {url_info}\n"
        logger.error(error_message, exc_info=True)
        if page and not page.is_closed():
            await page.screenshot(path=screenshots_folder / "nordea_error_timeout.png", full_page=True)
        return False
    except Exception as e_pw_general:
        # ... (din befintliga felhantering för Exception) ...
        error_message = f"Nordea Auto: Oväntat fel i Playwright-skriptet: {e_pw_general}\n"
        error_message += f"   Typ av fel: {type(e_pw_general).__name__}\n"
        url_info = "Okänd eller stängd"
        if page and not page.is_closed(): url_info = page.url
        error_message += f"   URL vid fel: {url_info}\n"
        logger.error(error_message, exc_info=True)
        if page and not page.is_closed():
            await page.screenshot(path=screenshots_folder / "nordea_error_unexpected.png", full_page=True)
        return False
    finally:
        # ... (ditt befintliga finally-block) ...
        logger.info("Nordea Auto: Inom finally-blocket för _automate_nordea_internal.")
        if new_page_opened_in_script and page and not page.is_closed():
            logger.info("Nordea Auto: Stänger sidan som öppnades av skriptet.")
            await page.close()
        if browser:
            try:
                logger.info("Nordea Auto: Stänger webbläsaranslutning (CDP disconnect).")
                await browser.close() 
            except Exception as e_browser_close:
                logger.warning(f"Nordea Auto: Fel vid browser.close(): {e_browser_close}")
        if playwright_instance:
            try:
                await playwright_instance.stop()
                logger.info("Nordea Auto: Playwright-instans stoppad.")
            except Exception as e_playwright_stop:
                logger.warning(f"Nordea Auto: Fel vid playwright_instance.stop(): {e_playwright_stop}")@app.route("/api/nordea/start_edge", methods=["POST"])
def nordea_start_edge(): # Detta är funktionen som ska kopplas till den första Nordea-knappen
    logger.info("API: /api/nordea/start_edge anropad")
    screenshots_folder = ensure_nordea_screenshots_dir() 
    message = "Försök att starta/ansluta till Edge."
    status_code = 200

    if NORDEA_AUTO_LAUNCH_EDGE:
        # Kontrollera portnummer från endpoint
        cdp_port_str = NORDEA_CDP_ENDPOINT.split(":")[-1]
        if not cdp_port_str.isdigit():
            logger.error(f"Ogiltigt CDP_ENDPOINT format: {NORDEA_CDP_ENDPOINT}. Kan inte extrahera portnummer.")
            return jsonify({"error": "Serverkonfigurationsfel för CDP endpoint."}), 500
        cdp_port = int(cdp_port_str)

        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            s.connect(("127.0.0.1", cdp_port))
            # Om connect lyckas, är Edge redan igång med CDP
            message = f"Edge med CDP på port {cdp_port} körs redan. Försöker öppna Nordea Login i ny flik."
            
            async def open_login_via_pw(): # Intern async funktion för att öppna flik
                pw_local = None 
                browser_local = None 
                try:
                    pw_local = await async_playwright().start()
                    browser_local = await pw_local.chromium.connect_over_cdp(NORDEA_CDP_ENDPOINT)
                    # Använd befintlig kontext eller skapa ny
                    context_local = browser_local.contexts[0] if browser_local.contexts else await browser_local.new_context()
                    page_local = await context_local.new_page()
                    await page_local.goto(NORDEA_LOGIN_URL, timeout=30000)
                    # Ta en skärmdump för att bekräfta
                    await page_local.screenshot(path=screenshots_folder / "nordea_opened_login_via_cdp.png", full_page=True)
                    logger.info(f"Nordea Auto: Ny flik öppnad till {NORDEA_LOGIN_URL} via befintlig CDP-session.")
                except Exception as e_pw_open:
                    logger.error(f"Playwright-fel vid försök att öppna login-sida via befintlig CDP: {e_pw_open}", exc_info=True)
                finally:
                    if browser_local and browser_local.is_connected():
                        try: await browser_local.close() # Disconnectar från CDP, stänger inte webbläsaren
                        except Exception: pass
                    if pw_local:
                        try: await pw_local.stop()
                        except Exception: pass
            
            # Hantera asyncio loop korrekt
            try:
                loop = asyncio.get_event_loop()
                if loop.is_closed(): 
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                if loop.is_running(): 
                    asyncio.create_task(open_login_via_pw())
                    logger.info("Nordea Auto: Skapade en task för open_login_via_pw i en redan körande loop.")
                else: 
                    loop.run_until_complete(open_login_via_pw())
                    logger.info("Nordea Auto: Körde open_login_via_pw i en ny/befintlig loop.")
            except RuntimeError as e_loop: 
                logger.warning(f"RuntimeError med asyncio i start_edge (för open_login_via_pw): {e_loop}. Försöker med helt ny loop.")
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                new_loop.run_until_complete(open_login_via_pw())
                new_loop.close()

        except ConnectionRefusedError:
            # Om Edge inte körs med CDP, starta en ny instans
            message = f"Ingen Edge med CDP på port {cdp_port} hittades. Startar ny instans."
            user_data_dir = Path.home() / ".GodmanAppNordeaProfile" # Egen profildata för detta
            user_data_dir.mkdir(parents=True, exist_ok=True)
            try:
                subprocess.Popen([
                    NORDEA_EDGE_PATH_WINDOWS,
                    f"--remote-debugging-port={cdp_port}",
                    f"--user-data-dir={str(user_data_dir)}",
                    "--new-window",
                    NORDEA_LOGIN_URL
                ])
                logger.info(f"Nordea Auto: Försökte starta Edge med Popen: {NORDEA_EDGE_PATH_WINDOWS} på port {cdp_port}")
            except FileNotFoundError:
                message = f"Kunde inte hitta Edge på sökvägen: {NORDEA_EDGE_PATH_WINDOWS}."
                logger.error(message)
                status_code = 500
            except Exception as e_subproc:
                message = f"Fel vid start av Edge med Popen: {e_subproc}"
                logger.error(message, exc_info=True)
                status_code = 500
        except Exception as e_outer: 
            message = f"Oväntat serverfel vid försök att hantera Edge: {str(e_outer)}"
            logger.error(message, exc_info=True)
            status_code = 500
        finally:
            s.close() # Stäng alltid socketen
    else:
        message = "Automatisk start av Edge är avstängd. Starta Edge manuellt med --remote-debugging-port=9222."

    if status_code == 200 :
        return jsonify({"message": message}), status_code
    else:
        return jsonify({"error": message}), status_code
        


@app.route("/api/nordea/run_automation", methods=["POST"])
def nordea_run_automation(): # Detta är INTE en async funktion
    logger.info("API: /api/nordea/run_automation anropad")
    data = request.get_json(force=True) or {}
    
    user_to_switch = data.get("user_to_switch", "").strip()
    kontonamn = data.get("kontonamn", "").strip()
    from_date = data.get("from_date", "").strip()
    to_date = data.get("to_date", "").strip()
    output_format = data.get("output_format", "PDF").strip().upper()

    if not all([user_to_switch, kontonamn, from_date, to_date]) or output_format not in ("PDF", "CSV"):
        return jsonify({"error": "Alla fält måste fyllas i korrekt."}), 400

    try:
        datetime.strptime(from_date, "%Y-%m-%d")
        datetime.strptime(to_date, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Datum måste vara i formatet ÅÅÅÅ-MM-DD."}), 400

    screenshots_folder = ensure_nordea_screenshots_dir()
    success_automation = False
    message_automation = "Automatiseringen misslyckades."

    try:
        loop = asyncio.new_event_loop() 
        asyncio.set_event_loop(loop)
        # Här anropas den separata async-funktionen _automate_nordea_internal
        success_automation = loop.run_until_complete(
            _automate_nordea_internal( 
                user_to_switch, kontonamn, from_date, to_date, output_format, screenshots_folder
            )
        )
        loop.close()
        
        if success_automation:
            message_automation = f"Automatisering körd! Fil ({output_format}) bör ha laddats ner till {NORDEA_DOWNLOADS_PATH}."
    
    except Exception as e_run:
        logger.error(f"Fel vid körning av Nordea-automatisering: {e_run}", exc_info=True)
        message_automation = f"Ett allvarligt fel uppstod under automatiseringen: {str(e_run)}"
        success_automation = False 

    if success_automation:
        return jsonify({"message": message_automation}), 200
    else:
        return jsonify({"error": message_automation}), 500

@app.route("/api/godmanprofiles", methods=["GET"])
def list_godman_profiles():
    logger.debug("--- API '/api/godmanprofiles' (GET) STARTAR ---")
    try:
        kolumner_att_hamta = [
            "ID", "Fornamn", "Efternamn", "Personnummer", 
            "Adress", "Postnummer", "Postort", 
            "Telefon", "Mobil", "Epost", 
            "IsCurrentUser", "Clearingnummer", "Kontonummer"
        ]
        logger.debug(f"list_godman_profiles: Försöker hämta kolumner: {kolumner_att_hamta} från tabellen 'GodManProfiler'")
        
        rows = _safe_select_all("GodManProfiler", kolumner_att_hamta) 
        
        logger.debug(f"list_godman_profiles: Data från _safe_select_all: {rows} (typ: {type(rows)}, längd: {len(rows) if isinstance(rows, list) else 'N/A'})")
        
        if not isinstance(rows, list):
            logger.error(f"list_godman_profiles: _safe_select_all returnerade inte en lista, fick: {type(rows)}")
            return jsonify({"error": "Internt serverfel vid databashämtning av profiler."}), 500

        if rows:
            try:
                if all(isinstance(r, dict) for r in rows):
                    rows.sort(key=lambda r: ((r.get("Fornamn") or "").lower(), (r.get("Efternamn") or "").lower()))
                else:
                    logger.warning("list_godman_profiles: 'rows' är inte en lista av dictionaries, kan inte sortera.")
            except Exception as e_sort: 
                logger.error(f"list_godman_profiles: Fel vid sortering av rader: {e_sort}. Rådata: {rows}", exc_info=True)
        
        logger.info(f"Returnerar {len(rows)} God Man-profiler till klienten.")
        return jsonify(rows)
    except Exception as e:
        logger.error(f"Allvarligt fel i list_godman_profiles: {e}", exc_info=True)
        return jsonify({"error": f"Kunde inte hämta God Man-profiler: {str(e)}"}), 500

@app.route("/api/godmanprofiles", methods=["POST"])
def create_godman_profile():
    logger.debug("--- API '/api/godmanprofiles' (POST) anropad för att skapa profil ---")
    data_from_js = request.get_json(force=True) or {}
    
    if not data_from_js.get("Fornamn") or not data_from_js.get("Efternamn") or not data_from_js.get("Personnummer"):
        logger.warning("Skapa GodManProfil: Obligatoriska fält saknas i request.")
        return jsonify({"error": "Förnamn, Efternamn och Personnummer är obligatoriska."}), 400

    try:
        with get_db_connection() as conn:
            if data_from_js.get("IsCurrentUser") == 1:
                logger.debug("Skapa GodManProfil: IsCurrentUser är 1, nollställer andra.")
                conn.execute("UPDATE GodManProfiler SET IsCurrentUser = 0")
            
            cols_db = ["Fornamn", "Efternamn", "Personnummer", "Adress", "Postnummer", "Postort", "Telefon", "Mobil", "Epost", "IsCurrentUser", "Clearingnummer", "Kontonummer"]
            vals_db = [
                data_from_js.get("Fornamn"),
                data_from_js.get("Efternamn"),
                data_from_js.get("Personnummer"),
                data_from_js.get("Adress"),
                data_from_js.get("Postnummer"),
                data_from_js.get("Postort"),
                data_from_js.get("Telefon"),
                data_from_js.get("Mobil"),
                data_from_js.get("Epost"),
                1 if data_from_js.get("IsCurrentUser") else 0,
                data_from_js.get("Clearingnummer"),
                data_from_js.get("Kontonummer")
            ]
            
            col_sql = ", ".join([f'"{c}"' for c in cols_db])
            placeholders = ", ".join(["?"] * len(cols_db))
            
            sql_insert = f"INSERT INTO GodManProfiler ({col_sql}) VALUES ({placeholders})"
            logger.debug(f"Skapa GodManProfil: SQL INSERT: {sql_insert}")
            logger.debug(f"Skapa GodManProfil: Värden: {vals_db}")

            cursor = conn.execute(sql_insert, tuple(vals_db))
            conn.commit()
            new_id = cursor.lastrowid
            logger.info(f"Ny God Man-profil skapad med ID: {new_id}")
            
            created_profile_data = {**data_from_js, "ID": new_id}

            return jsonify({
                "message": "Ny God Man-profil tillagd!", 
                "id": new_id,
                "profile": created_profile_data 
            }), 201
    except sqlite3.IntegrityError as ie:
        logger.error(f"Integritetsfel vid skapande av God Man-profil: {ie}", exc_info=True)
        return jsonify({"error": "En God Man-profil med detta personnummer finns redan eller annat integritetsfel."}), 409
    except Exception as e:
        logger.error(f"Allmänt fel vid skapande av God Man-profil: {e}", exc_info=True)
        return jsonify({"error": f"Internt serverfel: {str(e)}"}), 500

@app.route("/api/godmanprofiles/<int:profile_id>", methods=["PUT"])
def update_godman_profile(profile_id):
    logger.debug(f"--- API '/api/godmanprofiles/{profile_id}' (PUT) anropad ---")
    data_from_js = request.get_json(force=True) or {}

    # Validera obligatoriska fält
    if not data_from_js.get("Fornamn") or not data_from_js.get("Efternamn") or not data_from_js.get("Personnummer"):
        logger.warning(f"Uppdatera GodManProfil {profile_id}: Obligatoriska fält saknas.")
        return jsonify({"error": "Förnamn, Efternamn och Personnummer är obligatoriska."}), 400

    try:
        with get_db_connection() as conn:
            # Om IsCurrentUser sätts till 1, nollställ för andra profiler
            if data_from_js.get("IsCurrentUser") == 1:
                logger.debug(f"Uppdatera GodManProfil {profile_id}: IsCurrentUser är 1, nollställer andra.")
                conn.execute("UPDATE GodManProfiler SET IsCurrentUser = 0 WHERE ID != ?", (profile_id,))
            
            # Kolumner som ska uppdateras (matcha JS-objektets nycklar och DB-kolumner)
            # Se till att dessa matchar din databas och vad JS skickar
            cols_to_update_db = [
                "Fornamn", "Efternamn", "Personnummer", "Adress", "Postnummer", "Postort", 
                "Telefon", "Mobil", "Epost", "IsCurrentUser", 
                "Clearingnummer", # Använd "Clearingnumm" om det är ditt DB-kolumnnamn
                "Kontonummer"
            ]
            vals_for_update_db = [
                data_from_js.get("Fornamn"), data_from_js.get("Efternamn"), data_from_js.get("Personnummer"),
                data_from_js.get("Adress"), data_from_js.get("Postnummer"), data_from_js.get("Postort"),
                data_from_js.get("Telefon"), data_from_js.get("Mobil"), data_from_js.get("Epost"),
                1 if data_from_js.get("IsCurrentUser") else 0,
                data_from_js.get("Clearingnummer"), # Se till att JS skickar "Clearingnummer"
                data_from_js.get("Kontonummer")
            ]

            # Anpassa kolumnnamn för SQL om de skiljer sig (t.ex. "Clearingnumm")
            # Exempel: db_kolumn_namn_clearing = "Clearingnumm" if "Clearingnumm" in _get_table_columns(conn, "GodManProfiler") else "Clearingnummer"
            # Detta är en förenkling, du bör använda de faktiska namnen.
            # Förutsätter här att `cols_to_update_db` innehåller de korrekta DB-kolumnnamnen.

            set_sql_parts = []
            final_values_list = []

            for i, col_name in enumerate(cols_to_update_db):
                # Här bör du använda det faktiska kolumnnamnet från din DB om det skiljer sig från JS-nyckeln
                # Exempel: om JS skickar "Clearingnummer" men DB har "Clearingnumm"
                db_col = col_name 
                if col_name == "Clearingnummer" and "Clearingnumm" in _get_table_columns(conn, "GodManProfiler"): # Exempel på anpassning
                    db_col = "Clearingnumm"
                
                set_sql_parts.append(f'"{db_col}"=?')
                final_values_list.append(vals_for_update_db[i])
            
            final_values_list.append(profile_id) # Lägg till ID för WHERE-klausulen

            sql_update = f"UPDATE GodManProfiler SET {', '.join(set_sql_parts)} WHERE ID = ?"
            
            logger.debug(f"Uppdatera GodManProfil {profile_id}: SQL UPDATE: {sql_update}")
            logger.debug(f"Uppdatera GodManProfil {profile_id}: Värden: {tuple(final_values_list)}")

            cursor = conn.execute(sql_update, tuple(final_values_list))
            conn.commit()

            if cursor.rowcount == 0:
                logger.warning(f"Uppdatera GodManProfil: Ingen profil hittades med ID {profile_id} för uppdatering.")
                return jsonify({"error": "Profilen hittades inte."}), 404
            
            logger.info(f"God Man-profil med ID {profile_id} uppdaterad.")
            updated_profile_data = {**data_from_js, "ID": profile_id} # Skicka tillbaka datan
            return jsonify({
                "message": "God Man-profil uppdaterad!",
                "profile": updated_profile_data
            }), 200

    except sqlite3.IntegrityError as ie:
        logger.error(f"Integritetsfel vid uppdatering av God Man-profil {profile_id}: {ie}", exc_info=True)
        return jsonify({"error": "Personnumret används redan av en annan profil eller annat integritetsfel."}), 409
    except Exception as e:
        logger.error(f"Allmänt fel vid uppdatering av God Man-profil {profile_id}: {e}", exc_info=True)
        return jsonify({"error": f"Internt serverfel: {str(e)}"}), 500
# ----------------------------------------------------------------------------
# Servera HTML-filen
# ----------------------------------------------------------------------------
@app.route("/")
def index():
    logger.debug("--- Route '/' anropad ---")
    return send_from_directory(app.static_folder, HTML_FILE)

# ----------------------------------------------------------------------------
# API Endpoints: Huvudman
# ----------------------------------------------------------------------------
logger.debug("--- Definierar API Endpoints: Huvudman ---")
@app.route("/api/huvudman", methods=["GET"])
def list_huvudman():
    logger.debug("--- API '/api/huvudman' (GET) anropad ---")
    rows = _safe_select_all("huvudman", ["PERSONNUMMER", "FORNAMN", "EFTERNAMN", "ADRESS"])
    client_rows = []
    for r in rows:
        client_rows.append({
            "Personnummer": r.get("PERSONNUMMER"),
            "Fornamn": r.get("FORNAMN"),
            "Efternamn": r.get("EFTERNAMN"),
            "Adress": r.get("ADRESS")
        })
    client_rows.sort(key=lambda r: ((r.get("Fornamn") or "").lower(), (r.get("Efternamn") or "").lower(), (r.get("Adress") or "").lower()))
    return jsonify(client_rows)

@app.route("/api/overformyndare", methods=["GET"])
def list_overformyndare():
    logger.debug("--- API '/api/overformyndare' (GET) anropad ---")
    try:
        rows = _safe_select_all("Overformyndare", ["ID", "Namn", "Adress", "Postnummer", "Postort", "Telefon", "Epost"])
        rows.sort(key=lambda r: (r.get("Namn") or "").lower())
        return jsonify(rows)
    except Exception as e:
        logger.error(f"Fel vid hämtning av överförmyndare: {e}", exc_info=True)
        return jsonify({"error": f"Kunde inte hämta överförmyndare: {str(e)}"}), 500

# I app.py

@app.route('/api/learned_categories', methods=['GET'])
def get_learned_categories():
    logger.debug("--- API '/api/learned_categories' (GET) anropad ---")
    try:
        db_kolumn_text = "TransactionText"
        db_kolumn_category_key = "CategoryKey" # Använd det faktiska kolumnnamnet från din databas
        
        # Begär de faktiska kolumnnamnen från databasen
        rows = _safe_select_all("LearnedCategories", [db_kolumn_text, db_kolumn_category_key])
        
        if rows is None:
            logger.error("get_learned_categories: _safe_select_all returnerade None.")
            return jsonify({"error": "Internt serverfel vid databashämtning för inlärda kategorier."}), 500

        learned_data = {}
        for row in rows:
            # Säkerställ att nycklarna matchar vad _safe_select_all returnerar (borde vara rena nu)
            if isinstance(row, dict) and db_kolumn_text in row and db_kolumn_category_key in row:
                learned_data[row[db_kolumn_text]] = row[db_kolumn_category_key] 
            else:
                logger.warning(f"Skippar ogiltig rad eller rad som saknar nycklar från LearnedCategories: {row}")
        
        logger.debug(f"Hämtade och formaterade inlärda kategorier: {learned_data}")
        return jsonify(learned_data)
    except KeyError as ke:
        logger.error(f"KeyError i get_learned_categories - troligen fel kolumnnamn refereras: {ke}", exc_info=True)
        # Försök logga den felande raden om möjligt
        problem_row_index = -1
        if rows and isinstance(rows, list):
            for i, r_item in enumerate(rows):
                if not (isinstance(r_item, dict) and db_kolumn_text in r_item and db_kolumn_category_key in r_item):
                    problem_row_index = i
                    break
            if problem_row_index != -1:
                 logger.error(f"Raden som orsakade KeyError (index {problem_row_index}): {rows[problem_row_index]}")
            else:
                 logger.error(f"KeyError men kunde inte identifiera specifik felande rad. Första raden: {rows[0] if rows else 'Rows är tom'}")

        return jsonify({"error": f"Internt serverfel (KeyError i learned_categories): {str(ke)}"}), 500
    except Exception as e:
        logger.error(f"Allmänt fel i get_learned_categories: {e}", exc_info=True)
        return jsonify({"error": f"Internt serverfel (learned_categories): {str(e)}"}), 500

@app.route('/api/learned_categories', methods=['POST'])
def save_learned_category():
    logger.debug("--- API '/api/learned_categories' (POST) anropad ---")
    data = request.get_json(force=True) or {}
    text = data.get('text') # JavaScript skickar 'text'
    category_key_from_js = data.get('categoryKey') # JavaScript skickar 'categoryKey'

    if not text or not category_key_from_js:
        return jsonify({'error': 'Text och categoryKey måste anges från klienten'}), 400
    
    try:
        with get_db_connection() as conn:
            # Använd det korrekta kolumnnamnet 'CategoryKey' för databasen
            conn.execute("INSERT OR REPLACE INTO LearnedCategories (TransactionText, CategoryKey) VALUES (?, ?)",
                         (text, category_key_from_js))
            conn.commit()
            logger.info(f"Inlärd kategori sparad: '{text}' -> '{category_key_from_js}'")
            return jsonify({'message': 'Inlärd kategori sparad'}), 200
    except sqlite3.Error as e_sql:
        logger.error(f"SQLite-fel vid sparande av inlärd kategori: {e_sql}", exc_info=True)
        # Försök ge ett mer specifikt felmeddelande om möjligt
        if "no such column" in str(e_sql).lower():
            return jsonify({'error': f'Databasfel: Kolumn saknas eller är felstavad i LearnedCategories-tabellen. ({str(e_sql)})'}), 500
        return jsonify({'error': f'Databasfel vid sparande av inlärd kategori: {str(e_sql)}'}), 500
    except Exception as e:
        logger.error(f"Allmänt fel vid sparande av inlärd kategori: {e}", exc_info=True)
        return jsonify({'error': f'Internt serverfel: {str(e)}'}), 500

@app.route('/api/learned_categories/clear', methods=['POST'])
def clear_all_learned_categories():
    logger.debug("--- API '/api/learned_categories/clear' (POST) anropad ---")
    try:
        with get_db_connection() as conn:
            conn.execute("DELETE FROM LearnedCategories")
            conn.commit()
        return jsonify({'message': 'Alla inlärda kategorier rensade'}), 200
    except Exception as e:
        logger.error(f"Fel vid rensning av inlärda kategorier: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route("/api/overformyndare", methods=["POST"])
def create_overformyndare():
    logger.debug("--- API '/api/overformyndare' (POST) anropad ---")
    data = request.get_json(force=True) or {}
    namn = data.get("Namn")
    if not namn:
        return jsonify({"error": "Namn på överförmyndarenhet är obligatoriskt."}), 400
    try:
        with get_db_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO Overformyndare (Namn, Adress, Postnummer, Postort, Telefon, Epost) VALUES (?, ?, ?, ?, ?, ?)",
                (namn, data.get("Adress"), data.get("Postnummer"), data.get("Postort"), data.get("Telefon"), data.get("Epost"))
            )
            conn.commit()
            new_id = cursor.lastrowid
            return jsonify({"message": "Ny överförmyndare tillagd!", "id": new_id}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "En överförmyndarenhet med detta namn finns redan."}), 409
    except Exception as e:
        logger.error(f"Fel vid skapande av överförmyndare: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route("/api/huvudman", methods=["POST"])
def create_huvudman():
    logger.debug("--- API '/api/huvudman' (POST) anropad ---")
    data_from_js = request.get_json(force=True) or {} 
    
    pnr_js = data_from_js.get("Personnummer")
    fornamn_js = data_from_js.get("Fornamn")
    efternamn_js = data_from_js.get("Efternamn")

    if not pnr_js or not fornamn_js or not efternamn_js:
        return jsonify({"error": "Personnummer, Förnamn och Efternamn är obligatoriska."}), 400

    try:
        with get_db_connection() as conn:
            existing = conn.execute('SELECT PERSONNUMMER FROM huvudman WHERE PERSONNUMMER = ?', (pnr_js,)).fetchone()
            if existing:
                return jsonify({"error": "En huvudman med detta personnummer finns redan."}), 409

            cols_to_insert_db = ["PERSONNUMMER", "FORNAMN", "EFTERNAMN", "ADRESS", "POSTNUMMER", "ORT", "OVERFORMYNDARE_ID"]
            values_to_insert_db = [
                pnr_js, fornamn_js, efternamn_js,
                data_from_js.get("Adress"), 
                data_from_js.get("Postnummer"), 
                data_from_js.get("Ort"),
                data_from_js.get("OverformyndareID") 
            ]
            
            col_sql = ", ".join([f'"{c}"' for c in cols_to_insert_db])
            placeholders = ", ".join(["?"] * len(cols_to_insert_db))
            
            conn.execute(f"INSERT INTO huvudman ({col_sql}) VALUES ({placeholders})", tuple(values_to_insert_db))
            conn.commit()
            
            return jsonify({
                "message": "Ny huvudman tillagd!", 
                "huvudman": {"Personnummer": pnr_js, "Fornamn": fornamn_js, "Efternamn": efternamn_js} 
            }), 201
    except sqlite3.IntegrityError as ie:
        logger.error(f"Integritetsfel vid skapande av huvudman: {ie}", exc_info=True)
        return jsonify({"error": "En huvudman med detta personnummer finns redan eller annat integritetsfel."}), 409
    except Exception as e:
        logger.error(f"Fel vid skapande av huvudman: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

def _db_col_to_js_pascal_case(db_col_name: str) -> str:
    if not db_col_name:
        return ""
    parts = db_col_name.split('_')
    return "".join(p[0].upper() + p[1:].lower() for p in parts)

@app.route("/api/huvudman/<personnummer>/details/<int:year>", methods=["GET"])
def get_huvudman_full_details(personnummer: str, year: int):
    logger.debug(f"--- API '/api/huvudman/{personnummer}/details/{year}' (GET) anropad ---")
    try:
        with get_db_connection() as conn:
            db_columns_for_huvudman = []
            try:
                db_columns_for_huvudman = _get_table_columns(conn, "huvudman") 
            except sqlite3.OperationalError as e:
                logger.error(f"Tabellen 'huvudman' existerar inte eller fel vid PRAGMA: {e}")
                return jsonify({"error": "Databasfel: Kan inte läsa huvudman-tabellens struktur."}), 500
            
            if not db_columns_for_huvudman: 
                 return jsonify({"error": "Internt serverfel: Kan inte definiera huvudman-tabellens struktur."}), 500

            select_h_cols = ", ".join([f'h."{c}"' for c in db_columns_for_huvudman])
            
            sql = f"""
                SELECT {select_h_cols}, 
                       ov.Namn       AS Overformyndare_Namn_Joined, 
                       ov.Adress     AS Overformyndare_Adress_Joined,
                       ov.Postnummer AS Overformyndare_Postnummer_Joined,
                       ov.Postort    AS Overformyndare_Postort_Joined
                  FROM huvudman h
                  LEFT JOIN Overformyndare ov ON ov.ID = h.OVERFORMYNDARE_ID 
                 WHERE h.PERSONNUMMER = ? 
            """ 
            
            db_row = conn.execute(sql, (personnummer,)).fetchone()
            
            if not db_row:
                return jsonify({"error": "Huvudman hittades inte"}), 404

            huvudman_details_for_js = {} 
            for db_col_name in db_columns_for_huvudman:
                js_key = _db_col_to_js_pascal_case(db_col_name)
                huvudman_details_for_js[js_key] = db_row[db_col_name]
            
            data_for_js: Dict[str, Any] = {
                "huvudmanDetails": huvudman_details_for_js,
                "overformyndareDetails": None,
                "bankkontonStart": [], "bankkontonSlut": [],
                "ovrigaTillgangarStart": [], "ovrigaTillgangarSlut": [],
                "skulder": [], "arsrakningPoster": []
            }

            if db_row["Overformyndare_Namn_Joined"]: 
                data_for_js["overformyndareDetails"] = {
                    "ID": db_row["OVERFORMYNDARE_ID"], 
                    "Namn": db_row["Overformyndare_Namn_Joined"],
                    "Adress": db_row["Overformyndare_Adress_Joined"],
                    "Postnummer": db_row["Overformyndare_Postnummer_Joined"],
                    "Postort": db_row["Overformyndare_Postort_Joined"],
                }
            
            list_tables_config = {
            # (data_key, table_name, columns, extra_where_cond, is_year_specific_flag)
            "bankkontonStart": ("HuvudmanBankkonton", ["RadNr", "Beskrivning", "Kronor", "BilagaRef", "OFnot"], {"Typ": "StartPeriod"}, False), # NYTT: False
            "bankkontonSlut": ("HuvudmanBankkonton", ["RadNr", "Beskrivning", "Kronor", "BilagaRef", "OFnot"], {"Typ": "SlutPeriod"}, False),    # NYTT: False
            "ovrigaTillgangarStart": ("HuvudmanOvrigaTillgangar", ["RadNr", "Beskrivning", "Andelar", "Kronor", "BilagaRef", "OFnot"], {"Typ": "StartPeriod"}, False), # NYTT: False
            "ovrigaTillgangarSlut": ("HuvudmanOvrigaTillgangar", ["RadNr", "Beskrivning", "Andelar", "Kronor", "BilagaRef", "OFnot"], {"Typ": "SlutPeriod"}, False), # NYTT: False
            "skulder": ("HuvudmanSkulder", ["RadNr", "Langivare", "BilagaRef", "StartBelopp", "SlutBelopp"], None, False), # NYTT: False
            "arsrakningPoster": ("HuvudmanArsrakningPoster", ["PostKod", "BilagaRef", "OFnotRef"], None, True) # Denna är fortfarande årsspecifik
        }

        for data_key, (table_name, columns, extra_where_cond, is_year_specific_list) in list_tables_config.items(): # Lade till is_year_specific_list
            try:
                actual_table_columns = _get_table_columns(conn, table_name)
                select_list_cols = ", ".join([f'"{c}"' for c in columns if c in actual_table_columns])
                if not select_list_cols:
                    logger.warning(f"Inga kolumner att selektera för lista '{data_key}' (tabell '{table_name}'). Sätter till tom lista.")
                    data_for_js[data_key] = []
                    continue

                where_clauses = ['"HuvudmanPnr"=?']
                query_params = [personnummer]

                if is_year_specific_list: # ANVÄND FLAGGAN
                    if "ArsrakningAr" in actual_table_columns:
                        where_clauses.append('"ArsrakningAr"=?')
                        query_params.append(year)
                    elif year is not None: # Om year är relevant men kolumnen saknas
                        logger.warning(f"Lista '{data_key}' (tabell '{table_name}') är markerad som årsspecifik men saknar 'ArsrakningAr'-kolumn. Ignorerar årsvillkor.")
                # Om inte is_year_specific_list, läggs inte ArsrakningAr till i WHERE

                if extra_where_cond:
                    for col, val in extra_where_cond.items():
                        if col in actual_table_columns:
                            where_clauses.append(f'"{col}"=?')
                            query_params.append(val)
                        else:
                            logger.warning(f"Extra WHERE-kolumn '{col}' för lista '{data_key}' (tabell '{table_name}') finns inte. Ignoreras.")

                order_by_clause = 'ORDER BY "RadNr"' if "RadNr" in actual_table_columns else ""
                list_sql = f"SELECT {select_list_cols} FROM \"{table_name}\" WHERE {' AND '.join(where_clauses)} {order_by_clause}" # Tabellnamn inom citationstecken
                logger.debug(f"SQL för lista '{data_key}': {list_sql} med params: {query_params}")
                cur = conn.execute(list_sql, tuple(query_params))
                data_for_js[data_key] = [dict(r_list) for r_list in cur.fetchall()]
                logger.debug(f"Hämtade {len(data_for_js[data_key])} rader för lista '{data_key}'.")
            except sqlite3.OperationalError as e_op_list:
                logger.warning(f"Tabellen '{table_name}' för listan '{data_key}' saknas eller har problem: {e_op_list}")
                data_for_js[data_key] = []
        return jsonify(data_for_js)

    except Exception as e:
        logger.error(f"Allmänt fel i get_huvudman_full_details för Pnr: {personnummer}, År: {year}", exc_info=True) 
        return jsonify({"error": f"Serverfel: {str(e)}"}), 500

JS_PASCAL_TO_DB_UPPER_MAP = {
    "Personnummer": "PERSONNUMMER",                 
    "Fornamn": "FORNAMN",
    "Efternamn": "EFTERNAMN",
    "HeltNamn": "HELT_NAMN",
    "Adress": "ADRESS",
    "Postnummer": "POSTNUMMER",
    "Ort": "ORT",
    "Vistelseadress": "VISTELSEADRESS",
    "Vistelsepostnr": "VISTELSEPOSTNR",
    "Vistelseort": "VISTELSEORT",
    "Telefon": "TELEFON",
    "Mobil": "MOBIL",
    "Epost": "EPOST",
    "Medborgarskap": "MEDBORGARSKAP",
    "Civilstand": "CIVILSTAND",
    "Sammanboende": "SAMMANBOENDE",                 
    "MedsokandeFornamn": "MEDSOKANDE_FORNAMN",
    "MedsokandeEfternamn": "MEDSOKANDE_EFTERNAMN",
    "MedsokandePersonnummer": "MEDSOKANDE_PERSONNUMMER",
    "MedsokandeMedborgarskap": "MEDSOKANDE_MEDBORGARSKAP",
    "MedsokandeCivilstand": "MEDSOKANDE_CIVILSTAND",
    "MedsokandeSysselsattning": "MEDSOKANDE_SYSSELSATTNING",
    "Clearingnummer": "CLEARINGNUMMER",
    "Kontonummer": "KONTONUMMER",
    "Banknamn": "BANKNAMN",
    "OverformyndareId": "OVERFORMYNDARE_ID",      
    "BoendeNamn": "BOENDE_NAMN",
    "BostadTyp": "BOSTAD_TYP",
    "BostadAntalRum": "BOSTAD_ANTAL_RUM", # Korrigerat från BOSTAD_ANTAL__RUM
    "BostadAntalBoende": "BOSTAD_ANTAL_BOENDE",
    "BostadKontraktstid": "BOSTAD_KONTRAKTSTID",
    "Sysselsattning": "SYSSELSATTNING",
    "Inkomsttyp": "INKOMSTTYP",
    "DeklareratStatus": "DEKLARERAT_STATUS",
    "ArvodeUtbetaltStatus": "ARVODE_UTBETALT_STATUS", 
    "MerkostnadsersattningStatus": "MERKOSTNADSERSTATTNING_STATUS", 
    "ArsrOvrigaUpplysningar": "ARSR_OVRIGA_UPPLYSNINGAR",
    "ErsattningAnnanMyndighetStatus": "ERSATTNING_ANNAN_MYNDIGHET_STATUS", 
    "ErsattningAnnanMyndighetFran": "ERSATTNING_ANNAN_MYNDIGHET_FRAN",
    "Hyra": "HYRA",
    "ElKostnad": "EL_KOSTNAD",
    "FackAvgiftAkassa": "FACK_AVGIFT_AKASSA",
    "Reskostnader": "RESKOSTNADER",
    "Hemforsakring": "HEMFORSAKRING",
    "MedicinKostnad": "MEDICIN_KOSTNAD",
    "Lakarvardskostnad": "LAKARVARDSKOSTNAD",
    "BarnomsorgAvgift": "BARNOMSORG_AVGIFT",
    "FardtjanstAvgift": "FARDTJANST_AVGIFT",
    "AkutTandvardskostnad": "AKUT_TANDVARDSKOSTNAD",
    "Bredband": "BREDBAND",
    "OvrigKostnadBeskrivning": "OVRIG_KOSTNAD_BESKRIVNING",
    "OvrigKostnadBelopp": "OVRIG_KOSTNAD_BELOPP",
    "Arbetsloshetsersattning": "ARBETSLOSHETSERSTATTNING",
    "AvtalsforsakringAfa": "AVTALSFOrSAKRING_AFA", 
    "BarnbidragStudiebidrag": "BARNBIDRAG_STUDIEBIDRAG",
    "Bostadsbidrag": "BOSTADSBIDRAG",
    "Etableringsersattning": "ETABLERINGSERSATTNING",
    "BarnsInkomst": "BARNS_INKOMST",
    "HyresintaktInneboende": "HYRESINTAKT_INNEBOENDE",
    "Lon": "LON",
    "PensionLivrantaSjukAktivitet": "PENSION_LIVRANTA_SJUK_AKTIVITET",
    "SjukpenningForaldrapenning": "SJUKPENNING_FORALDRAPENNING",
    "Skatteaterbaring": "SKATTEATERBARING",
    "Studiemedel": "STUDIEMEDEL",
    "UnderhallsstodEfterlevandepension": "UNDERHALLSSTOD_EFTERLEVANDEPENSION", # Korrigerat från AFTERLEVANDEPENSION
    "VantadInkomstBeskrivning": "VANTAD_INKOMST_BESKRIVNING",
    "VantadInkomstBelopp": "VANTAD_INKOMST_BELOPP",
    "OvrigInkomstBeskrivning": "OVRIG_INKOMST_BESKRIVNING",
    "OvrigInkomstBelopp": "OVRIG_INKOMST_BELOPP",
    "TillgangBankmedelVarde": "TILLGANG_BANKMEDEL_VARDE",
    "TillgangBostadsrattFastighetVarde": "TILLGANG_BOSTADSRATT_FASTIGHET_VARDE",
    "TillgangFordonMMVarde": "TILLGANG_FORDON_MM_VARDE",
    "SkuldKfmVarde": "SKULD_KFM_VARDE",
    "ForordnandeDatum": "FORORDNANDE_DATUM",
    "SaldoRakningskontoForordnande": "SALDO_RAKNINGSKONTO_FORORDNANDE"
}

@app.route("/api/huvudman/<personnummer>/details/<int:year>", methods=["PUT", "POST"])
def save_huvudman_full_details(personnummer: str, year: int):
    logger.debug(f"--- START save_huvudman_full_details för Pnr: {personnummer}, År: {year}, Metod: {request.method} ---")
    try:
        payload = request.get_json(force=True) or {}
        logger.debug(f"Mottagen payload (första 500 tecken): {str(payload)[:500]}...") 

        with get_db_connection() as conn:
            logger.debug("Databaskoppling öppnad.")
            
            details_from_js = payload.get("huvudmanDetails", {}) 
            if details_from_js:
                logger.debug(f"Huvudman-detaljer (från JS) att försöka spara: {details_from_js}")
                
                db_columns_in_huvudman_table = []
                try:
                    db_columns_in_huvudman_table = _get_table_columns(conn, "huvudman") 
                except Exception as e_get_cols:
                    logger.error(f"Kunde inte hämta kolumner för 'huvudman': {e_get_cols}")
                    return jsonify({"error": f"Internt serverfel: kunde inte verifiera tabelstruktur."}), 500
                
                logger.debug(f"Tillgängliga DB-kolumner i 'huvudman': {db_columns_in_huvudman_table}")

                set_sql_parts = []
                values_for_update = []

                for js_key, value_from_js in details_from_js.items():
                    db_column_name = JS_PASCAL_TO_DB_UPPER_MAP.get(js_key)
                    logger.debug(f"Bearbetar js_key: '{js_key}', mappad till db_column: '{db_column_name}', värde från JS: {value_from_js} (typ: {type(value_from_js)})")
                    
                    if db_column_name and db_column_name in db_columns_in_huvudman_table and db_column_name != "PERSONNUMMER":
                        set_sql_parts.append(f'"{db_column_name}"=?') 
                        values_for_update.append(value_from_js)
                        logger.debug(f"  LÄGGER TILL FÖR UPDATE: DB-kolumn='{db_column_name}', Värde='{value_from_js}'")
                    elif js_key != "Personnummer": 
                        potential_db_col_direct = js_key.upper() 
                        if potential_db_col_direct in db_columns_in_huvudman_table:
                             logger.warning(f"Nyckel '{js_key}' från JS payload finns som '{potential_db_col_direct}' i DB men saknas/felar i JS_PASCAL_TO_DB_UPPER_MAP.")
                        else:
                             logger.warning(f"Nyckel '{js_key}' från JS payload mappades INTE korrekt via JS_PASCAL_TO_DB_UPPER_MAP eller är inte en giltig DB-kolumn ('{db_column_name}').")

                if not set_sql_parts:
                    logger.warning("Inga giltiga fält att uppdatera i huvudman-tabellen från payload (set_sql_parts är tom).")
                else:
                    set_sql_string = ", ".join(set_sql_parts)
                    final_values_for_update = tuple(values_for_update + [personnummer]) 
                    
                    update_sql_query = f'UPDATE "huvudman" SET {set_sql_string} WHERE "PERSONNUMMER"=?' 
                    logger.debug(f"SQL för UPDATE huvudman: {update_sql_query}")
                    logger.debug(f"Värden för UPDATE huvudman: {final_values_for_update}")
                    try:
                        conn.execute(update_sql_query, final_values_for_update)
                        logger.debug("UPDATE huvudman utförd.")
                    except sqlite3.Error as sql_update_error:
                        logger.error(f"Fel vid körning av UPDATE huvudman: {sql_update_error}", exc_info=True)
                        logger.error(f"SQL-fråga som misslyckades: {update_sql_query}")
                        logger.error(f"Värden som användes: {final_values_for_update}")
            
            # Hantering av listtabeller (om det är en PUT och listor finns i payload)
            if request.method == 'PUT':
                logger.debug("Hanterar listtabeller (om de finns i payload).")
                # (payload_key, table_name, extra_where, is_year_specific_flag)
                list_save_config = [
                    ("bankkontonStart", "HuvudmanBankkonton", {"Typ": "StartPeriod"}, False), # NYTT: False
                    ("bankkontonSlut", "HuvudmanBankkonton", {"Typ": "SlutPeriod"}, False),    # NYTT: False
                    ("ovrigaTillgangarStart", "HuvudmanOvrigaTillgangar", {"Typ": "StartPeriod"}, False), # NYTT: False
                    ("ovrigaTillgangarSlut", "HuvudmanOvrigaTillgangar", {"Typ": "SlutPeriod"}, False), # NYTT: False
                    ("skulder", "HuvudmanSkulder", None, False), # NYTT: False
                    ("arsrakningPoster", "HuvudmanArsrakningPoster", None, True) # Denna är fortfarande årsspecifik
                ]
                for payload_key, table_name, extra_where, is_year_specific_save in list_save_config: # Lade till is_year_specific_save
                    if payload_key in payload:
                        try:
                            list_data = payload.get(payload_key, [])
                            # Skicka med den nya flaggan till _replace_list
                            # För icke-årsspecifika listor kan 'year' vara None eller så ignorerar _replace_list den
                            year_for_list = year if is_year_specific_save else None
                            _replace_list(conn, table_name, personnummer, year_for_list, list_data, extra_where, is_year_specific=is_year_specific_save)
                            logger.debug(f"Listan '{payload_key}' (tabell {table_name}) har uppdaterats (årsspecifik: {is_year_specific_save}).")
                        except Exception as list_e:
                            logger.error(f"Fel vid hantering av lista {payload_key} (tabell {table_name}): {list_e}", exc_info=True)            
            conn.commit()
            logger.debug("Commit utförd. Svarar med status ok.")
            return jsonify({"status": "ok", "message": "Huvudmansdetaljer sparade!"})

    except sqlite3.Error as db_err: 
        logger.error(f"SQLite-fel i save_huvudman_full_details: {db_err}", exc_info=True)
        if 'conn' in locals() and conn: 
            try:
                conn.rollback()
                logger.info("Transaktion rullades tillbaka på grund av SQLite-fel.")
            except Exception as rb_err:
                logger.error(f"Fel vid försök att rulla tillbaka transaktion: {rb_err}")
        return jsonify({"error": f"Databasfel: {str(db_err)}"}), 500
    except Exception as e:
        logger.error(f"Allmänt fel i save_huvudman_full_details: {e}", exc_info=True)
        if 'conn' in locals() and conn: 
            try:
                conn.rollback()
                logger.info("Transaktion rullades tillbaka på grund av allmänt fel.")
            except Exception as rb_err:
                logger.error(f"Fel vid försök att rulla tillbaka transaktion: {rb_err}")
        return jsonify({"error": f"Serverfel: {str(e)}"}), 500
# --- API Endpoints: Kategoriseringsregler ---
@app.route('/api/rules', methods=['GET'])
def get_rules():
    logger.debug("--- API '/api/rules' (GET) anropad ---")
    try:
        # Kolumnerna här måste matcha de i din CREATE TABLE Kategoriregler
        # ID, MatchningsTyp, MatchningsText, Kategori, Prioritet
        rules_from_db = _safe_select_all("Kategoriregler", ["ID", "MatchningsTyp", "MatchningsText", "Kategori", "Prioritet"]) # ÄNDRAT HÄR
        
        logger.debug(f"Regler direkt från _safe_select_all (för tabell Kategoriregler): {rules_from_db}")

        if rules_from_db is None: 
            logger.error("get_rules: _safe_select_all returnerade None.")
            return jsonify({"error": "Internt serverfel vid hämtning av regler."}), 500
        
        rules_to_send = [dict(rule) for rule in rules_from_db]

        for rule in rules_to_send:
            if 'Kategori' in rule and rule['Kategori'] is not None:
                rule['Kategori'] = str(rule['Kategori'])
            elif 'Kategori' not in rule or rule['Kategori'] is None:
                 logger.warning(f"Regel ID {rule.get('ID')} saknar Kategori eller är None, sätts till tom sträng.")
                 rule['Kategori'] = ""

            if 'Prioritet' in rule and rule['Prioritet'] is None:
                rule['Prioritet'] = 0 
            elif 'Prioritet' not in rule:
                 rule['Prioritet'] = 0
            elif 'Prioritet' in rule and not isinstance(rule['Prioritet'], int):
                try:
                    rule['Prioritet'] = int(rule['Prioritet'])
                except (ValueError, TypeError):
                    logger.warning(f"Kunde inte konvertera Prioritet '{rule['Prioritet']}' till int för regel ID {rule.get('ID')}. Sätts till 0.")
                    rule['Prioritet'] = 0
        
        logger.debug(f"Regler som ska skickas till klienten (efter bearbetning): {rules_to_send}")
        return jsonify(rules_to_send)
    except Exception as e:
        logger.error(f"Fel i get_rules: {e}", exc_info=True)
        return jsonify({"error": f"Kunde inte hämta regler: {str(e)}"}), 500

@app.route('/api/rules', methods=['POST'])
def create_rule():
    logger.debug("--- API '/api/rules' (POST) anropad ---")
    data = request.get_json(force=True) or {}
    # Läs från JSON med de nycklar som JavaScript skickar
    # JavaScript-modalen använder troligen id:n som matchar databasens kolumnnamn
    # så vi förväntar oss MatchningsTyp och MatchningsText här.
    match_typ = data.get('MatchningsTyp')      # ÄNDRAT från 'matchtyp'
    match_text = data.get('MatchningsText')    # ÄNDRAT från 'matchtext'
    kategori = data.get('Kategori')            # ÄNDRAT från 'kategori'
    prioritet = data.get('Prioritet', 0)       # ÄNDRAT från 'prioritet', default till 0

    if not match_typ or not match_text or not kategori:
        # Anpassa felmeddelandet om det behövs
        return jsonify({'error': 'MatchningsTyp, MatchningsText och Kategori måste anges'}), 400
    
    try:
        with get_db_connection() as conn:
            cursor = conn.execute(
                # Använd de korrekta kolumnnamnen för databasen
                "INSERT INTO Kategoriregler (MatchningsTyp, MatchningsText, Kategori, Prioritet) VALUES (?, ?, ?, ?)",
                (match_typ, match_text, kategori, prioritet)
            )
            conn.commit()
            new_id = cursor.lastrowid
            logger.info(f"Ny regel skapad med ID: {new_id} i tabellen Kategoriregler.")
            # Skicka tillbaka datan med de nycklar som JS förväntar sig (stora bokstäver)
            return jsonify({
                'message': 'Regel tillagd!', 
                'id': new_id, 
                'rule': { # Skicka tillbaka den skapade regeln så JS kan uppdatera sin cache om det behövs
                    'ID': new_id,
                    'MatchningsTyp': match_typ,
                    'MatchningsText': match_text,
                    'Kategori': kategori,
                    'Prioritet': prioritet
                }
            }), 201
    except sqlite3.Error as e:
        logger.error(f"SQLite-fel vid skapande av regel i Kategoriregler: {e}", exc_info=True)
        return jsonify({'error': f'Databasfel: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Allmänt fel vid skapande av regel i Kategoriregler: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/rules/<int:rule_id>', methods=['PUT'])
def update_rule(rule_id):
    logger.debug(f"--- API '/api/rules/{rule_id}' (PUT) anropad ---")
    data = request.get_json(force=True) or {}
    # Läs från JSON med de nycklar som JavaScript skickar
    match_typ = data.get('MatchningsTyp')      # ÄNDRAT från 'matchtyp'
    match_text = data.get('MatchningsText')    # ÄNDRAT från 'matchtext'
    kategori = data.get('Kategori')            # ÄNDRAT från 'kategori'
    prioritet = data.get('Prioritet', 0)       # ÄNDRAT från 'prioritet'

    if not match_typ or not match_text or not kategori:
        # Anpassa felmeddelandet
        return jsonify({'error': 'MatchningsTyp, MatchningsText och Kategori måste anges'}), 400

    try:
        with get_db_connection() as conn:
            # Använd de korrekta kolumnnamnen för databasen
            conn.execute(
                "UPDATE Kategoriregler SET MatchningsTyp=?, MatchningsText=?, Kategori=?, Prioritet=? WHERE ID=?",
                (match_typ, match_text, kategori, prioritet, rule_id)
            )
            conn.commit()
            if conn.total_changes == 0:
                logger.warning(f"Ingen regel uppdaterad för ID: {rule_id} i Kategoriregler (kanske finns inte).")
                return jsonify({'error': 'Regel hittades inte för uppdatering'}), 404
            logger.info(f"Regel med ID {rule_id} uppdaterad i Kategoriregler.")
            # Skicka tillbaka den uppdaterade regeln
            return jsonify({
                'message': 'Regel uppdaterad!',
                'rule': {
                    'ID': rule_id,
                    'MatchningsTyp': match_typ,
                    'MatchningsText': match_text,
                    'Kategori': kategori,
                    'Prioritet': prioritet
                }
            })
    except sqlite3.Error as e:
        logger.error(f"SQLite-fel vid uppdatering av regel {rule_id} i Kategoriregler: {e}", exc_info=True)
        return jsonify({'error': f'Databasfel: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Allmänt fel vid uppdatering av regel {rule_id} i Kategoriregler: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
@app.route('/api/rules/<int:rule_id>', methods=['DELETE'])
def delete_rule(rule_id):
    logger.debug(f"--- API '/api/rules/{rule_id}' (DELETE) anropad ---")
    try:
        with get_db_connection() as conn:
            conn.execute("DELETE FROM Kategoriregler WHERE ID=?", (rule_id,)) # ÄNDRAT HÄR
            conn.commit()
            if conn.total_changes == 0:
                logger.warning(f"Ingen regel raderad för ID: {rule_id} i Kategoriregler (kanske finns inte).")
                return jsonify({'error': 'Regel hittades inte för radering'}), 404
            logger.info(f"Regel med ID {rule_id} raderad från Kategoriregler.")
            return jsonify({'message': 'Regel borttagen!'})
    except sqlite3.Error as e:
        logger.error(f"SQLite-fel vid radering av regel {rule_id} i Kategoriregler: {e}", exc_info=True)
        return jsonify({'error': f'Databasfel: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Allmänt fel vid radering av regel {rule_id} i Kategoriregler: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
        
def init_db(): # Byt namn för tydlighet om du vill
    logger.debug("--- init_db_temporar_for_list_tabeller anropad: Skapar list-databastabeller ---")
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS HuvudmanBankkonton (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            HuvudmanPnr TEXT NOT NULL,
            ArsrakningAr INTEGER NOT NULL,
            Typ TEXT NOT NULL,
            RadNr INTEGER NOT NULL,
            Beskrivning TEXT,
            Kronor REAL DEFAULT 0.0,
            BilagaRef TEXT,
            OFnot TEXT,
            FOREIGN KEY (HuvudmanPnr) REFERENCES huvudman(PERSONNUMMER) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS HuvudmanOvrigaTillgangar (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            HuvudmanPnr TEXT NOT NULL,
            ArsrakningAr INTEGER NOT NULL,
            Typ TEXT NOT NULL,
            RadNr INTEGER NOT NULL,
            Beskrivning TEXT,
            Andelar TEXT,
            Kronor REAL DEFAULT 0.0,
            BilagaRef TEXT,
            OFnot TEXT,
            FOREIGN KEY (HuvudmanPnr) REFERENCES huvudman(PERSONNUMMER) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS HuvudmanSkulder (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            HuvudmanPnr TEXT NOT NULL,
            ArsrakningAr INTEGER NOT NULL,
            RadNr INTEGER NOT NULL,
            Langivare TEXT,
            BilagaRef TEXT,
            StartBelopp REAL DEFAULT 0.0,
            SlutBelopp REAL DEFAULT 0.0,
            FOREIGN KEY (HuvudmanPnr) REFERENCES huvudman(PERSONNUMMER) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS HuvudmanArsrakningPoster (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            HuvudmanPnr TEXT NOT NULL,
            ArsrakningAr INTEGER NOT NULL,
            PostKod TEXT NOT NULL,
            Summa REAL, 
            BilagaRef TEXT,
            OFnotRef TEXT,
            UNIQUE (HuvudmanPnr, ArsrakningAr, PostKod),
            FOREIGN KEY (HuvudmanPnr) REFERENCES huvudman(PERSONNUMMER) ON DELETE CASCADE
        )
    """)
    conn.commit()
    conn.close()
    logger.debug("--- init_db ---")

if __name__ == '__main__':
    # init_db() # Om du har denna
    ensure_nordea_screenshots_dir() # Skapa mappen vid start om den inte finns
    logger.debug("--- Startar Flask-servern (integrerad med Nordea) ---")
    app.run(debug=True, host="0.0.0.0") # host="0.0.0.0" om du vill nå den från nätverket
    logger.debug("--- Servern har avslutats. ---")