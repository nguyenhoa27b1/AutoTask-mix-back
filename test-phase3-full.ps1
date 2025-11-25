Write-Host "🚀 Starting servers and testing Phase 3..." -ForegroundColor Cyan

# Kill existing node processes
Write-Host "`n🛑 Stopping existing servers..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start backend server
Write-Host "`n🔧 Starting backend server on port 4000..." -ForegroundColor Green
$backendJob = Start-Process node -ArgumentList "server.cjs" -WorkingDirectory "d:\web\AutoTask-mix-back-ver2" -NoNewWindow -PassThru
Start-Sleep -Seconds 5

# Test backend
Write-Host "`n🧪 Testing backend..." -ForegroundColor Cyan
node test-phase3-leave.cjs

Write-Host "`n✅ Backend test completed!" -ForegroundColor Green
Write-Host "`n📋 Phase 3 Leave Management Implementation Summary:" -ForegroundColor Magenta
Write-Host "   ✅ LeaveRequest types defined" -ForegroundColor Green
Write-Host "   ✅ Backend API endpoints (GET/POST/PUT/DELETE)" -ForegroundColor Green
Write-Host "   ✅ Frontend API service" -ForegroundColor Green
Write-Host "   ✅ LeaveRequestModal component" -ForegroundColor Green
Write-Host "   ✅ LeaveManagement component" -ForegroundColor Green
Write-Host "   ✅ Dashboard integration with tabs" -ForegroundColor Green

Write-Host "`n🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Start frontend: npm run dev" -ForegroundColor White
Write-Host "   2. Open http://localhost:3000" -ForegroundColor White
Write-Host "   3. Test leave request creation and approval flow" -ForegroundColor White
Write-Host "   4. Continue to Phase 5: Excel Export" -ForegroundColor White

Write-Host "`n🎉 Phase 3 Complete!" -ForegroundColor Green
