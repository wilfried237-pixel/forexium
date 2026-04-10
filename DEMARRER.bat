@echo off
title FOREXIUM v5.6.0 - Lancement
color 0A

echo.
echo  ==========================================
echo   FOREXIUM v5.6.0  -  Demarrage...
echo  ==========================================
echo.

:: Lancer le backend dans une nouvelle fenetre
echo  [1/2] Lancement du backend (port 3000)...
start "FOREXIUM - Backend" cmd /k "cd /d %~dp0backend && node server.js"

:: Attendre 2 secondes que le backend demarre
timeout /t 2 /nobreak > nul

:: Lancer le frontend dans une nouvelle fenetre
echo  [2/2] Lancement du frontend (port 5173)...
start "FOREXIUM - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo  ==========================================
echo   Les deux serveurs sont en cours de
echo   lancement dans des fenetres separees.
echo.
echo   Application : http://localhost:5173
echo   API Backend  : http://localhost:3000
echo  ==========================================
echo.
pause
