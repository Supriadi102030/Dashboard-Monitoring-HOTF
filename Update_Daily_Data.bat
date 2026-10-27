@echo off
cd /d "%~dp0"
python -m pip install --upgrade pandas numpy openpyxl
python update_daily.py
pause
