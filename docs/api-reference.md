# FoodieHub — Complete API Reference & Route Inventory

This document details all REST API endpoints across the five FoodieHub microservices and the Nginx API Gateway.

---

## 1. Gateway & Health Probes

| Method | Endpoint | Upstream Target | Description | Auth Required |
| :--- | :--- | :--- | :--- | :---: |
| `GET` | `/gateway-health` | Nginx Internal | Probes API Gateway health status | No |
| `GET` | `http://localhost:8001/health` | User Service | User Service DB connection probe | No |
| `GET` | `http://localhost:8002/health` | Restaurant Service | Restaurant Service DB probe | No |
| `GET` | `http://localhost:8003/health` | Order Service | Order Service DB probe | No |
| `GET` | `http://localhost:8004/health` | Delivery Service | Delivery Service DB probe | No |
| `GET` | `http://localhost:8005/health` | Notification Service | Notification Service DB probe | No |

---

## 2. User Service Endpoints (`/api/users`)

### `POST /api/users/register`
Creates a new customer account.
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!",
    "full_name": "Jane Doe",
    "phone": "+1-555-0199",
    "address": "456 Oak Avenue, Springfield"
  }
  ```
- **Response `201 Created`**: User profile object (without password hash).

### `POST /api/users/login`
Authenticates a user and returns a signed JWT.
- **Request Body**:
  ```json
  {
    "email": "customer@foodiehub.com",
    "password": "Password123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "customer@foodiehub.com",
      "full_name": "Alice Customer",
      "role": "customer"
    }
  }
  ```

### `GET /api/users/me`
Fetches the currently authenticated user's profile.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: User profile object.

### `PUT /api/users/me`
Updates user profile contact and delivery details.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "full_name": "Alice C. Smith",
    "phone": "+1-555-9988",
    "address": "789 Pine Road, Springfield"
  }
  ```
- **Response `200 OK`**: Updated user profile.

---

## 3. Restaurant Service Endpoints (`/api/restaurants`)

### `GET /api/restaurants`
Retrieves all active restaurants. Supports filtering.
- **Query Parameters**:
  - `cuisine` (optional): Filter by cuisine type (e.g. `Italian`, `Indian`, `Japanese`, `American`).
  - `search` (optional): Case-insensitive search on restaurant name or description.
- **Response `200 OK`**: Array of restaurant summaries.

### `GET /api/restaurants/{id}`
Returns complete restaurant details including active menu items categorized by section.
- **Response `200 OK`**: Restaurant details object with embedded `menu_items` array.

### `GET /api/restaurants/{id}/menu`
Returns only the menu items for the specified restaurant.
- **Response `200 OK`**: Array of menu items.

### `POST /api/restaurants/validate-items` *(Internal Service-to-Service)*
Used by Order Service to validate dish existence, availability, and unit prices server-side.
- **Request Body**:
  ```json
  {
    "restaurant_id": 1,
    "item_ids": [1, 2]
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "restaurant_id": 1,
    "restaurant_name": "Bella Italia Trattoria",
    "delivery_fee": 3.99,
    "is_restaurant_active": true,
    "all_valid": true,
    "errors": [],
    "items": [
      { "id": 1, "name": "Margherita Pizza", "price": 14.99, "is_available": true },
      { "id": 2, "name": "Truffle Tagliatelle", "price": 18.50, "is_available": true }
    ]
  }
  ```

---

## 4. Order Service Endpoints (`/api/orders`)

### `POST /api/orders`
Places a new food order. Computes server-verified pricing.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "restaurant_id": 1,
    "items": [
      { "menu_item_id": 1, "quantity": 2 },
      { "menu_item_id": 2, "quantity": 1 }
    ],
    "delivery_address": "742 Evergreen Terrace, Springfield",
    "contact_phone": "+1-555-0101",
    "notes": "Leave at front doorstep",
    "idempotency_key": "uuid-v4-string"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": 1,
    "user_id": 1,
    "restaurant_id": 1,
    "restaurant_name": "Bella Italia Trattoria",
    "subtotal": 48.48,
    "tax": 2.42,
    "delivery_fee": 3.99,
    "total_amount": 54.89,
    "status": "CONFIRMED",
    "delivery_address": "742 Evergreen Terrace, Springfield",
    "items": [...],
    "created_at": "2026-10-18T19:00:00Z"
  }
  ```

### `GET /api/orders`
Lists all orders for the authenticated user (or all system orders if admin).
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Array of orders sorted descending by creation date.

### `GET /api/orders/{id}`
Returns details for a specific order. Enforces cross-user ownership isolation.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Order detail object.
- **Error `403 Forbidden`**: When accessing an order belonging to another customer.

### `PATCH /api/orders/{id}/status`
Transitions an order to a new state. Requires admin, driver, or order owner (for cancel).
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: `{"status": "PREPARING"}`
- **Response `200 OK`**: Updated order object.

### `POST /api/orders/{id}/advance-status` *(Demo / Presentation Helper)*
Advances an order forward through its natural lifecycle:
`CONFIRMED` $\rightarrow$ `PREPARING` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Advanced order object.

---

## 5. Delivery Service Endpoints (`/api/deliveries`)

### `POST /api/deliveries`
Dispatches a new delivery assignment. Idempotent per order ID.
- **Request Body**:
  ```json
  {
    "order_id": 1,
    "user_id": 1,
    "restaurant_id": 1,
    "pickup_address": "Bella Italia Kitchen, 42 Culinary Ave",
    "dropoff_address": "742 Evergreen Terrace, Springfield",
    "estimated_minutes": 30
  }
  ```
- **Response `201 Created`**: Delivery record with courier Alex Rivera assigned.

### `GET /api/deliveries/order/{order_id}`
Retrieves the courier delivery tracking record for a specific order.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Delivery tracking object (`status`, `driver_name`, `driver_phone`, `estimated_minutes`).

### `PATCH /api/deliveries/order/{order_id}/status`
Synchronizes the courier status for an order (`PICKED_UP`, `IN_TRANSIT`, `DELIVERED`).
- **Request Body**: `{"status": "IN_TRANSIT"}`
- **Response `200 OK`**: Updated delivery object.

---

## 6. Notification Service Endpoints (`/api/notifications`)

### `POST /api/notifications`
Records an in-app notification event.
- **Request Body**:
  ```json
  {
    "user_id": 1,
    "order_id": 1,
    "title": "Order Out for Delivery",
    "message": "Courier Alex Rivera is heading your way!",
    "type": "ORDER_STATUS_UPDATE"
  }
  ```
- **Response `201 Created`**: Notification record.

### `GET /api/notifications`
Retrieves all notifications for the authenticated user, including unread count.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
  ```json
  {
    "unread_count": 2,
    "total_count": 5,
    "notifications": [...]
  }
  ```

### `PATCH /api/notifications/{id}/read`
Marks a specific notification as read.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Updated notification.

### `PATCH /api/notifications/read-all`
Marks all notifications as read for the current user.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: `{"message": "All notifications marked as read"}`
