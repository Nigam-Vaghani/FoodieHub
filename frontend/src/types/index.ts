export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string | null;
  address?: string | null;
  role: 'customer' | 'admin' | 'driver';
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface MenuItem {
  id: number;
  restaurant_id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_available: boolean;
  is_vegetarian: boolean;
  created_at?: string;
}

export interface Restaurant {
  id: number;
  name: string;
  description: string;
  cuisine_type: string;
  address: string;
  phone: string;
  rating: number;
  delivery_time_mins: number;
  delivery_fee: number;
  image_url: string;
  is_active: boolean;
  created_at?: string;
}

export interface RestaurantDetail extends Restaurant {
  menu_items: MenuItem[];
}

export interface CartItem {
  menu_item_id: number;
  restaurant_id: number;
  restaurant_name: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
}

export interface OrderItem {
  id: number;
  menu_item_id: number;
  name: string;
  unit_price: number;
  quantity: number;
  item_total: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Order {
  id: number;
  user_id: number;
  restaurant_id: number;
  restaurant_name: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  delivery_fee: number;
  total_amount: number;
  delivery_address: string;
  contact_phone: string;
  notes?: string | null;
  idempotency_key?: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export type DeliveryStatus =
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED';

export interface Delivery {
  id: number;
  order_id: number;
  user_id: number;
  restaurant_id: number;
  driver_name: string;
  driver_phone: string;
  status: DeliveryStatus;
  pickup_address: string;
  dropoff_address: string;
  estimated_delivery_time?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  order_id?: number | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unread_count: number;
  total_count: number;
}
