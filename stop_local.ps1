# Stop all locally running FoodieHub services. 
Write-Host "Stopping all local FoodieHub services..." -ForegroundColor Yellow

Get-Process -Name "python", "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match "uvicorn" -or $_.CommandLine -match "vite"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Done!" -ForegroundColor Green
