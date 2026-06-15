@echo off
rem ANF Inventory launcher. Double-click to start.

rem Relaunch ourselves minimized once, so the work happens in a tidy minimized window.
if not "%~1"=="min" (
  start "ANF Inventory - keep this open" /min "%~f0" min
  exit /b
)

rem Node.js is the one prerequisite. If it's missing, show the friendly page and stop.
where node >nul 2>nul
if errorlevel 1 (
  start "" "%~dp0launcher\need-node.html"
  exit /b
)

rem Hand off to the Node orchestrator (install/build as needed, then start the server).
node "%~dp0launcher\launch.mjs"
if errorlevel 1 (
  echo.
  echo Setup did not finish. Please show this window to your helper, then try again.
  pause
)
