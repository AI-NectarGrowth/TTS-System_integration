@echo off
echo ============================================================
echo Starting OpenAI Whisper Audio-to-Text Application
echo ============================================================
echo.

cd /d "%~dp0backend"

if not exist "venv\Scripts\activate.bat" (
    echo Virtual environment not found!
    echo Please run: python -m venv venv
    pause
    exit /b 1
)

call venv\Scripts\activate

echo Starting Flask server on http://localhost:5000...
echo.
echo Press Ctrl+C to stop the server
echo ============================================================
echo.

python server.py

pause
