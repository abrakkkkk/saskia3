@echo off
rem Abre o Painel TV do Saskia em tela cheia (modo quiosque) com o som liberado, sem precisar tocar na tela.
rem
rem Como usar na TV (ou no computador ligado a ela):
rem   1. Copie este arquivo para a area de trabalho e, se quiser, coloque um atalho em shell:startup
rem      (Win+R, digite shell:startup) para abrir sozinho quando o computador ligar.
rem   2. Se o sistema for outro endereco, troque a URL abaixo.
rem   3. Na primeira vez, entre com o usuario do painel (login do hospital). O perfil do Chrome fica salvo
rem      na pasta PerfilPainelTV, entao o login permanece depois de reiniciar.
rem   4. Para sair do modo quiosque: Alt+F4.
set "URL=https://saskia3.vercel.app/painel-chamadas"
set "PERFIL=%LOCALAPPDATA%\SaskiaPainelTV"

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not defined CHROME (
  echo Google Chrome nao encontrado. Instale o Chrome e tente de novo.
  pause
  exit /b 1
)

start "" "%CHROME%" --kiosk --user-data-dir="%PERFIL%" --autoplay-policy=no-user-gesture-required --no-first-run --disable-session-crashed-bubble --noerrdialogs "%URL%"
