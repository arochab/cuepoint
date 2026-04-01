@echo off
REM launch-cycle.bat — entry point for Windows Task Scheduler
REM Finds Git Bash and runs cycle-runner.sh with full logging.
REM Do not run this manually — use: bash scripts/cycle-runner.sh

set REPO=%~dp0..
set LOGFILE=%REPO%\reports\cycle-runner.log

REM Try standard Git for Windows locations
set BASH=
if exist "C:\Program Files\Git\bin\bash.exe"       set BASH=C:\Program Files\Git\bin\bash.exe
if exist "C:\Program Files (x86)\Git\bin\bash.exe" set BASH=C:\Program Files (x86)\Git\bin\bash.exe

if "%BASH%"=="" (
  echo ERROR: Git Bash not found. Install Git for Windows. >> "%LOGFILE%"
  exit /b 1
)

echo. >> "%LOGFILE%"
echo ---- %DATE% %TIME% ---- >> "%LOGFILE%"
"%BASH%" --login "%REPO%\scripts\cycle-runner.sh" >> "%LOGFILE%" 2>&1
