# ==============================================================================
# FoodieHub — AWS ECS Fargate Automated Deployment Script
# ==============================================================================
param(
    [string]$Region = $(aws configure get region),
    [string]$AccountId = $(aws sts get-caller-identity --query "Account" --output text),
    [string]$ClusterName = "foodiehub-cluster",
    [string]$ServiceName = "foodiehub-service",
    [string]$LogGroupName = "/ecs/foodiehub",
    [string]$SecurityGroupName = "foodiehub-ecs-sg"
)

if (-not $Region) { $Region = "ap-south-1" }
if (-not $AccountId) {
    Write-Error "Could not retrieve AWS Account ID. Please verify your AWS credentials."
    exit 1
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " FoodieHub AWS ECS Fargate Orchestrator" -ForegroundColor Cyan
Write-Host " AWS Account : $AccountId" -ForegroundColor Yellow
Write-Host " AWS Region  : $Region" -ForegroundColor Yellow
Write-Host " ECS Cluster : $ClusterName" -ForegroundColor Yellow
Write-Host " ECS Service : $ServiceName" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Ensure CloudWatch Log Group Exists
Write-Host "`n[1/7] Ensuring CloudWatch Log Group ($LogGroupName) exists..." -ForegroundColor Green
aws logs create-log-group --log-group-name $LogGroupName --region $Region 2>$null
Write-Host "CloudWatch Log Group ready." -ForegroundColor Green

# 2. Ensure IAM Execution Role Exists
Write-Host "`n[2/7] Checking IAM Role 'ecsTaskExecutionRole'..." -ForegroundColor Green
$roleCheck = aws iam get-role --role-name ecsTaskExecutionRole 2>$null
if (-not $roleCheck) {
    Write-Host "Creating ecsTaskExecutionRole..." -ForegroundColor Yellow
    $trustPolicy = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
    aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document $trustPolicy | Out-Null
    aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy | Out-Null
    Write-Host "Created and attached AmazonECSTaskExecutionRolePolicy." -ForegroundColor Green
} else {
    Write-Host "IAM Role ecsTaskExecutionRole is present." -ForegroundColor DarkGray
}

# 3. Ensure ECS Cluster Exists
Write-Host "`n[3/7] Ensuring ECS Cluster ($ClusterName) exists..." -ForegroundColor Green
aws ecs create-cluster --cluster-name $ClusterName --region $Region | Out-Null
Write-Host "ECS Cluster ($ClusterName) ready." -ForegroundColor Green

# 4. Resolve Default VPC & Public Subnets
Write-Host "`n[4/7] Resolving Default VPC and Public Subnets..." -ForegroundColor Green
$vpcId = aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $Region
if (-not $vpcId -or $vpcId -eq "None") {
    $vpcId = aws ec2 describe-vpcs --query "Vpcs[0].VpcId" --output text --region $Region
}
Write-Host "Using VPC: $vpcId" -ForegroundColor Yellow

$subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --query "Subnets[*].SubnetId" --output text --region $Region
$subnetList = $subnets.Split("`t ") | Where-Object { $_ -ne "" }
$subnetCsv = ($subnetList | Select-Object -First 2) -join ","
Write-Host "Using Subnets: $subnetCsv" -ForegroundColor Yellow

# 5. Create or Resolve Security Group
Write-Host "`n[5/7] Ensuring Security Group ($SecurityGroupName) allows port 80..." -ForegroundColor Green
$sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$SecurityGroupName" "Name=vpc-id,Values=$vpcId" --query "SecurityGroups[0].GroupId" --output text --region $Region 2>$null

if (-not $sgId -or $sgId -eq "None") {
    Write-Host "Creating Security Group $SecurityGroupName..." -ForegroundColor Yellow
    $sgId = aws ec2 create-security-group --group-name $SecurityGroupName --description "FoodieHub ECS Gateway Public Ingress" --vpc-id $vpcId --query "GroupId" --output text --region $Region
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $Region | Out-Null
    Write-Host "Created Security Group: $sgId with port 80 ingress" -ForegroundColor Green
} else {
    Write-Host "Using existing Security Group: $sgId" -ForegroundColor DarkGray
}

# 6. Register Task Definition
Write-Host "`n[6/7] Registering ECS Task Definition..." -ForegroundColor Green
$taskDefPath = "./aws/ecs-task-definition.json"
$taskDefJson = Get-Content $taskDefPath -Raw
# Replace placeholders if any
$taskDefJson = $taskDefJson -replace "415368001088", $AccountId
$taskDefJson = $taskDefJson -replace "ap-south-1", $Region

$tempTaskDef = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempTaskDef -Value $taskDefJson

$regOutput = aws ecs register-task-definition --cli-input-json file://$tempTaskDef --region $Region
Remove-Item -Path $tempTaskDef -Force
Write-Host "Task Definition 'foodiehub-task' successfully registered!" -ForegroundColor Green

# 7. Create or Update ECS Fargate Service
Write-Host "`n[7/7] Launching / Updating ECS Fargate Service ($ServiceName)..." -ForegroundColor Green
$serviceCheck = aws ecs describe-services --cluster $ClusterName --services $ServiceName --query "services[?status=='ACTIVE'].serviceName" --output text --region $Region 2>$null

if ($serviceCheck -eq $ServiceName) {
    Write-Host "Updating existing ECS Service to latest task revision..." -ForegroundColor Yellow
    aws ecs update-service --cluster $ClusterName --service $ServiceName --task-definition foodiehub-task --force-new-deployment --region $Region | Out-Null
} else {
    Write-Host "Creating new ECS Fargate Service ($ServiceName)..." -ForegroundColor Yellow
    aws ecs create-service `
        --cluster $ClusterName `
        --service-name $ServiceName `
        --task-definition foodiehub-task `
        --desired-count 1 `
        --launch-type FARGATE `
        --network-configuration "awsvpcConfiguration={subnets=[$subnetCsv],securityGroups=[$sgId],assignPublicIp=ENABLED}" `
        --region $Region | Out-Null
}

Write-Host "Waiting for Fargate task to spin up and acquire Public IP..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

$taskArn = aws ecs list-tasks --cluster $ClusterName --service-name $ServiceName --query "taskArns[0]" --output text --region $Region
if ($taskArn -and $taskArn -ne "None") {
    Write-Host "Task ARN: $taskArn" -ForegroundColor DarkGray
    # Retrieve public IP from ENI
    $eniId = aws ecs describe-tasks --cluster $ClusterName --tasks $taskArn --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text --region $Region
    if ($eniId -and $eniId -ne "None") {
        $publicIp = aws ec2 describe-network-interfaces --network-interface-ids $eniId --query "NetworkInterfaces[0].Association.PublicIp" --output text --region $Region
        Write-Host "`n=======================================================" -ForegroundColor Cyan
        Write-Host " FOODIEHUB IS DEPLOYED ON AWS ECS FARGATE! " -ForegroundColor Green
        Write-Host " Public URL : http://$publicIp" -ForegroundColor Yellow
        Write-Host " Health API : http://$publicIp/gateway-health" -ForegroundColor Yellow
        Write-Host " CloudWatch : https://$Region.console.aws.amazon.com/cloudwatch/home?region=$Region#logsV2:log-groups/log-group/%2Fecs%2Ffoodiehub" -ForegroundColor DarkGray
        Write-Host "=======================================================" -ForegroundColor Cyan
        exit 0
    }
}

Write-Host "`nTask is provisioning in background. Check AWS Console:" -ForegroundColor Yellow
Write-Host "https://$Region.console.aws.amazon.com/ecs/v2/clusters/$ClusterName/services/$ServiceName" -ForegroundColor Cyan
