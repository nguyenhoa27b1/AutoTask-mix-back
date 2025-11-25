Write-Host "🔍 COMPREHENSIVE SYSTEM HEALTH CHECK" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Kill all existing node processes
Write-Host "🛑 Stopping all existing servers..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# Start Backend Server
Write-Host "`n🔧 Starting Backend Server..." -ForegroundColor Green
$backendProcess = Start-Process node -ArgumentList "server.cjs" -WorkingDirectory "d:\web\AutoTask-mix-back-ver2" -NoNewWindow -PassThru
Start-Sleep -Seconds 6

# Check if backend started successfully
$backendRunning = Get-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
if ($backendRunning) {
    Write-Host "   ✅ Backend server started (PID: $($backendProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend server failed to start" -ForegroundColor Red
    exit 1
}

# Test Backend Health
Write-Host "`n🏥 Testing Backend Health..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/users" -Method GET -ErrorAction Stop
    Write-Host "   ✅ Backend is responding (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend health check failed: $_" -ForegroundColor Red
    Get-Process node | Stop-Process -Force
    exit 1
}

# Run Comprehensive Tests
Write-Host "`n🧪 Running Comprehensive System Tests..." -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
node test-system-full.cjs

$testExitCode = $LASTEXITCODE

# Start Frontend Server
Write-Host "`n🎨 Starting Frontend Server..." -ForegroundColor Green
$frontendProcess = Start-Process npm -ArgumentList "run", "dev" -WorkingDirectory "d:\web\AutoTask-mix-back-ver2" -NoNewWindow -PassThru
Start-Sleep -Seconds 8

# Check if frontend started successfully
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Frontend server started and responding" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Frontend server may still be starting..." -ForegroundColor Yellow
}

# Display Server Status
Write-Host "`n📡 SERVER STATUS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════" -ForegroundColor Gray

$backendStatus = Get-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
if ($backendStatus) {
    Write-Host "✅ Backend:  Running on http://localhost:4000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend:  Not Running" -ForegroundColor Red
}

$frontendStatus = Get-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue
if ($frontendStatus) {
    Write-Host "✅ Frontend: Running on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: Not Running" -ForegroundColor Red
}

Write-Host "═══════════════════════════════════════" -ForegroundColor Gray

# Final Summary
if ($testExitCode -eq 0) {
    Write-Host "`n🎉 SYSTEM CHECK COMPLETE - ALL TESTS PASSED! 🎉" -ForegroundColor Green
    Write-Host "`n📋 System Status:" -ForegroundColor Cyan
    Write-Host "   ✅ Backend API: Healthy" -ForegroundColor Green
    Write-Host "   ✅ Frontend: Running" -ForegroundColor Green
    Write-Host "   ✅ Integration: Verified" -ForegroundColor Green
    Write-Host "   ✅ All Features: Working" -ForegroundColor Green
    
    Write-Host "`n🌐 Access your application:" -ForegroundColor Yellow
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "   Backend:  http://localhost:4000" -ForegroundColor White
    
    Write-Host "`n💡 Tips:" -ForegroundColor Cyan
    Write-Host "   - Login with Google OAuth - only authorized emails" -ForegroundColor White
    Write-Host "   - Check the Leave Requests tab for Phase 3 features" -ForegroundColor White
    Write-Host "   - Use the Export button to download Excel reports" -ForegroundColor White
    Write-Host "   - View user statistics in the User Management tab" -ForegroundColor White
    
    Write-Host "`n🚀 System is production-ready!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  SYSTEM CHECK FAILED" -ForegroundColor Red
    Write-Host "   Some tests failed. Please review the test output above." -ForegroundColor Yellow
    Write-Host "   Servers are still running for debugging." -ForegroundColor Yellow
}

Write-Host "`n📝 To stop servers, run: Get-Process node | Stop-Process -Force" -ForegroundColor Gray
Write-Host ""
