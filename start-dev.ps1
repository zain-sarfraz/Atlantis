# ─── Atlantis Dev Startup Script ─────────────────────────────────────────────
# Run this once to start MySQL + Backend + Frontend
# Usage: Right-click → "Run with PowerShell" OR run in terminal: .\start-dev.ps1

Write-Host "🚀 Starting Atlantis Dev Environment..." -ForegroundColor Cyan

# Step 1: Start MySQL (XAMPP)
Write-Host "`n[1/3] Starting MySQL (XAMPP)..." -ForegroundColor Yellow
$mysqldExe = "C:\xampp\mysql\bin\mysqld.exe"
$mysqlIni  = "C:\xampp\mysql\bin\my.ini"

$running = Get-Process mysqld -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "  ✓ MySQL already running (PID $($running.Id))" -ForegroundColor Green
} else {
    Start-Process -FilePath $mysqldExe -ArgumentList "--defaults-file=$mysqlIni" -WindowStyle Hidden
    Write-Host "  Waiting for MySQL to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 4
    $test = & "C:\xampp\mysql\bin\mysql.exe" -u root --host=127.0.0.1 -e "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ MySQL started successfully on 127.0.0.1:3306" -ForegroundColor Green
    } else {
        Write-Host "  ✗ MySQL failed to start. Check XAMPP Control Panel." -ForegroundColor Red
        exit 1
    }
}

# Step 2: Start Backend
Write-Host "`n[2/3] Starting Backend (port 3001)..." -ForegroundColor Yellow
$backendPath = "$PSScriptRoot\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3
Write-Host "  ✓ Backend starting at http://localhost:3001" -ForegroundColor Green

# Step 3: Start Frontend
Write-Host "`n[3/3] Starting Frontend (port 5173)..." -ForegroundColor Yellow
$frontendPath = "$PSScriptRoot\Atlantis"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2
Write-Host "  ✓ Frontend starting at http://localhost:5173" -ForegroundColor Green

Write-Host "`n✅ All services starting!" -ForegroundColor Cyan
Write-Host "   Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "   Admin:     http://localhost:5173/admin" -ForegroundColor White
Write-Host "   Backend:   http://localhost:3001" -ForegroundColor White
Write-Host "`nNote: If you restart your PC, run this script again to restart MySQL." -ForegroundColor Gray
