@echo off
rem Stops ANF Inventory if it is running (frees port 4000).
set "found="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":4000 .*LISTENING"') do (
  taskkill /PID %%p /T /F >nul 2>nul
  set "found=1"
)
if defined found (echo ANF Inventory has been stopped.) else (echo ANF Inventory was not running.)
timeout /t 3 >nul
