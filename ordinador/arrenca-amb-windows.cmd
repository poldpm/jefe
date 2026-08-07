@echo off
rem ==========================================================================
rem  JEFE - que l'ajudant s'engegui sol en encendre l'ordinador
rem
rem  Doble clic i ja esta. Per desfer-ho, torna-hi: pregunta.
rem
rem  QUE FA, EXACTAMENT: posa una drecera a la carpeta d'inici del teu usuari
rem  -la mateixa on pots anar amb Win+R i escrivint "shell:startup"-. Res mes.
rem  No toca el registre, no demana permisos d'administrador i no instal-la
rem  cap servei: son tres coses que costen d'entendre, de veure i de desfer,
rem  i aqui no calen. Si algun dia no saps que hi ha, obre aquella carpeta i
rem  ho veuras.
rem
rem  S'OBRE MINIMITZADA. No amagada: si un dia peta, has de poder-ho veure a
rem  la barra de tasques. Una finestra invisible que s'ha mort es exactament
rem  igual que una que mai no s'ha obert.
rem ==========================================================================

setlocal
title JEFE - arrencar amb Windows

set "INICI=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "DRECERA=%INICI%\JEFE - ajudant.lnk"
set "ORIGEN=%~dp0engega.cmd"

if not exist "%ORIGEN%" (
  echo.
  echo   No trobo engega.cmd al costat d'aquest fitxer.
  echo   Els dos han d'anar junts a la mateixa carpeta.
  echo.
  pause
  exit /b 1
)

if not exist "%DRECERA%" goto :posar

rem  SENSE PARENTESIS AL VOLTANT DEL `set /p`, i es una trampa clasica del
rem  cmd: dins d'un bloc entre parentesis, TOTES les variables es substitueixen
rem  quan es llegeix el bloc, o sigui abans que `set /p` hagi preguntat res.
rem  Amb la pregunta i el `if` dins del mateix bloc, la resposta era sempre la
rem  d'abans -buida- i deia "no s'ha tocat res" tant si contestaves si com no.
rem  Provat: passava.
echo.
echo   Ara mateix JEFE JA s'engega sol en encendre l'ordinador.
echo.
set "RESP="
set /p RESP="   Vols treure-ho? (s/n): "
if /i not "%RESP%"=="s" goto :nores
del "%DRECERA%"
echo.
echo   Fet: ja no s'engegara sol. L'hauras d'obrir tu amb engega.cmd.
echo.
pause
exit /b 0

:nores
echo.
echo   No s'ha tocat res.
echo.
pause
exit /b 0

:posar

rem  La drecera es fa amb PowerShell perque un .lnk es un fitxer binari de
rem  Windows i no es pot escriure amb echo. WindowStyle 7 vol dir minimitzada.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('%DRECERA%');" ^
  "$s.TargetPath = '%ORIGEN%';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.WindowStyle = 7;" ^
  "$s.Description = 'Ajudant de JEFE: deixa que JEFE obri webs i documents en aquest ordinador';" ^
  "$s.Save()"

if not exist "%DRECERA%" (
  echo.
  echo   No he pogut crear la drecera.
  echo   Prova-ho obrint la carpeta d'inici a ma: Win+R, "shell:startup",
  echo   i copia-hi una drecera a engega.cmd.
  echo.
  pause
  exit /b 1
)

echo.
echo   FET. A partir d'ara JEFE s'engegara sol en encendre l'ordinador,
echo   minimitzat a la barra de tasques.
echo.
echo   La drecera es aqui, per si algun dia la vols treure a ma:
echo   %INICI%
echo.
echo   Torna a executar aquest fitxer per desfer-ho.
echo.

set /p ARA="   Vols engegar-lo ara? (s/n): "
if /i "%ARA%"=="s" start "" "%ORIGEN%"

endlocal
