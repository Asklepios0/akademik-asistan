# Akademik Asistan - Tam Bağımsız (Offline Embedded) APK Derleme Scripti
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Akademik Asistan Standalone APK...     " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# JDK 21 (LTS) & Android SDK
if (Test-Path "C:\Users\Bedirhan\.jdks\jbr-21.0.11") {
    $env:JAVA_HOME = "C:\Users\Bedirhan\.jdks\jbr-21.0.11"
} else {
    $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
}

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Set-Location -Path "$PSScriptRoot\android"

Write-Host "Java Versiyonu: $($env:JAVA_HOME)" -ForegroundColor Cyan
Write-Host "Gradle ile Gömülü JS Paketlemeli APK derleniyor (assembleDebug with offline JS)..." -ForegroundColor Yellow

.\gradlew.bat assembleDebug

if ($LASTEXITCODE -eq 0) {
    $apkSource = "$PSScriptRoot\android\app\build\outputs\apk\debug\app-debug.apk"
    $apkDestination1 = "$PSScriptRoot\AkademikAsistan.apk"
    $apkDestination2 = "$PSScriptRoot\Akademik Asistan.apk"
    
    if (Test-Path $apkSource) {
        Copy-Item -Path $apkSource -Destination $apkDestination1 -Force
        Copy-Item -Path $apkSource -Destination $apkDestination2 -Force
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "  TEBRİKLER! ÇEVRİMDIŞI ÇALIŞAN APK ÜRETİLDİ:               " -ForegroundColor Green
        Write-Host "  $apkDestination1" -ForegroundColor White
        Write-Host "  $apkDestination2" -ForegroundColor White
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "Bu APK tamamen bağımsızdır (Metro/PC/Sunucu gerektirmez)." -ForegroundColor Yellow
        Write-Host "Telefonunuza atıp doğrudan açabilirsiniz." -ForegroundColor Yellow
    }
} else {
    Write-Host "Derleme sırasında bir hata oluştu!" -ForegroundColor Red
}

Set-Location -Path $PSScriptRoot
