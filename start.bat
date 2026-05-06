@echo off
title Farvision CRM Launcher
echo ============================================
echo   Starting Farvision CRM
echo ============================================
echo.
echo Opening backend window...
start "Farvision Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak >nul
echo Opening frontend window...
start "Farvision Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 5 /nobreak >nul
echo.
echo ============================================
echo   Both servers starting...
echo   Backend:  http://localhost:4000
echo   Frontend: http://localhost:5173
echo ============================================
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173
echo.
echo Done. You can close this window.
echo The two server windows must stay open while you use the CRM.
timeout /t 5 /nobreak >nul
exit