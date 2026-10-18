import {
  AuthResponse,
  User,
  Restaurant,
  RestaurantDetail,
  Order,
  Delivery,
  NotificationListResponse,
  Notification,
} from '../types';

const API_BASE = ''; // Relative URLs will be proxied by Vite in dev and Nginx in production

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('foodiehub_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    let data = null;
    try {
      data = await response.json();
      if (data && data.detail) {
        errorDetail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // not JSON
    }

    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('foodiehub_token');
      localStorage.removeItem('foodiehub_user');
      window.dispatchEvent(new Event('auth-change'));
    }

    throw new ApiError(errorDetail, response.status, data);
  }

  return response.json();
}

// -------------------------------------------------------------
// USER API
// -------------------------------------------------------------
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    request<AuthResponse>('/api/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    address?: string;
    role?: string;
  }) =>
    request<AuthResponse>('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getMe: () => request<User>('/api/users/me'),

  updateProfile: (data: { full_name?: string; phone?: string; address?: string }) =>
    request<User>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// -------------------------------------------------------------
// RESTAURANT API
// -------------------------------------------------------------
export const restaurantApi = {
  getRestaurants: (params?: { cuisine?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.cuisine) query.set('cuisine', params.cuisine);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return request<Restaurant[]>(`/api/restaurants${qs ? `?${qs}` : ''}`);
  },

  getRestaurant: (id: number) =>
    request<RestaurantDetail>(`/api/restaurants/${id}`),
};

// -------------------------------------------------------------
// ORDER API
// -------------------------------------------------------------
export const orderApi = {
  createOrder: (orderData: {
    restaurant_id: number;
    items: { menu_item_id: number; quantity: number }[];
    delivery_address: string;
    contact_phone: string;
    notes?: string;
    idempotency_key?: string;
  }) =>
    request<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  getOrders: () => request<Order[]>('/api/orders'),

  getOrder: (id: number) => request<Order>(`/api/orders/${id}`),

  updateOrderStatus: (id: number, status: string) =>
    request<Order>(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  advanceOrderStatus: (id: number) =>
    request<Order>(`/api/orders/${id}/advance-status`, {
      method: 'POST',
    }),
};

// -------------------------------------------------------------
// DELIVERY API
// -------------------------------------------------------------
export const deliveryApi = {
  getDeliveryByOrder: (orderId: number) =>
    request<Delivery>(`/api/deliveries/order/${orderId}`),

  getDeliveries: () => request<Delivery[]>('/api/deliveries'),

  updateDeliveryStatus: (id: number, status: string) =>
    request<Delivery>(`/api/deliveries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// -------------------------------------------------------------
// NOTIFICATION API
// -------------------------------------------------------------
export const notificationApi = {
  getNotifications: () =>
    request<NotificationListResponse>('/api/notifications'),

  markAsRead: (id: number) =>
    request<Notification>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllAsRead: () =>
    request<{ message: string }>('/api/notifications/read-all', {
      method: 'PATCH',
    }),
};
