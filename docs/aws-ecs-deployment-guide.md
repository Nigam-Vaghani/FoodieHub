# FoodieHub — AWS ECR & ECS Fargate Production Deployment Guide

## 1. Cloud Architecture Overview

FoodieHub is engineered for **Amazon Elastic Container Registry (ECR)** and **Amazon Elastic Container Service (ECS)** using the serverless **AWS Fargate** launch type.

```mermaid
graph TD
    User([Public Web Client]) -->|Port 80 / HTTP| Gateway[Nginx Gateway :80]

    subgraph "AWS Cloud (ap-south-1 Mumbai) — Production VPC"
        subgraph "ECS Cluster: foodiehub-cluster"
            subgraph "AWS Fargate Task: foodiehub-task (awsvpc network mode)"
                Gateway -->|/| Frontend[React SPA :8080]
                Gateway -->|/api/users| UserService[User Service :8001]
                Gateway -->|/api/restaurants| RestaurantService[Restaurant Service :8002]
                Gateway -->|/api/orders| OrderService[Order Service :8003]
                Gateway -->|/api/deliveries| DeliveryService[Delivery Service :8004]
                Gateway -->|/api/notifications| NotificationService[Notification Service :8005]

                OrderService --> RestaurantService
                OrderService --> DeliveryService
                OrderService --> NotificationService
                DeliveryService --> NotificationService
            end
        end

        ECR[(Amazon ECR 7 Repositories)] -.->|Image Pull| ECS Cluster
        CloudWatch[Amazon CloudWatch Logs /ecs/foodiehub] -.->|Streams| ECS Cluster
    end
```

### Key Architectural Tenets on AWS:
1. **Serverless Infrastructure (AWS Fargate):** Zero EC2 virtual machines to patch, configure, or secure. Containers run on managed serverless compute sized to 2 vCPU and 4 GB RAM.
2. **Loopback Microservice Ingress (`awsvpc`):** All 7 containers share the dedicated `awsvpc` network namespace, enabling intra-task microservice communication with near-zero latency over loopback (`127.0.0.1`), shielded behind the Nginx API Gateway.
3. **Automated Vulnerability Scanning (DevSecOps):** All 7 container images in Amazon ECR have `scanOnPush=true` enabled to detect Common Vulnerabilities and Exposures (CVEs) automatically upon upload.
4. **Centralized Logging & Observability:** All microservice `stdout`/`stderr` streams are piped to AWS CloudWatch Log Group `/ecs/foodiehub` with service-specific prefixes.

---

## 2. What Was Built & Configured in the Repository

| File / Component | Purpose |
|---|---|
| [`gateway/nginx.ecs.conf`](../gateway/nginx.ecs.conf) | Optimized Nginx reverse proxy configuration for AWS ECS loopback routing. |
| [`gateway/Dockerfile.ecs`](../gateway/Dockerfile.ecs) | Docker build manifest for the ECS gateway container. |
| [`frontend/nginx.ecs.conf`](../frontend/nginx.ecs.conf) | Frontend Nginx configuration listening on port `8080` to prevent port collision with the gateway. |
| [`frontend/Dockerfile.ecs`](../frontend/Dockerfile.ecs) | Multi-stage Docker build producing the ECS frontend container. |
| [`aws/ecs-task-definition.json`](../aws/ecs-task-definition.json) | Production AWS ECS Task Definition for 7 containers with CloudWatch log drivers, healthchecks, and environment variables. |
| [`aws/cloudformation.yml`](../aws/cloudformation.yml) | Declarative Infrastructure-as-Code (IaC) CloudFormation template. |
| [`scripts/deploy_to_ecr.ps1`](../scripts/deploy_to_ecr.ps1) | Automated PowerShell script to create ECR repos, build `linux/amd64` images, tag, and push to ECR. |
| [`scripts/deploy_to_ecs.ps1`](../scripts/deploy_to_ecs.ps1) | Automated PowerShell script to provision CloudWatch, IAM roles, ECS Cluster, Security Group, and launch Fargate service. |
| [`scripts/destroy_aws.ps1`](../scripts/destroy_aws.ps1) | Teardown script to scale down and delete ECS services/cluster to prevent unwanted AWS charges. |
| [`.github/workflows/deploy-aws.yml`](../.github/workflows/deploy-aws.yml) | Full GitHub Actions CI/CD pipeline: Run 40 tests $\rightarrow$ Build and push to ECR $\rightarrow$ Deploy to ECS Fargate. |

