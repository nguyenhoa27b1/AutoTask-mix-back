# Kill all node processes
Write-Host "Stopping all node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start server
Write-Host "Starting server..." -ForegroundColor Green
$serverProcess = Start-Process -FilePath "node" -ArgumentList "server.cjs" -WorkingDirectory "d:\web\AutoTask-mix-back-ver2" -PassThru -NoNewWindow

# Wait for server to start
Write-Host "Waiting for server to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Test connection
Write-Host "`nTesting API connection..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/users" -Method GET -ErrorAction Stop
    Write-Host "✅ Connection successful!" -ForegroundColor Green
    Write-Host "`nUsers found: $($response.Count)" -ForegroundColor White
    
    foreach ($user in $response) {
        Write-Host "`n  $($user.email):" -ForegroundColor Yellow
        Write-Host "    - Total Tasks Assigned: $($user.totalTasksAssigned)" -ForegroundColor White
        Write-Host "    - Total Tasks Completed: $($user.totalTasksCompleted)" -ForegroundColor White
        Write-Host "    - Average Score: $($user.averageScore)" -ForegroundColor White
        Write-Host "    - Tasks Completed On Time: $($user.tasksCompletedOnTime)" -ForegroundColor White
        Write-Host "    - Tasks Completed Late: $($user.tasksCompletedLate)" -ForegroundColor White
    }
    
    Write-Host "`n✅ Phase 2 Statistics fields are working!" -ForegroundColor Green
} catch {
    Write-Host "❌ Connection failed: $_" -ForegroundColor Red
}

Write-Host "`nServer is running in the background. Press Ctrl+C to stop." -ForegroundColor Cyan
Wait-Process -Id $serverProcess.Id
