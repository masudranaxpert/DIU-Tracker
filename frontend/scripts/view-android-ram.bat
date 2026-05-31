@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

REM Optional: set if multiple devices (from adb devices)
set "ADB_DEVICE="

echo.
echo ========================================
echo  DIU Tracker - RAM monitor
echo  Ctrl+C to stop
echo ========================================
echo.

if defined ADB_DEVICE (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0monitor-android-ram.ps1" -AdbDevice %ADB_DEVICE%
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0monitor-android-ram.ps1"
)

pause
