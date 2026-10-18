import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Phone, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../api/client';

export const CheckoutPage: React.FC = () => {
  const { items, restaurantId, restaurantName, deliveryFee, subtotal, estimatedTax, estimatedTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0 || !restaurantId) {
    return (
      <div className="max-w-7xl" style={{ paddingTop: '60px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '480px', margin: '0 auto', padding: '40px 20px' }}>
          <h2>No items to checkout</h2>
          <p style={{ color: 'var(--text-muted)', margin: '16px 0' }}>Please add dishes to your cart first.</p>
          <Link to="/restaurants" className="btn-primary">Browse Restaurants</Link>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      setError('Please provide a valid delivery address');
      return;
    }
    if (!contactPhone.trim()) {
      setError('Please provide a contact phone number');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Generate idempotency key for this order attempt
    const idempotencyKey = `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const orderPayload = {
        restaurant_id: restaurantId,
        items: items.map(i => ({
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
        })),
        delivery_address: deliveryAddress.trim(),
        contact_phone: contactPhone.trim(),
        notes: notes.trim() || undefined,
        idempotency_key: idempotencyKey,
      };

      const placedOrder = await orderApi.createOrder(orderPayload);
      clearCart();
      navigate(`/orders/${placedOrder.id}`, { state: { orderSuccess: true } });
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please review your cart and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl" style={{ paddingTop: '30px' }}>
      <Link
        to="/cart"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={14} /> Back to Cart
      </Link>

      <h1 style={{ fontSize: '1.8rem', marginBottom: '24px' }}>Checkout</h1>

      {error && <div className="alert-error">{error}</div>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '30px',
          alignItems: 'start',
        }}
      >
        {/* Delivery Details Form */}
        <form onSubmit={handlePlaceOrder} className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            Delivery Details
          </h3>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} color="var(--primary)" /> Delivery Address *
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. 123 Gourmet Street, Apt 4B, Springfield"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={15} color="var(--primary)" /> Contact Phone *
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. +1-555-0101"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} color="var(--primary)" /> Delivery Instructions (Optional)
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Please leave bag by the apartment door and ring bell."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              marginTop: '20px',
              fontSize: '0.82rem',
              color: '#a7f3d0',
            }}
          >
            <ShieldCheck size={20} color="#10b981" />
            <span>Server-side verification active. Prices are validated live against restaurant database.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{ width: '100%', marginTop: '24px', padding: '12px', fontSize: '1rem' }}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                Placing Order...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> Confirm & Place Order (${estimatedTotal.toFixed(2)})
              </span>
            )}
          </button>
        </form>

        {/* Order Review Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
            Review Items from {restaurantName}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {items.map(item => (
              <div
                key={item.menu_item_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.9rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>{item.quantity}x</span> {item.name}
                </div>
                <div style={{ fontWeight: 600 }}>${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '0.88rem',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <span style={{ color: '#fff' }}>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax (5%)</span>
              <span style={{ color: '#fff' }}>${estimatedTax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivery Fee</span>
              <span style={{ color: '#fff' }}>${deliveryFee.toFixed(2)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '10px',
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--primary)',
              }}
            >
              <span>Total Due</span>
              <span>${estimatedTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
