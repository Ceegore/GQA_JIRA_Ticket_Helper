@echo off
setlocal
cd /d "%~dp0\.."
node tools\preflight.cjs %*
set EXITCODE=%ERRORLEVEL%
echo.
if not "%EXITCODE%"=="0" (
  echo Preflight FAILED with exit code %EXITCODE%.
) else (
  echo Preflight completed successfully.
)
exit /b %EXITCODE%
