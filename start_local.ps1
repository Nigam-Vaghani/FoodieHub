# FoodieHub Local Multi-Service Development Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Starting FoodieHub Microservices & Frontend locally    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseDir = if ($PSScriptRoot) { $PSScriptRoot } else { Get-Location }

$services = @(
    @{ Name = "User Service"; Dir = "$baseDir/services/user-service"; Port = 8001 },
    @{ Name = "Restaurant Service"; Dir = "$baseDir/services/restaurant-service"; Port = 8002 },
    @{ Name = "Order Service"; Dir = "$baseDir/services/order-service"; Port = 8003 },
    @{ Name = "Delivery Service"; Dir = "$baseDir/services/delivery-service"; Port = 8004 },
    @{ Name = "Notification Service"; Dir = "$baseDir/services/notification-service"; Port = 8005 }
)

foreach ($svc in $services) {
    Write-Host "Launching $($svc.Name) on port $($svc.Port)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = '$($svc.Name) (: $($svc.Port))'; cd '$($svc.Dir)'; Write-Host '--- $($svc.Name) (: $($svc.Port)) ---' -ForegroundColor Cyan; python -m uvicorn src.main:app --port $($svc.Port) --reload"
}

Write-Host "Launching Frontend Dev Server on port 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'FoodieHub Frontend (:3000)'; cd '$baseDir/frontend'; Write-Host '--- FoodieHub Frontend (:3000) ---' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "All 5 microservices and Frontend have been launched in separate terminal windows!" -ForegroundColor Green
Write-Host "Access the application at:" -ForegroundColor Cyan
Write-Host "  -> Frontend App: http://localhost:3000" -ForegroundColor White
Write-Host "  -> Swagger Docs: http://localhost:8001/docs to 8005/docs" -ForegroundColor White
Write-Host "To stop all services later, run: .\stop_local.ps1" -ForegroundColor Yellow
