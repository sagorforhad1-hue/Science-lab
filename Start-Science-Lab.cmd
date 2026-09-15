@echo off
setlocal
cd /d "%~dp0"
set "SL_NODE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined SL_NODE set "SL_NODE=%%N"
if not defined SL_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "SL_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined SL_NODE (
  echo Node.js is required. Install Node.js, then run this file again.
  pause
  exit /b 1
)
set "SL_ROOT=%~dp0"
powershell -NoProfile -Command "$ready=$false; try {$r=Invoke-WebRequest -Uri 'http://127.0.0.1:5173' -UseBasicParsing -TimeoutSec 2; $ready=$r.StatusCode -eq 200} catch {}; if(-not $ready){Start-Process -FilePath $env:SL_NODE -ArgumentList 'server.mjs' -WorkingDirectory $env:SL_ROOT -WindowStyle Hidden; Start-Sleep -Seconds 1}; Start-Process 'http://127.0.0.1:5173'"
endlocal
