import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, MenuItem, Restaurant } from '../types';

interface CartContextType {
  items: CartItem[];
  restaurantId: number | null;
  restaurantName: string | null;
  deliveryFee: number;
  addToCart: (item: MenuItem, restaurant: Restaurant, quantity?: number) => boolean;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  removeFromCart: (menuItemId: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  estimatedTax: number;
  estimatedTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('foodiehub_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [restaurantId, setRestaurantId] = useState<number | null>(() => {
    const saved = localStorage.getItem('foodiehub_cart_rest_id');
    return saved ? parseInt(saved, 10) : null;
  });
  const [restaurantName, setRestaurantName] = useState<string | null>(() => {
    return localStorage.getItem('foodiehub_cart_rest_name');
  });
  const [deliveryFee, setDeliveryFee] = useState<number>(() => {
    const saved = localStorage.getItem('foodiehub_cart_delivery_fee');
    return saved ? parseFloat(saved) : 2.99;
  });

  useEffect(() => {
    localStorage.setItem('foodiehub_cart', JSON.stringify(items));
    if (restaurantId !== null) {
      localStorage.setItem('foodiehub_cart_rest_id', restaurantId.toString());
    } else {
      localStorage.removeItem('foodiehub_cart_rest_id');
    }
    if (restaurantName) {
      localStorage.setItem('foodiehub_cart_rest_name', restaurantName);
    } else {
      localStorage.removeItem('foodiehub_cart_rest_name');
    }
    localStorage.setItem('foodiehub_cart_delivery_fee', deliveryFee.toString());
  }, [items, restaurantId, restaurantName, deliveryFee]);

  const addToCart = (item: MenuItem, restaurant: Restaurant, quantity = 1): boolean => {
    // If cart has items from another restaurant, confirm reset
    if (restaurantId !== null && restaurantId !== restaurant.id && items.length > 0) {
      const confirmReset = window.confirm(
        `Your cart already has items from ${restaurantName || 'another restaurant'}. Do you want to clear your cart and start a new order from ${restaurant.name}?`
      );
      if (!confirmReset) return false;

      // Reset cart for new restaurant
      setItems([{
        menu_item_id: item.id,
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        name: item.name,
        price: item.price,
        quantity,
        image_url: item.image_url,
      }]);
      setRestaurantId(restaurant.id);
      setRestaurantName(restaurant.name);
      setDeliveryFee(restaurant.delivery_fee);
      return true;
    }

    setRestaurantId(restaurant.id);
    setRestaurantName(restaurant.name);
    setDeliveryFee(restaurant.delivery_fee);

    setItems(prevItems => {
      const existing = prevItems.find(i => i.menu_item_id === item.id);
      if (existing) {
        return prevItems.map(i =>
          i.menu_item_id === item.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [
        ...prevItems,
        {
          menu_item_id: item.id,
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          name: item.name,
          price: item.price,
          quantity,
          image_url: item.image_url,
        },
      ];
    });

    return true;
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setItems(prev =>
      prev.map(i => (i.menu_item_id === menuItemId ? { ...i, quantity } : i))
    );
  };

  const removeFromCart = (menuItemId: number) => {
    setItems(prev => {
      const next = prev.filter(i => i.menu_item_id !== menuItemId);
      if (next.length === 0) {
        setRestaurantId(null);
        setRestaurantName(null);
      }
      return next;
    });
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
    setRestaurantName(null);
    localStorage.removeItem('foodiehub_cart');
    localStorage.removeItem('foodiehub_cart_rest_id');
    localStorage.removeItem('foodiehub_cart_rest_name');
  };

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = Math.round(items.reduce((acc, item) => acc + item.price * item.quantity, 0) * 100) / 100;
  const estimatedTax = Math.round(subtotal * 0.05 * 100) / 100;
  const estimatedTotal = items.length > 0 ? Math.round((subtotal + estimatedTax + deliveryFee) * 100) / 100 : 0;

  return (
    <CartContext.Provider
      value={{
        items,
        restaurantId,
        restaurantName,
        deliveryFee,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        subtotal,
        estimatedTax,
        estimatedTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
