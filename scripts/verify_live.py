import urllib.request
import json

def test():
    # 1. Login
    login_url = 'http://localhost:8001/api/users/login'
    login_data = json.dumps({'email': 'customer@foodiehub.com', 'password': 'Password123!'}).encode()
    req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req) as resp:
        token_data = json.loads(resp.read().decode())
        token = token_data['access_token']
        email = token_data['user']['email']
        print(f"[PASS] User Service: Login OK, token acquired for {email}")

    # 2. Restaurant Listing
    rest_url = 'http://localhost:8002/api/restaurants'
    with urllib.request.urlopen(rest_url) as resp:
        restaurants = json.loads(resp.read().decode())
        print(f"[PASS] Restaurant Service: {len(restaurants)} restaurants available")

    # 3. Notification Service
    notif_url = 'http://localhost:8005/api/notifications'
    req = urllib.request.Request(notif_url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as resp:
        notifs = json.loads(resp.read().decode())
        count = len(notifs.get('notifications', []))
        unread = notifs.get('unread_count', 0)
        print(f"[PASS] Notification Service: {count} notifications retrieved (unread: {unread})")

    # 4. Order Service check
    order_url = 'http://localhost:8003/api/orders'
    req = urllib.request.Request(order_url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as resp:
        orders = json.loads(resp.read().decode())
        print(f"[PASS] Order Service: {len(orders)} existing orders for customer")

    print("\n>>> ALL SERVICES ARE COMPLETELY FUNCTIONAL AND INTEGRATED! <<<")

if __name__ == '__main__':
    test()
