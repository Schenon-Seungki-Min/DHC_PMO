@echo off
title DHC_PMO 서버
chcp 65001 > nul
echo.
echo  DHC_PMO - Thread-centric Project Management
echo  =============================================
echo.
echo  서버 시작 중...
cd /d "%~dp0"
start /min cmd /c "timeout /t 2 /nobreak > nul && start http://localhost:3000"
echo  서버 실행 중: http://localhost:3000
echo  종료: 이 창 닫기 or Ctrl+C
echo.
node server/server.js
