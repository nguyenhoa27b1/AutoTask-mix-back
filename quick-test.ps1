# Quick test for Phase 2
Write-Host "Testing API..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/users" -Method GET -TimeoutSec 5
    Write-Host "✅ Success! Users found: $($response.Count)" -ForegroundColor Green
    
    foreach ($user in $response) {
        Write-Host "`n$($user.email):" -ForegroundColor Yellow
        Write-Host "  Tasks Assigned: $($user.totalTasksAssigned)" -ForegroundColor White
        Write-Host "  Tasks Completed: $($user.totalTasksCompleted)" -ForegroundColor White
        Write-Host "  Average Score: $($user.averageScore)" -ForegroundColor White
        Write-Host "  On Time: $($user.tasksCompletedOnTime)" -ForegroundColor White
        Write-Host "  Late: $($user.tasksCompletedLate)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
