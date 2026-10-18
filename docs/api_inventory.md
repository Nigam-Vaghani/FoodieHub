# FoodieHub — Complete Backend API Inventory & Service Documentation

## 1. Overview
FoodieHub consists of five autonomous FastAPI microservices, each with its own independent database, health checks, Swagger/OpenAPI documentation, and business domain logic.

---

## 2. Default Seed Credentials (Development)
Upon first startup, the databases are automatically seeded with realistic accounts:

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| **Customer** | `customer@foodiehub.com` | `Password123!` | Standard customer account for placing orders and notifications |
| **Administrator** | `admin@foodiehub.com` | `AdminPass123!` | Management account for restaurant catalog & system control |
| **Driver / Courier** | `driver@foodiehub.com` | `DriverPass123!` | Delivery partner account for handling deliveries |

---

## 3. Microservice Endpoints Inventory

### A. User Service (`port: 8001`, DB: `data/user.db`)
Swagger UI: `http://localhost:8001/docs`

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/health` | No | Liveness and database connectivity probe |
| `GET` | `/ready` | No | Readiness probe for container orchestrator |
| `POST` | `/api/users/register` | No | Register a new user (`email`, `password`, `full_name`, `phone`, `address`, `role`) |
| `POST` | `/api/users/login` | No | Authenticate user credentials and issue JWT access token |
| `GET` | `/api/users/me` | Bearer Token | Retrieve authenticated user's profile |
| `PUT` | `/api/users/me` | Bearer Token | Update authenticated user profile |
| `GET` | `/api/users/{user_id}` | Bearer Token | Retrieve user by ID (Self or Admin only) |

---

### B. Restaurant Service (`port: 8002`, DB: `data/restaurant.db`)
Swagger UI: `http://localhost:8002/docs`

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/health` | No | Liveness and database connectivity probe |
| `GET` | `/ready` | No | Readiness probe |
| `GET` | `/api/restaurants` | No | List restaurants (filterable by `cuisine`, `search`, `active_only`) |
| `GET` | `/api/restaurants/{id}` | No | Get restaurant details and complete menu items |
| `POST` | `/api/restaurants` | Admin Token | Create a new restaurant |
| `PUT` | `/api/restaurants/{id}` | Admin Token | Update restaurant information |
| `GET` | `/api/restaurants/{id}/menu` | No | Retrieve menu items for a restaurant |
| `POST` | `/api/restaurants/{id}/menu` | Admin Token | Add a menu item to restaurant |
| `PUT` | `/api/restaurants/{id}/menu/{item_id}`| Admin Token | Update an existing menu item |
| `POST` | `/api/restaurants/validate-items` | Internal | Validate item IDs, availability, and pricing for Order Service |

---

### C. Order Service (`port: 8003`, DB: `data/order.db`)
Swagger UI: `http://localhost:8003/docs`

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/health` | No | Liveness and database connectivity probe |
| `GET` | `/ready` | No | Readiness probe |
| `POST` | `/api/orders` | Bearer Token | Place order with verified server-side pricing & idempotency |
| `GET` | `/api/orders` | Bearer Token | Retrieve current user's order history (or all if Admin) |
| `GET` | `/api/orders/{id}` | Bearer Token | Retrieve order details with items (User isolated) |
| `PATCH` | `/api/orders/{id}/status` | Bearer Token | Transition order status (`CONFIRMED` -> `PREPARING` -> `OUT_FOR_DELIVERY` -> `DELIVERED`, or `CANCELLED`) |

---

### D. Delivery Service (`port: 8004`, DB: `data/delivery.db`)
Swagger UI: `http://localhost:8004/docs`

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/health` | No | Liveness and database connectivity probe |
| `GET` | `/ready` | No | Readiness probe |
| `POST` | `/api/deliveries` | Internal / Auth | Create delivery assignment (Idempotent per `order_id`) |
| `GET` | `/api/deliveries/order/{order_id}` | Bearer Token | Get delivery assignment details for an order |
| `GET` | `/api/deliveries/{id}` | Bearer Token | Get delivery by ID |
| `GET` | `/api/deliveries` | Bearer Token | List deliveries (user isolated, all for Driver/Admin) |
| `PATCH` | `/api/deliveries/{id}/status` | Driver/Admin | Update delivery status (`ASSIGNED` -> `PICKED_UP` -> `IN_TRANSIT` -> `DELIVERED`) |

---

### E. Notification Service (`port: 8005`, DB: `data/notification.db`)
Swagger UI: `http://localhost:8005/docs`

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/health` | No | Liveness and database connectivity probe |
| `GET` | `/ready` | No | Readiness probe |
| `POST` | `/api/notifications` | Internal / Auth | Create in-app notification with deduplication window |
| `GET` | `/api/notifications` | Bearer Token | Retrieve current user's in-app notifications |
| `PATCH` | `/api/notifications/{id}/read` | Bearer Token | Mark a notification as read (User isolated) |
| `PATCH` | `/api/notifications/read-all` | Bearer Token | Mark all notifications as read for current user |

---

## 4. Inter-Service Communication Flow (Order Placement)

```
[Client / Frontend]
        │
        ▼ (POST /api/orders)
[Order Service]
        │
        ├──────► (POST /api/restaurants/validate-items) ──► [Restaurant Service]
        │        ◄── Validated prices, availability, delivery fee ───┘
        │
        ├──────► Persists Order & Items in SQLite DB with Server-Calculated Pricing
        │
        ├──────► (POST /api/deliveries) ──────────────────► [Delivery Service]
        │        ◄── Returns delivery assignment ────────────┘
        │
        └──────► (POST /api/notifications) ───────────────► [Notification Service]
                 ◄── In-app notification persisted ──────────┘
```
