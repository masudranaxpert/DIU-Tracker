@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

REM --- Edit these if needed ---
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "VITE_API_URL=https://backend.instantcloud.site"
REM Leave empty when only one phone is connected; otherwise set serial from "adb devices"
set "ADB_DEVICE="
set "INSTALL_APK=1"
set "LAUNCH_APP=1"
REM ---------------------------

if not exist "%JAVA_HOME%\bin\java.exe" (
  echo ERROR: JAVA_HOME not found: %JAVA_HOME%
  echo Install JDK 21 or edit JAVA_HOME at the top of this file.
  pause
  exit /b 1
)

echo.
echo ========================================
echo  DIU Tracker - Android rebuild
echo ========================================
echo.

if not exist "package.json" (
  echo ERROR: Run this from the frontend folder.
  pause
  exit /b 1
)

echo API: %VITE_API_URL%
echo.

echo [1/5] npm run build
call npm run build
if errorlevel 1 goto :fail

echo.
echo [2/5] cap sync
call npm run cap-sync
if errorlevel 1 goto :fail

if not exist "android\gradlew.bat" (
  echo.
  echo Android folder missing. Adding platform...
  call npx cap add android
  if errorlevel 1 goto :fail
  call npm run cap-sync
  if errorlevel 1 goto :fail
)

echo.
echo [3/5] gradlew assembleDebug
pushd android
call gradlew.bat assembleDebug
set "GRADLE_ERR=%ERRORLEVEL%"
popd
if not "%GRADLE_ERR%"=="0" goto :fail

set "APK=android\app\build\outputs\apk\debug\app-debug.apk"
if not exist "%APK%" (
  echo ERROR: APK not found: %APK%
  goto :fail
)

echo.
echo Build OK: %APK%

if "%INSTALL_APK%"=="0" goto :done

echo.
echo [4/5] adb install
adb devices
echo.
if defined ADB_DEVICE (
  adb -s %ADB_DEVICE% install -r "%APK%"
) else (
  adb install -r "%APK%"
)
if errorlevel 1 (
  echo.
  echo Install failed. Connect phone ^(adb devices^) or set ADB_DEVICE in this .bat file.
  goto :fail
)

if "%LAUNCH_APP%"=="0" goto :done

echo.
echo [5/5] Launch app
if defined ADB_DEVICE (
  adb -s %ADB_DEVICE% shell am start -n com.diucse.academictracker/.MainActivity
) else (
  adb shell am start -n com.diucse.academictracker/.MainActivity
)

:done
echo.
echo ========================================
echo  Done.
echo ========================================
pause
exit /b 0

:fail
echo.
echo ========================================
echo  FAILED - see errors above.
echo ========================================
pause
exit /b 1
