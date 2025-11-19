# Kill existing node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait for cleanup
Start-Sleep -Seconds 1

# Start server directly (not in background)
Write-Host "Starting server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\web\AutoTask-mix-back; node server-wrapper.cjs" -WindowStyle Minimized

# Wait for server to be ready
Write-Host "Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if server is running
$maxRetries = 5
$retryCount = 0
$serverReady = $false

while ($retryCount -lt $maxRetries -and -not $serverReady) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/api/users" -Method GET -TimeoutSec 2 -ErrorAction Stop
        $serverReady = $true
        Write-Host "Server is ready!" -ForegroundColor Green
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "Retry $retryCount/$maxRetries..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        } else {
            Write-Host "Server failed to start after $maxRetries attempts!" -ForegroundColor Red
            exit 1
        }
    }
}

# Run tests
Write-Host "`nRunning Conditional Gmail Login Tests..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
node test-conditional-gmail-login.cjs

# Cleanup
Write-Host "`n`nStopping server..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Test run complete!" -ForegroundColor Green
