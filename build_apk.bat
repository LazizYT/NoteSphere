@echo off
set "JAVA_HOME=C:\Users\Laziko\jdk21\jdk-21.0.4+7"
set "ANDROID_HOME=C:\Users\Laziko\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\Laziko\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"

echo [1/3] Installing Android SDK platform-tools...
call "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo [2/3] Syncing Capacitor project...
cd /d "D:\notesphere-notes-&-planner"
call node node_modules/@capacitor/cli/bin/capacitor sync android

echo [3/3] Building Android APK (Debug)...
cd /d "D:\notesphere-notes-&-planner\android"
call gradlew.bat assembleDebug

if exist "app\build\outputs\apk\debug\app-debug.apk" (
    if not exist "..\release" mkdir "..\release"
    copy /Y "app\build\outputs\apk\debug\app-debug.apk" "..\release\NoteSphere-OS-Mobile-1.0.0.apk"
    echo [SUCCESS] NoteSphere APK copied to: release\NoteSphere-OS-Mobile-1.0.0.apk
) else (
    echo [ERROR] APK build failed!
)

echo Build process complete!
