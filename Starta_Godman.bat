@echo off
echo Forbereder att starta servern...
cd /d "%~dp0"
REM %~dp0 expanderar till sökvägen för den aktuella .bat-filen

echo Startar Python-servern nu i detta fonster.
echo Tryck CTRL+C for att avsluta.

REM *** KÖR PYTHON APPEN DIREKT (UTAN VIRTUELL MILJÖ AKTIVERING) ***
python app.py

REM Lägg till PAUSE här så att fönstret inte stängs direkt om Python-skriptet avslutas
echo.
echo Servern har avslutats (eller kunde inte starta). Tryck valfri tangent för att stänga detta fönster.
PAUSE