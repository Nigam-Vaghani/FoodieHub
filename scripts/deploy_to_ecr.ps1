# ==============================================================================
# FoodieHub — AWS ECR Automated Build & Push Script
# ==============================================================================
param(
    [string]$Region = $(aws configure get region),
    [string]$AccountId = $(aws sts get-caller-identity --query "Account" --output text)
)

if (-not $Region) { $Region = "ap-south-1" }
if (-not $AccountId) {
    Write-Error "Could not retrieve AWS Account ID. Please ensure 'aws configure' is properly set."
    exit 1
}

$EcrRegistry = "$AccountId.dkr.ecr.$Region.amazonaws.com"
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " FoodieHub AWS ECR Image Publisher" -ForegroundColor Cyan
Write-Host " AWS Account : $AccountId" -ForegroundColor Yellow
Write-Host " AWS Region  : $Region" -ForegroundColor Yellow
Write-Host " ECR Registry: $EcrRegistry" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Authenticate Docker with AWS ECR
Write-Host "`n[1/4] Authenticating Docker with Amazon ECR..." -ForegroundColor Green
$loginPassword = aws ecr get-login-password --region $Region
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to obtain ECR login password. Check your AWS credentials."
    exit 1
}
$loginPassword | docker login --username AWS --password-stdin $EcrRegistry
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker login to ECR failed."
    exit 1
}
Write-Host "Docker successfully authenticated with ECR!" -ForegroundColor Green

# 2. Define Services & Dockerfiles
$services = @(
    @{ Name = "foodiehub/gateway"; Context = "./gateway"; Dockerfile = "./gateway/Dockerfile.ecs" },
    @{ Name = "foodiehub/frontend"; Context = "./frontend"; Dockerfile = "./frontend/Dockerfile.ecs" },
    @{ Name = "foodiehub/user-service"; Context = "./services/user-service"; Dockerfile = "./services/user-service/Dockerfile" },
    @{ Name = "foodiehub/restaurant-service"; Context = "./services/restaurant-service"; Dockerfile = "./services/restaurant-service/Dockerfile" },
    @{ Name = "foodiehub/order-service"; Context = "./services/order-service"; Dockerfile = "./services/order-service/Dockerfile" },
    @{ Name = "foodiehub/delivery-service"; Context = "./services/delivery-service"; Dockerfile = "./services/delivery-service/Dockerfile" },
    @{ Name = "foodiehub/notification-service"; Context = "./services/notification-service"; Dockerfile = "./services/notification-service/Dockerfile" }
)

# 3. Create ECR Repositories if not exist
Write-Host "`n[2/4] Ensuring ECR repositories exist..." -ForegroundColor Green
foreach ($svc in $services) {
    $repoName = $svc.Name
    $check = aws ecr describe-repositories --repository-names $repoName --region $Region 2>$null
    if (-not $check) {
        Write-Host "Creating ECR repository: $repoName" -ForegroundColor Yellow
        aws ecr create-repository --repository-name $repoName --region $Region --image-scanning-configuration scanOnPush=true | Out-Null
    } else {
        Write-Host "ECR repository exists: $repoName" -ForegroundColor DarkGray
    }
}

# 4. Build, Tag & Push Each Image
Write-Host "`n[3/4] Building, Tagging and Pushing Docker images..." -ForegroundColor Green
$total = $services.Count
$idx = 1
foreach ($svc in $services) {
    $repoName = $svc.Name
    $targetTag = "$EcrRegistry/$repoName`:latest"
    Write-Host "`n[$idx/$total] Processing: $repoName" -ForegroundColor Cyan
    Write-Host "Building image from $($svc.Context) using $($svc.Dockerfile)..." -ForegroundColor DarkGray
    docker build --platform linux/amd64 -t $targetTag -f $svc.Dockerfile $svc.Context
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build image for $repoName"
        exit 1
    }

    Write-Host "Pushing $targetTag to Amazon ECR..." -ForegroundColor DarkGray
    docker push $targetTag
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to push image $targetTag to ECR"
        exit 1
    }
    Write-Host "Successfully pushed: $targetTag" -ForegroundColor Green
    $idx++
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " ALL 7 FOODIEHUB IMAGES SUCCESSFULLY PUSHED TO AWS ECR! " -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
