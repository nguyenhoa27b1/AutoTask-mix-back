# Start backend server and keep it running
# Usage: .\start-backend.ps1

$nodeProcess = Get-Process | Where-Object {$_.ProcessName -eq 'node' -and $_.MainWindowTitle -like '*server*'}
if ($nodeProcess) {
    Write-Host "⚠️  Node.js server is already running (PID: $($nodeProcess.Id))"
    Write-Host "To stop it, run: Stop-Process -Id $($nodeProcess.Id)"
    exit
}

Write-Host "🚀 Starting Backend Server..."
Write-Host "Server will run on http://localhost:4000"
Write-Host ""

cd d:\web\AutoTask
Start-Process -FilePath "node" -ArgumentList "server-wrapper.cjs" -NoNewWindow

Start-Sleep -Seconds 2

$checkProcess = Get-Process | Where-Object {$_.ProcessName -eq 'node'}
if ($checkProcess) {
    Write-Host "✅ Backend server started successfully!"
    Write-Host "PID: $($checkProcess.Id)"
    Write-Host ""
    Write-Host "API Endpoints:"
    Write-Host "  GET    http://localhost:4000/api/users"
    Write-Host "  GET    http://localhost:4000/api/tasks"
    Write-Host "  GET    http://localhost:4000/api/files"
    Write-Host "  POST   http://localhost:4000/api/login"
    Write-Host ""
    Write-Host "To test the API, run: node test-api.js"
    Write-Host "To stop the server, run: Get-Process -Name node | Stop-Process"
} else {
    Write-Host "❌ Failed to start backend server"
}
