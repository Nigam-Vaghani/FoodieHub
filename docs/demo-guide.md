# FoodieHub — College Presentation & Viva Demonstration Guide

> **Course:** Cloud Native Applications (CND)  
> **Target Audience:** Professors, Viva Examiners, Project Evaluators  
> **Presentation Duration:** 5–10 Minutes

---

## 1. 5–10 Minute Presentation Flow & Script

### Minute 0:00 – 1:30 | Introduction & Architecture Overview
- **Opening:** *"Good morning/afternoon, professors. Today I am presenting FoodieHub, a cloud-native online food ordering platform built using microservices architecture, Docker containerization, and an Nginx API Gateway."*
- **The Problem:** Explain that traditional monolithic architectures tightly couple customer identity, restaurant menus, orders, and couriers into a single codebase and database. A failure in one domain crashes the whole application.
- **The Solution:** FoodieHub decomposes the platform into 5 independently deployable FastAPI microservices (`user-service`, `restaurant-service`, `order-service`, `delivery-service`, `notification-service`), an Nginx API gateway, and a React + TypeScript frontend, all orchestrated with Docker Compose.

---

### Minute 1:30 – 3:30 | Live Application Demo
1. **Open Frontend:** Navigate to `http://localhost:3000` (or `http://localhost` if running via Gateway).
2. **Customer Authentication:**
   - Click **Sign In**.
   - Show the pre-seeded credentials: `customer@foodiehub.com` / `Password123!`.
   - Click Sign In. Explain that a cryptographically signed **JWT token** is returned and persisted in `localStorage`.
3. **Catalog Browsing:**
   - Show the 4 seeded restaurants (*Bella Italia*, *Spice Symphony*, *Sakura Sushi*, *Burger Craft*).
   - Filter by cuisine (e.g., click "Italian" or search for "Pizza").
   - Click *Bella Italia Trattoria* to view the menu organized by categories.
4. **Zero-Trust Cart & Checkout:**
   - Add a *Margherita Pizza* and *Truffle Tagliatelle* to cart.
   - Show that adding items from another restaurant triggers a single-restaurant cart validation prompt.
   - Click **Proceed to Checkout**.
   - Point out: The client sends only `menu_item_id` and `quantity`. The Order Service validates unit prices against Restaurant Service server-side and computes Subtotal, 5% Tax, and Delivery Fee.
   - Click **Place Order**.

---

### Minute 3:30 – 5:30 | Real-Time State Progression & Event Synchronization
1. **Live Order Tracker:**
   - Show that the order immediately appears in state **`CONFIRMED`**.
   - Show the Courier Delivery Card at the bottom showing **Alex Rivera** assigned.
2. **Demonstrate State Progression:**
   - Click the orange **`⚡ Advance to: Kitchen Preparing 👨‍🍳`** button.
   - Show the Stepper move to Step 2 with an active glow.
   - Click **`⚡ Advance to: Out for Delivery 🚴`**.
   - Point out that Order Service synchronized with Delivery Service: courier status changes to `IN_TRANSIT`!
   - Click **`⚡ Advance to: Delivered 🎉`**.
   - Order marked completed!
3. **In-App Real-Time Notifications:**
   - Click the **Notification Bell** in the top navigation bar.
   - Show that each status transition emitted an in-app notification event with unread counter badges.
   - Click "Mark all as read" to show state persistence.

---

### Minute 5:30 – 7:30 | Technical Deep-Dive & Containerization
1. **Docker Compose Orchestration:**
   - Open a terminal and run `docker compose ps` to show all 7 running containers:
     - `foodiehub-gateway` (Port 80)
     - `foodiehub-frontend`
     - `foodiehub-user-service` (Port 8001)
     - `foodiehub-restaurant-service` (Port 8002)
     - `foodiehub-order-service` (Port 8003)
     - `foodiehub-delivery-service` (Port 8004)
     - `foodiehub-notification-service` (Port 8005)
2. **Volume Persistence Demonstration:**
   - Explain that each service has its own dedicated named volume (`user_data`, `restaurant_data`, etc.).
   - If containers are stopped with `docker compose down` and recreated with `docker compose up -d`, all database records persist safely.
