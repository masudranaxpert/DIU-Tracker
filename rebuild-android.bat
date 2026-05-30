@echo off
cd /d "%~dp0frontend"
call "%~dp0frontend\rebuild-android.bat" %*
