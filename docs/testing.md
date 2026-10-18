# FoodieHub — Test Suite & Quality Assurance Documentation

## 1. Test Architecture & Coverage Summary

FoodieHub implements a multi-tier test strategy covering **40 automated tests** across six distinct test suites:

```
=======================================================
  TEST SUITE SUMMARY (python run_tests.py)
=======================================================
  [PASS] 1. user-service         : 9/9  passed
  [PASS] 2. restaurant-service   : 9/9  passed
  [PASS] 3. order-service        : 7/7  passed
  [PASS] 4. delivery-service     : 7/7  passed
  [PASS] 5. notification-service : 7/7  passed
  [PASS] 6. e2e-integration      : 1/1  passed (7-phase multi-service customer flow)
=======================================================
  TOTAL: 40/40 TESTS PASSED (100% SUCCESS RATE)
=======================================================
```

---

## 2. Microservice Test Breakdown

### 2.1 User Service (`services/user-service/tests/test_user_service.py`)
- `test_health_check`: Validates `/health` probe and database connectivity.
- `test_seed_user_login`: Verifies pre-seeded `customer@foodiehub.com` logs in and receives valid JWT token.
- `test_login_invalid_credentials`: Verifies that invalid passwords return `401 Unauthorized`.
- `test_register_new_user`: Tests full registration workflow and password hashing.
- `test_register_duplicate_email`: Ensures unique email constraint returns `409 Conflict`.
- `test_get_current_user_me`: Validates `/api/users/me` bearer token decoding.
- `test_update_profile`: Tests updating full name, phone number, and address.
- `test_cross_user_access_forbidden`: Confirms non-admin users cannot access other profiles.
- `test_unauthorized_without_token`: Confirms protected endpoints reject requests lacking `Authorization` headers.

### 2.2 Restaurant Service (`services/restaurant-service/tests/test_restaurant_service.py`)
- `test_health_check`: Probes database and readiness.
- `test_list_restaurants_returns_seeded_data`: Verifies seeded restaurant catalog returns $\ge 4$ active restaurants.
- `test_filter_restaurants_by_cuisine`: Tests query param filtering by cuisine (e.g., `Italian`).
- `test_get_restaurant_detail`: Verifies menu item associations and category embeddings.
- `test_get_nonexistent_restaurant_returns_404`: Validates 404 response for invalid IDs.
- `test_validate_items_success`: Tests internal validation endpoint for item availability and prices.
- `test_validate_items_invalid_item`: Verifies detection of non-existent item IDs.
- `test_admin_create_restaurant`: Confirms administrative users can add new restaurants.
- `test_customer_cannot_create_restaurant`: Verifies that customer tokens are rejected with `403 Forbidden` on restaurant creation.

### 2.3 Order Service (`services/order-service/tests/test_order_service.py`)
- `test_health_check`: Database probe verification.
- `test_create_order_server_pricing`: **Zero-Trust Pricing Test.** Validates that Subtotal, 5% Tax, and Delivery Fee are computed strictly on the backend and client-submitted prices are ignored.
- `test_order_idempotency`: Verifies that submitting duplicate requests with the same `idempotency_key` returns the existing order rather than charging twice.
- `test_cross_user_order_forbidden`: Validates that Customer B cannot view or cancel Customer A's order (`403 Forbidden`).
- `test_order_status_transitions`: Enforces strict state machine rules (`CONFIRMED` $\rightarrow$ `PREPARING` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`). Direct jumps (e.g. `CONFIRMED` $\rightarrow$ `DELIVERED`) are rejected with `400 Bad Request`.
- `test_advance_order_status_lifecycle`: Verifies the demo advance helper and termination behavior at final state.
- `test_order_creation_inter_service_failure`: Simulates Restaurant Service validation failure / timeout and confirms proper `400/503` handling.

### 2.4 Delivery Service (`services/delivery-service/tests/test_delivery_service.py`)
- `test_health_check`: Probes delivery database readiness.
- `test_create_delivery`: Tests dispatching a courier assignment for an order.
- `test_idempotent_duplicate_delivery`: Asserts that duplicate delivery requests for the same `order_id` return the existing delivery record.
- `test_get_delivery_by_order`: Retrieves delivery status by order ID.
- `test_cross_user_delivery_access_forbidden`: Confirms that delivery details are protected against unauthorized users.
- `test_delivery_status_transitions`: Validates `ASSIGNED` $\rightarrow$ `PICKED_UP` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `DELIVERED`.
- `test_update_delivery_status_by_order_id`: Verifies synchronizing delivery status using order ID.

### 2.5 Notification Service (`services/notification-service/tests/test_notification_service.py`)
- `test_health_check`: Probes notification database readiness.
- `test_create_notification`: Tests event logging for order and delivery milestones.
- `test_duplicate_notification_suppression`: Tests suppression of duplicate events.
- `test_get_user_notifications`: Tests retrieving unread notification list and unread count.
- `test_mark_notification_as_read`: Tests updating notification read status.
- `test_cross_user_read_forbidden`: Verifies user isolation on notification updates.
- `test_mark_all_as_read`: Tests bulk mark-all-as-read operation.

### 2.6 Multi-Service E2E Integration Suite (`tests/test_e2e_integration.py`)
Executes an end-to-end customer journey testing the complete microservices choreography:
1. Authenticate customer with User Service.
2. Browse restaurant catalog and select dishes in Restaurant Service.
3. Place order with Order Service and verify server-side price calculation.
4. Verify auto-creation of delivery assignment in Delivery Service.
5. Verify in-app notification dispatch in Notification Service.
6. Attempt cross-user unauthorized access and assert `403 Forbidden`.
7. Advance order through state progression and verify delivery synchronization.

---

## 3. How to Run Tests

### Run All 40 Tests (Single Command):
```bash
python run_tests.py
```

### Run an Individual Microservice Test Suite:
```bash
# Order Service
pytest services/order-service/tests/ -v

# User Service
pytest services/user-service/tests/ -v

# End-to-End Integration Test
pytest tests/test_e2e_integration.py -v
```

### Run Frontend Static Typecheck & Build:
```bash
cd frontend
npm run build
```
Ensures zero TypeScript compile errors and valid production bundle distribution.
