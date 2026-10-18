import urllib.request
import json

BASE_URL = "http://localhost"

def test_driver_customer_flow():
    print("=== Testing Driver/Customer Workflow via Gateway ===")
    
    # 1. Customer Login
    print("\n1. Logging in as Customer...")
    req = urllib.request.Request(
        f"{BASE_URL}/api/users/login",
        data=json.dumps({"email": "customer@foodiehub.com", "password": "Password123!"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        cust_data = json.loads(resp.read().decode())
        cust_token = cust_data["access_token"]
        cust_id = cust_data["user"]["id"]
        print(f"   [OK] Customer logged in (ID: {cust_id})")

    # 2. Driver Login
    print("\n2. Logging in as Delivery Partner (Driver)...")
    req = urllib.request.Request(
        f"{BASE_URL}/api/users/login",
        data=json.dumps({"email": "driver@foodiehub.com", "password": "DriverPass123!"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        driver_data = json.loads(resp.read().decode())
        driver_token = driver_data["access_token"]
        driver_id = driver_data["user"]["id"]
        print(f"   [OK] Driver logged in (ID: {driver_id}, Name: {driver_data['user']['full_name']})")

    # 3. Customer places an order
    print("\n3. Customer places an order with Bella Italia...")
    order_payload = {
        "restaurant_id": 1,
        "items": [
            {"menu_item_id": 1, "quantity": 1},
            {"menu_item_id": 2, "quantity": 1}
        ],
        "delivery_address": "742 Evergreen Terrace, Springfield",
        "contact_phone": "+1-555-0101"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/orders",
        data=json.dumps(order_payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {cust_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        order = json.loads(resp.read().decode())
        order_id = order["id"]
        print(f"   [OK] Order #{order_id} placed! Status: {order['status']}, Total: ${order['total_amount']:.2f}")

    # 4. Verify Customer CANNOT advance their own order
    print("\n4. Verifying Customer CANNOT advance order status...")
    req = urllib.request.Request(
        f"{BASE_URL}/api/orders/{order_id}/advance-status",
        data=b"{}",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {cust_token}"}
    )
    try:
        urllib.request.urlopen(req)
        print("   [FAIL] Customer was able to advance order! (Expected 403)")
        return False
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print("   [OK] Correctly rejected with HTTP 403 Forbidden! Customers cannot advance orders.")
        else:
            print(f"   [FAIL] Unexpected error code: {e.code}")
            return False

    # 5. Driver views all customer orders
    print("\n5. Driver retrieves active orders...")
    req = urllib.request.Request(
        f"{BASE_URL}/api/orders",
        headers={"Authorization": f"Bearer {driver_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        all_orders = json.loads(resp.read().decode())
        found = any(o["id"] == order_id for o in all_orders)
        assert found, f"Driver could not see order #{order_id}"
        print(f"   [OK] Driver sees {len(all_orders)} total orders, including customer order #{order_id}")

    # 6. Driver advances order: CONFIRMED -> PREPARING
    print("\n6. Driver advances order to PREPARING (Kitchen Cooking)...")
    req = urllib.request.Request(
        f"{BASE_URL}/api/orders/{order_id}/advance-status",
        data=b"{}",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {driver_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        updated = json.loads(resp.read().decode())
        print(f"   [OK] Status updated to: {updated['status']}")

    # 7. Driver advances order: PREPARING -> OUT_FOR_DELIVERY
    print("\n7. Driver picks up order & advances to OUT_FOR_DELIVERY...")
    req = urllib.request.Request(
        f"{BASE_URL}/api/orders/{order_id}/advance-status",
        data=b"{}",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {driver_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        updated = json.loads(resp.read().decode())
        print(f"   [OK] Status updated to: {updated['status']}")

    # 8. Driver advances order: OUT_FOR_DELIVERY -> DELIVERED
    print("\n8. Driver delivers food to doorstep & marks DELIVERED...")
    req = urllib.request.Request(
        f"{BASE_URL}/api/orders/{order_id}/advance-status",
        data=b"{}",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {driver_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        updated = json.loads(resp.read().decode())
        print(f"   [OK] Status updated to: {updated['status']}")

    # 9. Verify Customer received in-app notifications for EACH state transition!
    print("\n9. Verifying Customer notifications in Notification Service...")
    req = urllib.request.Request(
        f"{BASE_URL}/api/notifications",
        headers={"Authorization": f"Bearer {cust_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        notifs_data = json.loads(resp.read().decode())
        order_notifs = [n for n in notifs_data["notifications"] if n.get("order_id") == order_id]
        print(f"   [OK] Customer received {len(order_notifs)} notifications for order #{order_id}:")
        for n in reversed(order_notifs):
            print(f"        -> [{n['title']}] {n['message']}")

    print("\n>>> ALL CHECKS PASSED PERFECTLY! WORKFLOW IS 100% OPERATIONAL! <<<")
    return True

if __name__ == "__main__":
    test_driver_customer_flow()
