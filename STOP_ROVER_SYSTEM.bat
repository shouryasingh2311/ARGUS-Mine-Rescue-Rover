@echo off
title RESCUE ROVER C2 - SYSTEM SHUTDOWN
color 0C
cd /d "%~dp0"

echo ====================================================================
echo   STOPPING RESCUE ROVER C2 SERVICES...
echo ====================================================================
echo.

:: Detect Python executable
set "PYTHON_CMD="
py -3.10 --version >nul 2>nul
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py -3.10"
) else (
    if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
        set "PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python310\python.exe""
    ) else (
        set "PYTHON_CMD=python"
    )
)

echo [*] Freeing ports 8080 and 8081...
if exist "%~dp0kill_ports.py" (
    %PYTHON_CMD% "%~dp0kill_ports.py"
)

echo [*] Closing dedicated server console windows...
taskkill /F /FI "WINDOWTITLE eq Rover C2 - *" >nul 2>nul

echo.
echo [+] All Rover C2 services successfully stopped.
echo.
timeout /t 2 >nul
