@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Virtual environment not found.
  echo Create it with: py -3.12 -m venv .venv
  echo Then activate it and run: python -m pip install -r requirements.txt
  pause
  exit /b 1
)
".venv\Scripts\python.exe" -m uvicorn backend.main:app --reload
pause
