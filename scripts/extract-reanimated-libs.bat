@echo off
echo ===================================================
echo Extracting React Native Reanimated native libraries
echo ===================================================

set PROJECT_DIR=%~dp0..
set REANIMATED_DIR=%PROJECT_DIR%\node_modules\react-native-reanimated
set OUTPUT_DIR=%PROJECT_DIR%\android\app\src\main\jniLibs

REM Create output directories
if not exist "%OUTPUT_DIR%\arm64-v8a" mkdir "%OUTPUT_DIR%\arm64-v8a"
if not exist "%OUTPUT_DIR%\armeabi-v7a" mkdir "%OUTPUT_DIR%\armeabi-v7a"
if not exist "%OUTPUT_DIR%\x86" mkdir "%OUTPUT_DIR%\x86"
if not exist "%OUTPUT_DIR%\x86_64" mkdir "%OUTPUT_DIR%\x86_64"

REM Extract prebuilt libraries from the AAR file
echo Extracting libraries from Reanimated...

REM Since we're working with a live project, grab the pre-built libraries from the release repo
echo Downloading pre-built libraries...
powershell -Command "& {$webClient = New-Object System.Net.WebClient; $webClient.DownloadFile('https://github.com/software-mansion/react-native-reanimated/releases/download/3.16.1/android-artifact.tar.gz', '%TEMP%\reanimated-libs.tar.gz')}"

echo Extracting libraries...
powershell -Command "& {cd '%TEMP%'; tar -xzf reanimated-libs.tar.gz}"

REM Copy libraries to the correct locations
echo Copying libraries to project...
if exist "%TEMP%\android-artifact\jni\arm64-v8a\libreanimated.so" (
  copy "%TEMP%\android-artifact\jni\arm64-v8a\libreanimated.so" "%OUTPUT_DIR%\arm64-v8a\" /Y
) else (
  echo Warning: arm64-v8a library not found
)

if exist "%TEMP%\android-artifact\jni\armeabi-v7a\libreanimated.so" (
  copy "%TEMP%\android-artifact\jni\armeabi-v7a\libreanimated.so" "%OUTPUT_DIR%\armeabi-v7a\" /Y
) else (
  echo Warning: armeabi-v7a library not found
)

if exist "%TEMP%\android-artifact\jni\x86\libreanimated.so" (
  copy "%TEMP%\android-artifact\jni\x86\libreanimated.so" "%OUTPUT_DIR%\x86\" /Y
) else (
  echo Warning: x86 library not found
)

if exist "%TEMP%\android-artifact\jni\x86_64\libreanimated.so" (
  copy "%TEMP%\android-artifact\jni\x86_64\libreanimated.so" "%OUTPUT_DIR%\x86_64\" /Y
) else (
  echo Warning: x86_64 library not found
)

REM Clean up
del "%TEMP%\reanimated-libs.tar.gz"
rmdir /S /Q "%TEMP%\android-artifact"

echo ===================================================
echo React Native Reanimated libraries extracted!
echo ===================================================
echo Now run "cd android && .\gradlew clean" and then rebuild your app.