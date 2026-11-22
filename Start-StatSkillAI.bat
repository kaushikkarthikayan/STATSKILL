@echo off
rem Starts the StatSkill AI API and the website in two windows, then opens the website.
rem Close the two windows to stop it.
set "ROOT=%~dp0"

start "StatSkill AI API" /d "%ROOT%backend" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "StatSkill AI website" /d "%ROOT%frontend" cmd /k "npm run dev"

timeout /t 6 /nobreak >nul
start "" http://127.0.0.1:5173
