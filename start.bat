@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 goto error

if not exist ".venv\Scripts\python.exe" (
    where py >nul 2>nul
    if not errorlevel 1 (
        py -3 -m venv ".venv"
    ) else (
        where python >nul 2>nul
        if errorlevel 1 (
            echo Python 3 was not found. Install Python 3 and try again.
            goto error
        )
        python -m venv ".venv"
    )
    if errorlevel 1 goto error
)

".venv\Scripts\python.exe" -m pip install -r "requirements.txt"
if errorlevel 1 goto error

if not defined OPEN_BROWSER set "OPEN_BROWSER=1"
echo Starting Work Time Tracker at http://127.0.0.1:5000/
".venv\Scripts\python.exe" "run.py"
if errorlevel 1 goto error
exit /b 0

:error
echo.
echo Startup failed. Check the message above.
pause
exit /b 1
