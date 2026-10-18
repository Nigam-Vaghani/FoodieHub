import React from 'react';
import { Plus, Minus, Leaf } from 'lucide-react';
import { MenuItem, Restaurant } from '../types';
import { useCart } from '../context/CartContext';

interface FoodItemCardProps {
  item: MenuItem;
  restaurant: Restaurant;
}

export const FoodItemCard: React.FC<FoodItemCardProps> = ({ item, restaurant }) => {
  const { items, addToCart, updateQuantity } = useCart();
  const cartItem = items.find(i => i.menu_item_id === item.id);

  const handleAdd = () => {
    addToCart(item, restaurant, 1);
  };

  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-color 0.2s ease',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '160px', overflow: 'hidden' }}>
        <img
          src={item.image_url}
          alt={item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          loading="lazy"
        />
        {item.is_vegetarian && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(16, 185, 129, 0.9)',
              color: '#fff',
              borderRadius: 'var(--radius-full)',
              padding: '2px 8px',
              fontSize: '0.7rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Leaf size={11} /> Veg
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            background: 'rgba(10, 14, 23, 0.9)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px 8px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {item.category}
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <h4 style={{ fontSize: '1.05rem', color: '#fff' }}>{item.name}</h4>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              color: 'var(--primary)',
              fontSize: '1.1rem',
              marginLeft: '8px',
            }}
          >
            ${item.price.toFixed(2)}
          </span>
        </div>

        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            lineHeight: '1.4',
            marginBottom: '16px',
            flex: 1,
          }}
        >
          {item.description}
        </p>

        <div style={{ marginTop: 'auto' }}>
          {!item.is_available ? (
            <button
              disabled
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-dim)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
                cursor: 'not-allowed',
              }}
            >
              Currently Unavailable
            </button>
          ) : cartItem ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(249, 115, 22, 0.15)',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
              }}
            >
              <button
                onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
              >
                <Minus size={16} />
              </button>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                {cartItem.quantity} in cart
              </span>
              <button
                onClick={() => updateQuantity(item.id, cartItem.quantity + 1)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="btn-primary"
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.88rem' }}
            >
              <Plus size={16} /> Add to Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
