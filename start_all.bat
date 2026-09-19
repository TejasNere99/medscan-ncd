@echo off
title MedScan-NCD - Start All Services
color 0A

echo.
echo  ========================================================
echo    MEDSCAN-NCD - Starting All 3 Services
echo  ========================================================
echo.

echo  [1/3] Starting Python ML Service (Port 8000)...
start "MedScan ML Service - Port 8000" cmd /k "cd /d "%~dp0ml_model\service" && python -m uvicorn app:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo  [2/3] Starting Node.js Backend (Port 5000)...
start "MedScan Backend - Port 5000" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 2 /nobreak >nul

echo  [3/3] Starting React Frontend (Port 5173)...
start "MedScan Frontend - Port 5173" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo  ========================================================
echo    All 3 services starting in separate windows!
echo.
echo    Frontend  : http://localhost:5173
echo    Backend   : http://localhost:5000
echo    ML Service: http://localhost:8000
echo  ========================================================
echo.
pause
