@echo off
rem Stops ANF Inventory (only ANF — never whatever else may use a port).
where node >nul 2>nul
if errorlevel 1 (
  start "" "%~dp0launcher\need-node.html"
  exit /b
)
node "%~dp0launcher\stop.mjs"
timeout /t 3 >nul
