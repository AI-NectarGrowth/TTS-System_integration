@echo off
echo ========================================
echo 🎤 OpenAI Whisper Audio-to-Text App
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

REM Check if in correct directory
if not exist "backend\server.py" (
    echo ❌ Please run this script from the project root folder
    echo Current folder: %CD%
    pause
    exit /b 1
)

REM Check and install requirements
echo 📦 Checking Python dependencies...
pip install -r backend/requirements.txt >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r backend/requirements.txt
)

REM Setup .env if not exists
if not exist "backend\.env" (
    echo ⚠️  .env file not found. Creating template...
    echo # OpenAI API Key > backend\.env
    echo OPENAI_API_KEY=your_openai_api_key_here >> backend\.env
    echo. >> backend\.env
    echo # Backend Configuration >> backend\.env
    echo PORT=5000 >> backend\.env
    echo FLASK_ENV=development >> backend\.env
    echo. >> backend\.env
    echo # Ngrok Configuration (optional) >> backend\.env
    echo # NGROK_AUTH_TOKEN=your_ngrok_token_here >> backend\.env
    
    echo.
    echo ⚠️  IMPORTANT: Edit backend\.env and add your OpenAI API key!
    echo.
)

REM Start the application
echo 🚀 Starting application...
cd backend
python run.py

pause