# HapTrans - Flutter APK Build Script
# Run from: Saas HapTrans\

Write-Host "HapTrans Driver - Flutter APK Builder" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Find Flutter
$flutterPath = $null
$commonPaths = @(
    "C:\flutter\bin\flutter.bat",
    "C:\src\flutter\bin\flutter.bat",
    "$env:USERPROFILE\flutter\bin\flutter.bat",
    "$env:LOCALAPPDATA\flutter\bin\flutter.bat"
)
foreach ($p in $commonPaths) {
    if (Test-Path $p) { $flutterPath = $p; break }
}

# Also try flutter from PATH
if (-not $flutterPath) {
    $fromPath = Get-Command flutter -ErrorAction SilentlyContinue
    if ($fromPath) { $flutterPath = $fromPath.Source }
}

if (-not $flutterPath) {
    Write-Host "Flutter not found. Downloading Flutter SDK (~750MB)..." -ForegroundColor Yellow

    $flutterUrl = "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.32.0-stable.zip"
    $zipPath = "$env:TEMP\flutter_sdk.zip"
    $extractPath = "C:\"

    Write-Host "Downloading from: $flutterUrl" -ForegroundColor Gray

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $flutterUrl -OutFile $zipPath -UseBasicParsing
        Write-Host "Download complete!" -ForegroundColor Green

        Write-Host "Extracting archive..." -ForegroundColor Gray
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
        Write-Host "Flutter extracted to C:\flutter" -ForegroundColor Green

        $flutterPath = "C:\flutter\bin\flutter.bat"
        $env:PATH = "C:\flutter\bin;$env:PATH"
        Write-Host "Flutter added to PATH!" -ForegroundColor Green
    } catch {
        Write-Host "Download failed: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install Flutter manually:" -ForegroundColor Yellow
        Write-Host "  https://docs.flutter.dev/get-started/install/windows" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Then run from the mobile directory:" -ForegroundColor Yellow
        Write-Host "  flutter pub get" -ForegroundColor White
        Write-Host "  flutter build apk --release" -ForegroundColor White
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "Flutter found: $flutterPath" -ForegroundColor Green
    $flutterDir = Split-Path $flutterPath
    if ($env:PATH -notlike "*$flutterDir*") {
        $env:PATH = "$flutterDir;$env:PATH"
    }
}

Write-Host ""

# Step 2: Check Android SDK
Write-Host "Checking Android SDK..." -ForegroundColor Cyan
$androidSdkPath = $null
$androidPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "C:\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk"
)
foreach ($p in $androidPaths) {
    if (Test-Path $p) { $androidSdkPath = $p; break }
}

if ($androidSdkPath) {
    Write-Host "Android SDK found: $androidSdkPath" -ForegroundColor Green
    $env:ANDROID_HOME = $androidSdkPath
    $env:ANDROID_SDK_ROOT = $androidSdkPath
    $env:PATH = "$androidSdkPath\platform-tools;$androidSdkPath\cmdline-tools\latest\bin;$env:PATH"
} else {
    Write-Host "Android SDK not found automatically. Flutter will indicate what is missing." -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Navigate to mobile folder
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileDir = Join-Path $scriptDir "mobile"

if (-not (Test-Path $mobileDir)) {
    Write-Host "ERROR: mobile/ directory not found at: $mobileDir" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location $mobileDir
Write-Host "Working directory: $mobileDir" -ForegroundColor Gray
Write-Host ""

# Step 4: Accept Android licenses
Write-Host "Accepting Android licenses..." -ForegroundColor Cyan
echo "y" | & $flutterPath doctor --android-licenses 2>&1 | Out-Null

# Step 5: Flutter pub get
Write-Host "Installing Flutter dependencies (pub get)..." -ForegroundColor Cyan
& $flutterPath pub get
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: flutter pub get failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Dependencies installed!" -ForegroundColor Green
Write-Host ""

# Step 6: Build APK
Write-Host "Building APK (release mode)..." -ForegroundColor Cyan
Write-Host "This may take 5-15 minutes on first run..." -ForegroundColor Gray
Write-Host ""
& $flutterPath build apk --release

if ($LASTEXITCODE -eq 0) {
    $apkPath = Join-Path $mobileDir "build\app\outputs\flutter-apk\app-release.apk"
    if (Test-Path $apkPath) {
        $apkSize = [Math]::Round((Get-Item $apkPath).Length / 1MB, 1)
        Write-Host ""
        Write-Host "======================================" -ForegroundColor Green
        Write-Host "  APK BUILD SUCCESS!" -ForegroundColor Green
        Write-Host "======================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "APK location:" -ForegroundColor White
        Write-Host "  $apkPath" -ForegroundColor Cyan
        Write-Host "  Size: $($apkSize) MB" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Install on Android device:" -ForegroundColor White
        Write-Host "  1. Copy APK to phone" -ForegroundColor Gray
        Write-Host "  2. Enable 'Unknown sources' in Settings" -ForegroundColor Gray
        Write-Host "  3. Open APK file and install" -ForegroundColor Gray
        Write-Host ""
        Write-Host "IMPORTANT: Before installing, edit:" -ForegroundColor Yellow
        Write-Host "  mobile\lib\utils\constants.dart" -ForegroundColor Cyan
        Write-Host "  Replace 10.0.2.2 with your server IP address" -ForegroundColor Gray
        Write-Host "  (find your IP with: ipconfig)" -ForegroundColor Gray

        Start-Process explorer.exe -ArgumentList (Split-Path $apkPath)
    }
} else {
    Write-Host ""
    Write-Host "APK build failed. Check errors above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common solutions:" -ForegroundColor Yellow
    Write-Host "  1. Install Android Studio: https://developer.android.com/studio" -ForegroundColor Gray
    Write-Host "  2. Run: flutter doctor -v" -ForegroundColor Gray
    Write-Host "  3. Accept licenses: flutter doctor --android-licenses" -ForegroundColor Gray
}

Write-Host ""
Read-Host "Press Enter to exit"
