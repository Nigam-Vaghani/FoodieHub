import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const CartPage: React.FC = () => {
  const {
    items,
    restaurantName,
    restaurantId,
    deliveryFee,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    estimatedTax,
    estimatedTotal,
  } = useCart();

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl" style={{ paddingTop: '60px', textAlign: 'center' }}>
        <div
          className="glass-panel"
          style={{
            maxWidth: '500px',
            margin: '0 auto',
            padding: '50px 30px',
          }}
        >
          <div
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'rgba(249, 115, 22, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              color: 'var(--primary)',
            }}
          >
            <ShoppingBag size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Your Cart is Empty</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
            Explore our curated restaurants and add delicious dishes to start your order.
          </p>
          <Link to="/restaurants" className="btn-primary">
            Explore Restaurants
          </Link>
        </div>
      </div>
    );
  }

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  return (
    <div className="max-w-7xl" style={{ paddingTop: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <Link
            to={restaurantId ? `/restaurants/${restaurantId}` : '/restaurants'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              marginBottom: '6px',
            }}
          >
            <ArrowLeft size={14} /> Back to menu
          </Link>
          <h1 style={{ fontSize: '1.8rem' }}>Your Cart</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Ordering from <strong style={{ color: '#fff' }}>{restaurantName}</strong>
          </p>
        </div>

        <button
          onClick={clearCart}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#f87171',
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Trash2 size={15} /> Clear Cart
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '30px',
          alignItems: 'start',
        }}
      >
        {/* Cart Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {items.map(item => (
            <div
              key={item.menu_item_id}
              className="glass-panel"
              style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <img
                src={item.image_url}
                alt={item.name}
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: 'var(--radius-sm)',
                  objectFit: 'cover',
                }}
              />

              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1.02rem', marginBottom: '4px' }}>{item.name}</h4>
                <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                  ${item.price.toFixed(2)} each
                </div>
              </div>

              {/* Quantity Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Minus size={15} />
                </button>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '18px', textAlign: 'center' }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Line item total */}
              <div style={{ minWidth: '65px', textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>
                ${(item.price * item.quantity).toFixed(2)}
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeFromCart(item.menu_item_id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
                title="Remove item"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            Order Summary
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.92rem', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Items Subtotal</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>${subtotal.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Estimated Sales Tax (5%)</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>${estimatedTax.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Delivery Fee</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>${deliveryFee.toFixed(2)}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '14px',
                fontSize: '1.15rem',
                fontWeight: 700,
              }}
            >
              <span>Estimated Total</span>
              <span style={{ color: 'var(--primary)' }}>${estimatedTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleProceedToCheckout}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
          >
            <span>Proceed to Checkout</span>
            <ArrowRight size={18} />
          </button>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '12px' }}>
            * Actual totals are calculated and verified server-side by the Order Service upon submission.
          </p>
        </div>
      </div>
    </div>
  );
};
