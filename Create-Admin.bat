@echo off
rem Creates the first administrator, or promotes an existing account. The password is typed hidden.
set "ROOT=%~dp0"
cd /d "%ROOT%backend"
.venv\Scripts\python.exe scripts\create_admin.py
echo.
pause
