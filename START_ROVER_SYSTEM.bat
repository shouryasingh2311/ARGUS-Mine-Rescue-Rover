@echo off
title RESCUE ROVER C2 - MISSION CONTROL LAUNCHER
color 0B
cd /d "%~dp0"

echo ====================================================================
echo   RESCUE ROVER ALPHA-1 // TACTICAL COMMAND CENTER LAUNCHER
echo ====================================================================
echo.

:: 1. Check Node.js presence
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not found on PATH! Please install Node.js.
    pause
    exit /b 1
)

:: 2. Detect proper Python 3.10 executable (prefer py -3.10 / direct Python310 path)
set "PYTHON_CMD="
py -3.10 --version >nul 2>nul
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py -3.10"
) else (
    if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
        set "PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python310\python.exe""
    ) else (
        python --version >nul 2>nul
        if %errorlevel% equ 0 (
            set "PYTHON_CMD=python"
        ) else (
            color 0C
            echo [ERROR] Python 3.10 was not found! Please install Python.
            pause
            exit /b 1
        )
    )
)

echo [+] Node.js detected: OK
echo [+] Python runtime detected: %PYTHON_CMD%

:: 3. Clean up any stale Rover processes and ports 8080 and 8081 instantly
echo [*] Freeing ports 8080 and 8081...
taskkill /F /FI "WINDOWTITLE eq Rover C2 - *" >nul 2>nul
if exist "%~dp0kill_ports.py" (
    %PYTHON_CMD% "%~dp0kill_ports.py" >nul 2>nul
)
echo [+] Ports 8080 and 8081 are ready.

:: 4. Start Node.js Telemetry C2 Server in a dedicated window
echo [*] Starting Telemetry C2 Server on Port 8080...
start "Rover C2 - Node Server (Port 8080)" /d "%~dp0" cmd /k "color 0A && node server.js"

:: 5. Start GPU-Accelerated Vision Engine in a dedicated window
echo [*] Starting RTX 4050 GPU Vision Engine on Port 8081...
start /high "Rover C2 - Vision AI Engine (Port 8081)" /d "%~dp0" cmd /k "color 0E && %PYTHON_CMD% -u MINE_RESCUE_PRO.py"

:: 6. Wait briefly for services to bind ports
timeout /t 3 /nobreak >nul 2>nul || ping -n 4 127.0.0.1 >nul

:: 7. Launch Command Center Dashboard in GPU-accelerated Chrome (or default browser fallback)
echo [*] Opening Command Center Dashboard with GPU acceleration...
set "CHROME_EXE="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if defined CHROME_EXE (
    start "" "%CHROME_EXE%" --app="http://127.0.0.1:8080" --disable-backgrounding-occluded-windows --disable-background-timer-throttling --enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist
) else (
    start http://127.0.0.1:8080
)

echo.
echo ====================================================================
echo   SYSTEM LAUNCHED SUCCESSFULLY!
echo ====================================================================
echo   - C2 Mission Control Dashboard: http://127.0.0.1:8080
echo   - Mobile Sensor Override Panel: http://127.0.0.1:8080/controller.html
echo.
echo   [INFO] Keep the opened server windows running while operating.
echo   [INFO] To cleanly shut down all services, run STOP_ROVER_SYSTEM.bat
echo ====================================================================
echo.
pause
