<div align="center">

# 🍔 FoodieHub
### Cloud-Native Online Food Ordering & Delivery Platform

[![CI/CD Pipeline](https://github.com/Nigam-Vaghani/FoodieHub/actions/workflows/ci.yml/badge.svg)](https://github.com/Nigam-Vaghani/FoodieHub/actions)
[![Docker](https://img.shields.io/badge/Docker-Compose_v2-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-40%2F40_Passing-brightgreen?style=flat&logo=pytest&logoColor=white)](run_tests.py)
[![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=flat)](README.md)

<br/>

### 🛠️ Core Tech Stack & Tools
<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Nginx-Alpine-009639?style=for-the-badge&logo=nginx&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose_v2-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" />
</p>

### 📦 Key Libraries & Frameworks
<p align="center">
  <img src="https://img.shields.io/badge/SQLAlchemy-2.0+-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white" />
  <img src="https://img.shields.io/badge/Pydantic-v2.6-E92063?style=flat-square&logo=pydantic&logoColor=white" />
  <img src="https://img.shields.io/badge/PyJWT-2.8-black?style=flat-square&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/Passlib-Bcrypt-4B8BBE?style=flat-square" />
  <img src="https://img.shields.io/badge/HTTPX-0.27-111111?style=flat-square" />
  <img src="https://img.shields.io/badge/Pytest-8.0-0A9EDC?style=flat-square&logo=pytest&logoColor=white" />
  <img src="https://img.shields.io/badge/Lucide_React-0.344-F56565?style=flat-square" />
  <img src="https://img.shields.io/badge/SQLite-v3-003B57?style=flat-square&logo=sqlite&logoColor=white" />
</p>

</div>

---

## 📌 Architecture Overview

FoodieHub is a production-grade distributed application built on **Cloud-Native Principles**:
- **Independent Microservices:** 5 self-contained FastAPI services with dedicated codebases, Dockerfiles, and databases.
- **Database-per-Service:** Isolated SQLite databases persisted via Docker named volumes.
- **Unified Gateway:** Nginx reverse proxy single-port (`80`) ingress with path-based routing.
- **Zero-Trust Pricing:** All totals, taxes (5%), and delivery fees calculated server-side.
- **Real-Time State Transitions & In-App Alerts:** Driver advances order lifecycle; customers receive live updates.

---

## 🗺️ Microservices & Ports

| Service | Port | Endpoint / Swagger | Responsibilities |
|---|:---:|---|---|
| **API Gateway** | `80` | `http://localhost/` | Single entrypoint, reverse proxy & routing |
| **Frontend SPA** | `80` (int) | `http://localhost/` | React 18 + Vite responsive storefront |
| **User Service** | `8001` | `http://localhost:8001/docs` | JWT authentication, bcrypt hashing & profiles |
| **Restaurant Service** | `8002` | `http://localhost:8002/docs` | Restaurant catalog, menus & price verification |
| **Order Service** | `8003` | `http://localhost:8003/docs` | Order placement, server pricing & state machine |
| **Delivery Service** | `8004` | `http://localhost:8004/docs` | Courier assignment & delivery tracking |
| **Notification Service** | `8005` | `http://localhost:8005/docs` | In-app alerts & live status change notifications |

---

## 👥 Roles & Seed Credentials

| Role | Email | Password | Capabilities |
|---|---|---|---|
| **Customer** | `customer@foodiehub.com` | `Password123!` | Browse, add to cart, checkout, view live order tracking |
| **Delivery Partner** | `driver@foodiehub.com` | `DriverPass123!` | `/driver` dashboard: advance state (`CONFIRMED` $\rightarrow$ `PREPARING` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`) |
| **Admin** | `admin@foodiehub.com` | `AdminPass123!` | Manage catalog and system-wide visibility |

---

## ⚡ Quick Start

### Option 1: Docker Compose (Recommended)
```bash
# Start all 7 containers in background with persistent volumes:
docker compose up --build -d

# Verify all containers are healthy:
docker compose ps
```
> Open **`http://localhost`** in your browser.

### Option 2: Local Development (PowerShell)
```powershell
# Start all microservices + frontend locally:
.\start_local.ps1

# Stop all local processes:
.\stop_local.ps1
```

---

## 🧪 Testing & CI/CD

```bash
# Run all 40 unit and multi-service E2E integration tests:
python run_tests.py
```
- **Automated GitHub Actions:** Every push to `main` runs backend tests, TypeScript build, and Docker Compose validation in [.github/workflows/ci.yml](.github/workflows/ci.yml).
- **Test Status:** 40/40 Passing (100% success rate).

---

## 📚 Detailed Documentation
- [System Architecture & Diagrams](docs/architecture.md)
- [REST API Reference](docs/api-reference.md)
- [Testing & Quality Assurance Guide](docs/testing.md)
- [Viva Presentation & Demo Guide](docs/demo-guide.md)



DONE By - Nigam and Dhanesh