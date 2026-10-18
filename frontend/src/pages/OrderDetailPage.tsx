import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Bike,
  ChefHat,
  PackageCheck,
  RefreshCw,
  Phone,
  MapPin,
  AlertTriangle,
  XCircle,
  Zap,
} from 'lucide-react';
import { orderApi, deliveryApi } from '../api/client';
import { Order, Delivery } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  { key: 'CONFIRMED', label: 'Order Confirmed', icon: CheckCircle2 },
  { key: 'PREPARING', label: 'Kitchen Preparing', icon: ChefHat },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Bike },
  { key: 'DELIVERED', label: 'Delivered', icon: PackageCheck },
];

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    location.state?.orderSuccess ? 'Your order has been placed successfully!' : null
  );

  const fetchOrderAndDelivery = async (isManual = false) => {
    if (!id) return;
    if (isManual) setRefreshing(true);
    setError(null);

    try {
      const orderId = parseInt(id, 10);
      const orderData = await orderApi.getOrder(orderId);
      setOrder(orderData);

      try {
        const deliveryData = await deliveryApi.getDeliveryByOrder(orderId);
        setDelivery(deliveryData);
      } catch {
        // Delivery assignment may be provisioning asynchronously
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve order details');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrderAndDelivery();
    const interval = setInterval(() => fetchOrderAndDelivery(), 8000);
    return () => clearInterval(interval);
  }, [id]);

  const handleCancelOrder = async () => {
    if (!order || !window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const updated = await orderApi.updateOrderStatus(order.id, 'CANCELLED');
      setOrder(updated);
      setSuccessMessage('Order has been cancelled.');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  const [advancing, setAdvancing] = useState(false);

  const getNextStatusLabel = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING':
      case 'CONFIRMED':
        return 'Kitchen Preparing 👨‍🍳';
      case 'PREPARING':
        return 'Out for Delivery 🚴';
      case 'OUT_FOR_DELIVERY':
        return 'Delivered 🎉';
      default:
        return null;
    }
  };

  const handleAdvanceStatus = async () => {
    if (!order) return;
    setAdvancing(true);
    setError(null);
    try {
      const updated = await orderApi.advanceOrderStatus(order.id);
      setOrder(updated);
      setSuccessMessage(`Order status updated to ${updated.status.replace('_', ' ')}! Notification sent.`);
      try {
        const deliveryData = await deliveryApi.getDeliveryByOrder(order.id);
        setDelivery(deliveryData);
      } catch {
        // Delivery data sync
      }
    } catch (err: any) {
      setError(err.message || 'Failed to advance order status.');
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl" style={{ paddingTop: '40px' }}>
        <div className="alert-error">{error || 'Order not found'}</div>
        <Link to="/orders" className="btn-secondary" style={{ marginTop: '16px' }}>
          <ArrowLeft size={16} /> Back to My Orders
        </Link>
      </div>
    );
  }

  const getStepStatus = (stepKey: string) => {
    if (order.status === 'CANCELLED') return 'cancelled';
    const statusOrder = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentIndex = statusOrder.indexOf(order.status);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-7xl" style={{ paddingTop: '30px' }}>
      <Link
        to="/orders"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={14} /> Back to Order History
      </Link>

      {successMessage && (
        <div className="alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {successMessage}
        </div>
      )}

      {/* Order Header Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.6rem' }}>Order #{order.id}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Placed with <strong style={{ color: '#fff' }}>{order.restaurant_name}</strong> on{' '}
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {(user?.role === 'driver' || user?.role === 'admin') && getNextStatusLabel(order.status) && (
            <button
              onClick={handleAdvanceStatus}
              disabled={advancing}
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 16px',
                fontSize: '0.85rem',
                cursor: advancing ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)',
                transition: 'var(--transition)',
              }}
              title="Demo Mode: Advance this order through the real-time lifecycle"
            >
              <Zap size={15} />
              <span>{advancing ? 'Advancing...' : `Advance to: ${getNextStatusLabel(order.status)}`}</span>
            </button>
          )}

          <button
            onClick={() => fetchOrderAndDelivery(true)}
            disabled={refreshing}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spinner' : ''} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>

          {(order.status === 'CONFIRMED' || order.status === 'PENDING') && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 14px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <XCircle size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Live Order Tracker Stepper */}
      {order.status !== 'CANCELLED' ? (
        <div
          className="glass-panel"
          style={{
            padding: '28px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Live Order Status</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
              Auto-updates every 8s
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              position: 'relative',
            }}
          >
            {STEPS.map((step, idx) => {
              const state = getStepStatus(step.key);
              const StepIcon = step.icon;
              const isCompleted = state === 'completed';
              const isCurrent = state === 'current';

              return (
                <div
                  key={step.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: '16px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: isCurrent
                      ? 'rgba(249, 115, 22, 0.12)'
                      : isCompleted
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(255, 255, 255, 0.02)',
                    border: isCurrent
                      ? '1px solid var(--primary)'
                      : isCompleted
                      ? '1px solid rgba(16, 185, 129, 0.3)'
                      : '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: isCurrent
                        ? 'var(--primary)'
                        : isCompleted
                        ? '#10b981'
                        : 'rgba(255, 255, 255, 0.08)',
                      color: isCurrent || isCompleted ? '#fff' : 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '10px',
                      boxShadow: isCurrent ? 'var(--shadow-glow)' : 'none',
                    }}
                  >
                    <StepIcon size={20} />
                  </div>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: isCurrent || isCompleted ? 700 : 500,
                      color: isCurrent ? 'var(--primary)' : isCompleted ? '#34d399' : 'var(--text-dim)',
                    }}
                  >
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Step {idx + 1} of 4
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <AlertTriangle size={24} color="#ef4444" />
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#fca5a5' }}>This order has been cancelled</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No further deliveries or charges will be processed for this order.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Delivery Partner Details & Order Line Items */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Delivery Information */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
            Delivery Assignment
          </h3>

          {delivery ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60a5fa',
                  }}
                >
                  <Bike size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{delivery.driver_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned Courier Partner</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <Phone size={15} color="var(--primary)" />
                <span>Contact: <strong style={{ color: '#fff' }}>{delivery.driver_phone}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-muted)' }}>
                <MapPin size={15} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>Delivering to: <strong style={{ color: '#fff' }}>{order.delivery_address}</strong></span>
              </div>

              {order.notes && (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <strong>Instructions:</strong> {order.notes}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Assigning courier partner via Delivery Service...
            </div>
          )}
        </div>

        {/* Order Line Items & Total Breakdown */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
            Items Ordered ({order.items.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
            {order.items.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.88rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>{item.quantity}x</span> {item.name}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    ${item.unit_price.toFixed(2)} each
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>${item.item_total.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span>
              <span style={{ color: '#fff' }}>${order.subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sales Tax (5%)</span>
              <span style={{ color: '#fff' }}>${order.tax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivery Fee</span>
              <span style={{ color: '#fff' }}>${order.delivery_fee.toFixed(2)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '8px',
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--primary)',
              }}
            >
              <span>Total Paid</span>
              <span>${order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
