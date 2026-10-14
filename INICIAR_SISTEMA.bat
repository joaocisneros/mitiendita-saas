@echo off
setlocal
title Iniciar MiTiendita
cd /d "%~dp0"

echo Iniciando backend en http://localhost:8300 ...
pushd "%~dp0backend"
start "MiTiendita - Backend" cmd /k "call npm.cmd run start"
popd

echo Iniciando frontend en http://localhost:8301 ...
pushd "%~dp0frontend"
start "MiTiendita - Frontend" cmd /k "call npm.cmd run dev"
popd

echo Esperando que los servidores esten listos...
timeout /t 7 /nobreak >nul
start "" "http://localhost:8301/tienda/urban-style"

echo.
echo Sistema iniciado. No cierres las ventanas Backend y Frontend mientras lo uses.
timeout /t 4 /nobreak >nul
endlocal