---

## 3. What You Need to Do (Execution Guide)

Your machine is already verified with **AWS CLI (ap-south-1)** and **Docker Desktop**. Follow these simple commands in PowerShell:

### Step 1: Build & Push Images to Amazon ECR
Run the automated publisher script from the project root:
```powershell
.\scripts\deploy_to_ecr.ps1
```
* **What it does:** Authenticates Docker with ECR, creates the 7 ECR repositories (`foodiehub/gateway`, `foodiehub/user-service`, etc.), builds all 7 images for `linux/amd64`, tags them, and pushes them to your AWS ECR registry.

### Step 2: Deploy to Amazon ECS Fargate
Once images are pushed, launch the ECS cluster and service:
```powershell
.\scripts\deploy_to_ecs.ps1
```
* **What it does:**
  1. Creates CloudWatch Log Group `/ecs/foodiehub`.
  2. Creates IAM execution role `ecsTaskExecutionRole`.
  3. Creates ECS Cluster `foodiehub-cluster`.
  4. Resolves default VPC & creates Security Group `foodiehub-ecs-sg` with port `80` open.
  5. Registers `foodiehub-task` definition.
  6. Creates the Fargate service with a Public IP and prints the live URL!

---

## 4. What to See & What to Test

### In the AWS Management Console:

1. **Amazon ECR:**
   - Go to [AWS ECR Repositories](https://ap-south-1.console.aws.amazon.com/ecr/repositories?region=ap-south-1).
   - Verify all 7 repositories are listed:
     - `foodiehub/gateway`
     - `foodiehub/frontend`
     - `foodiehub/user-service`
     - `foodiehub/restaurant-service`
     - `foodiehub/order-service`
     - `foodiehub/delivery-service`
     - `foodiehub/notification-service`
   - Click into any repository and observe the image tag `latest` and automated vulnerability scan status.

2. **Amazon ECS:**
   - Go to [AWS ECS Clusters](https://ap-south-1.console.aws.amazon.com/ecs/v2/clusters?region=ap-south-1).
   - Click on **`foodiehub-cluster`**.
   - Under the **Services** tab, verify **`foodiehub-service`** is in status `ACTIVE` with `1/1 Running`.
   - Click the **Tasks** tab, click on the running task, and expand the **Containers** section to show all 7 containers running in harmony.
   - Under **Networking**, locate the **Public IP**.

3. **Amazon CloudWatch:**
   - Go to [CloudWatch Log Groups](https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#logsV2:log-groups).
   - Select `/ecs/foodiehub` to view real-time log streams for every microservice.

---

### In Your Web Browser:

1. **Gateway Health Probe:**
   Navigate to:
   ```
   http://<PUBLIC_IP>/gateway-health
   ```
   *Expected Response:*
   ```json
   {
     "status": "healthy",
     "service": "api-gateway",
     "timestamp": "...",
     "platform": "aws-ecs-fargate"
   }
   ```

2. **Full Application Test:**
   Navigate to:
   ```
   http://<PUBLIC_IP>
   ```
   - Sign in as Customer (`customer@foodiehub.com` / `Password123!`).
   - Add items to cart and place an order.
   - In another tab or incognito window, sign in as Driver (`driver@foodiehub.com` / `DriverPass123!`).
   - Advance the order state in `/driver` and observe live status updates in the customer window.

---

## 5. How to Clean Up / Teardown (Avoid Charges)

When your viva or testing is complete, run the teardown script:
```powershell
.\scripts\destroy_aws.ps1
```
This scales the service down to 0, stops all running Fargate tasks, and deletes the cluster so no ongoing AWS compute charges will incur.
