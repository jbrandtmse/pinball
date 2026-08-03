@echo off
REM ---------------------------------------------------------------
REM  RAGNAROK PINBALL - launcher
REM  Starts the local server (if node is available) and opens Chrome.
REM ---------------------------------------------------------------
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
  echo Starting local server on http://localhost:8080 ...
  start "RAGNAROK server" cmd /c node serve.js 8080
  timeout /t 1 /nobreak >nul
  start "" http://localhost:8080
) else (
  echo Node not found - opening index.html directly.
  start "" "%~dp0index.html"
)
endlocal
