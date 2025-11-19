# Kill existing node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait for cleanup
Start-Sleep -Seconds 1

# Start server in background
Write-Host "Starting server..." -ForegroundColor Cyan
$job = Start-Job -ScriptBlock {
    Set-Location "d:\web\AutoTask-mix-back"
    $env:HOST = "0.0.0.0"
    node server-wrapper.cjs
}

# Wait for server to be ready
Write-Host "Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/users" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "Server is ready!" -ForegroundColor Green
} catch {
    Write-Host "Server failed to start!" -ForegroundColor Red
    Stop-Job $job
    Remove-Job $job
    exit 1
}

# Run tests
Write-Host "`nRunning Conditional Gmail Login Tests..." -ForegroundColor Cyan
node test-conditional-gmail-login.cjs

# Cleanup
Write-Host "`nStopping server..." -ForegroundColor Yellow
Stop-Job $job
Remove-Job $job

Write-Host "Test run complete!" -ForegroundColor Green