3. **Interactive Swagger Docs:**
   - Open `http://localhost:8003/docs` (Order Service) or `http://localhost:8001/docs` (User Service) to show interactive OpenAPI documentation.

---

### Minute 7:30 – 9:00 | Automated Testing & CI/CD Pipeline
1. **Automated Test Suite:**
   - Run `python run_tests.py` in the terminal.
   - Point out that **all 40 tests across 6 test suites pass with 100% success**:
     - Unit tests for all 5 services
     - Multi-service end-to-end integration test
2. **GitHub Actions CI/CD:**
   - Open `.github/workflows/ci.yml`.
   - Explain the 3 automated validation jobs:
     - `backend-tests`: Installs Python dependencies and runs Pytest.
     - `frontend-checks`: Runs TypeScript static checking (`tsc`) and Vite production bundle build.
     - `docker-compose-validation`: Validates Compose syntax and builds all container images.

---

## 2. Key Screenshots to Capture for Your Report

Capture these 6 screenshots to include in your project report and slide deck:

1. **Homepage / Restaurant Catalog:** Showing modern glassmorphism UI, restaurant cards, and cuisine filter pills.
2. **Menu Detail & Cart Drawer:** Showing categorized dishes, vegetarian badges, and live cart subtotal.
3. **Checkout Screen:** Showing delivery address input, contact phone, and server-side pricing breakdown.
4. **Live Order Tracker:** Showing the 4-step stepper (`CONFIRMED` $\rightarrow$ `PREPARING` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`) and courier assignment card.
5. **Notification Dropdown:** Showing real-time order alerts with unread badge counter.
6. **Terminal Test Suite:** Terminal output showing `ALL MICROSERVICE AND E2E INTEGRATION TESTS PASSED SUCCESSFULLY! (40/40 tests)`.

---

## 3. Viva Oral Examination Cheat Sheet

Prepare to answer these standard Cloud-Native examination questions:

### Q1: What is the difference between a Docker Image and a Docker Container?
- **Answer:** A **Docker Image** is an immutable, read-only template with application code, libraries, and runtime dependencies (defined by a `Dockerfile`). A **Docker Container** is a running, isolated instance of that image with its own writable filesystem layer, network namespace, and processes.

### Q2: Why use Docker Named Volumes instead of container storage?
- **Answer:** By default, data written inside a container is ephemeral; when the container is deleted or recreated, data is lost. **Docker Named Volumes** (`user_data`, `order_data`) mount host-managed persistent directories outside the container's writable layer, ensuring database files survive container updates and recreation.

### Q3: What is the purpose of the API Gateway (Nginx)?
- **Answer:** The API Gateway acts as a single point of ingress (`port 80`). It shields backend microservices from direct public exposure, routes client requests to appropriate upstream services, eliminates cross-origin (CORS) complications, and serves the static frontend SPA with client-side routing fallback.

### Q4: How do microservices communicate with each other in FoodieHub?
- **Answer:** They use resilient **RESTful HTTP calls via `httpx`**. For example, when placing an order, `order-service` calls `http://restaurant-service:8002/api/restaurants/validate-items` to verify dish prices, then calls `http://delivery-service:8004/api/deliveries` to dispatch a driver, and calls `http://notification-service:8005/api/notifications` to notify the customer. In Docker, container service names resolve automatically via Docker's internal DNS.

### Q5: How is Database-per-Service implemented?
- **Answer:** Each microservice has its own isolated SQLite database (`user.db`, `restaurant.db`, `order.db`, `delivery.db`, `notification.db`). Microservices never query each other's databases directly; all cross-domain data access occurs strictly through authorized HTTP API contracts.

### Q6: What does CI/CD stand for and what does your pipeline do?
- **Answer:** **Continuous Integration and Continuous Deployment (CI/CD)**. In FoodieHub, our GitHub Actions workflow automatically executes on every push and pull request to `main`. It runs all 40 backend pytest tests, verifies TypeScript compilation, builds the production frontend bundle, and builds all Docker images to ensure no breaking changes are merged.
