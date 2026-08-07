@echo off
rem ==========================================================================
rem  JEFE - l'ajudant de l'ordinador
rem
rem  Doble clic i ja esta. Deixa la finestra oberta mentre el vulguis fer
rem  servir; per parar-ho, tanca-la o prem Ctrl+C.
rem
rem  Aixo existeix perque la comanda de debo demana saber on es el fitxer, i
rem  escriure-la cada dia des de la carpeta bona es exactament la mena de cosa
rem  que fa que una eina deixi de fer-se servir. `%~dp0` es la carpeta d'aquest
rem  fitxer: funciona tant si el crides des d'aqui com des de qualsevol lloc,
rem  i seguira funcionant si mous el projecte de carpeta.
rem
rem  SENSE ACCENTS EN AQUEST FITXER a posta: la consola de Windows no fa servir
rem  UTF-8 per defecte i els sortirien trencats just a les linies que has de
rem  llegir quan alguna cosa va malament.
rem ==========================================================================

title JEFE - ajudant de l'ordinador
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   No trobo Node.js en aquest ordinador.
  echo   Instal-la'l des de https://nodejs.org i torna-ho a provar.
  echo.
  pause
  exit /b 1
)

node "%~dp0jefe-ordinador.mjs"

rem  Si el programa acaba -perque ha petat o perque l'has aturat-, la finestra
rem  es queda oberta. Si es tanques sola, un error no arribaries a llegir-lo.
echo.
echo   L'ajudant s'ha aturat.
pause
