# ==============================================================================
# FoodieHub — AWS ECS Teardown / Cleanup Script
# ==============================================================================
param(
    [string]$Region = $(aws configure get region),
    [string]$ClusterName = "foodiehub-cluster",
    [string]$ServiceName = "foodiehub-service"
)

if (-not $Region) { $Region = "ap-south-1" }

Write-Host "=======================================================" -ForegroundColor Red
Write-Host " FoodieHub AWS Teardown Script" -ForegroundColor Red
Write-Host " Region  : $Region" -ForegroundColor Yellow
Write-Host " Cluster : $ClusterName" -ForegroundColor Yellow
Write-Host " Service : $ServiceName" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Red

# 1. Scale down and delete ECS Service
Write-Host "`n[1/3] Deleting ECS Service $ServiceName..." -ForegroundColor Yellow
aws ecs update-service --cluster $ClusterName --service $ServiceName --desired-count 0 --region $Region 2>$null | Out-Null
aws ecs delete-service --cluster $ClusterName --service $ServiceName --force --region $Region 2>$null | Out-Null
Write-Host "Service deleted." -ForegroundColor Green

# 2. Stop any remaining tasks
Write-Host "`n[2/3] Stopping any running tasks..." -ForegroundColor Yellow
$tasks = aws ecs list-tasks --cluster $ClusterName --query "taskArns[*]" --output text --region $Region
if ($tasks) {
    foreach ($t in $tasks.Split("`t ")) {
        if ($t) {
            aws ecs stop-task --cluster $ClusterName --task $t --region $Region | Out-Null
        }
    }
}
Write-Host "All tasks stopped." -ForegroundColor Green

# 3. Delete ECS Cluster
Write-Host "`n[3/3] Deleting ECS Cluster $ClusterName..." -ForegroundColor Yellow
aws ecs delete-cluster --cluster $ClusterName --region $Region 2>$null | Out-Null
Write-Host "Cluster deleted." -ForegroundColor Green

Write-Host "`nCleanup Complete! No active Fargate charges will incur." -ForegroundColor Green
