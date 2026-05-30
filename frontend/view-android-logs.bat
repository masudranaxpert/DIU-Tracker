@echo off
setlocal EnableExtensions
cd /d "%~dp0"

REM Optional: set if multiple devices (from adb devices)
set "ADB_DEVICE="

echo.
echo ========================================
echo  DIU Tracker - live logs
echo  Keep this window open while using the app
echo  Ctrl+C to stop
echo ========================================
echo.

if defined ADB_DEVICE (
  adb -s %ADB_DEVICE% devices
) else (
  adb devices
)
echo.

echo Clearing old log buffer...
if defined ADB_DEVICE (
  adb -s %ADB_DEVICE% logcat -c
) else (
  adb logcat -c
)

echo.
echo --- App / WebView / crash lines below ---
echo.

if defined ADB_DEVICE (
  adb -s %ADB_DEVICE% logcat -v time Capacitor/Console:V chromium:V AndroidRuntime:E System.err:W *:S
) else (
  adb logcat -v time Capacitor/Console:V chromium:V AndroidRuntime:E System.err:W *:S
)

pause
