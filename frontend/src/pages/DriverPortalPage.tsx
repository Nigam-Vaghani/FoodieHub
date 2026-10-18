import React, { useState, useEffect } from 'react';
import {
  Bike,
  CheckCircle2,
  ChefHat,
  MapPin,
  Phone,
  RefreshCw,
  ShoppingBag,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { orderApi } from '../api/client';
import { Order } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const DriverPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ACTIVE');

  const fetchAllOrders = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setErrorMessage(null);
    try {
      const data = await orderApi.getOrders();
      setOrders(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load delivery assignments.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
    const interval = setInterval(() => fetchAllOrders(), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAdvanceStatus = async (orderId: number) => {
    setProcessingId(orderId);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const updated = await orderApi.advanceOrderStatus(orderId);
      setOrders(prev => prev.map(o => (o.id === orderId ? updated : o)));
      setStatusMessage(
        `Order #${orderId} successfully transitioned to ${updated.status.replace('_', ' ')}! Real-time notification delivered to customer.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to advance order #${orderId}`);
    } finally {
      setProcessingId(null);
    }
  };

  const getActionDetails = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return {
          label: 'Mark Kitchen Preparing',
          nextState: 'PREPARING',
          icon: ChefHat,
          color: '#f59e0b',
        };
      case 'PREPARING':
        return {
          label: 'Pick Up & Out for Delivery',
          nextState: 'OUT_FOR_DELIVERY',
          icon: Bike,
          color: '#f97316',
        };
      case 'OUT_FOR_DELIVERY':
        return {
          label: 'Mark as Delivered',
          nextState: 'DELIVERED',
          icon: CheckCircle2,
          color: '#10b981',
        };
      default:
        return null;
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'ACTIVE') {
      return o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'OUT_FOR_DELIVERY';
    }
    if (filter === 'COMPLETED') {
      return o.status === 'DELIVERED' || o.status === 'CANCELLED';
    }
    return true;
  });

  const activeCount = orders.filter(o => ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(o.status)).length;
  const inTransitCount = orders.filter(o => o.status === 'OUT_FOR_DELIVERY').length;
  const deliveredCount = orders.filter(o => o.status === 'DELIVERED').length;

  return (
    <div className="max-w-7xl" style={{ paddingTop: '30px', paddingBottom: '60px' }}>
      {/* Driver Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '28px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(20, 24, 33, 0.95) 100%)',
          border: '1px solid rgba(249, 115, 22, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Bike size={20} />
              </div>
              <h1 style={{ fontSize: '1.6rem' }}>Delivery Partner Portal</h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ShieldCheck size={12} /> COURIER LOGISTICS
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Logged in as <strong style={{ color: '#fff' }}>{user?.full_name || 'Alex Rivera'}</strong> ({user?.email}).
              You have full operational authorization to manage deliveries and trigger real-time customer status updates.
            </p>
          </div>

          <button
            onClick={() => fetchAllOrders(true)}
            disabled={refreshing}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spinner' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Assignments'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="glass-panel" style={{ padding: '18px 24px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pending & Active Tasks</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
            {activeCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 24px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Currently En Route</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            {inTransitCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 24px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Delivered Today</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {deliveredCount}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {statusMessage && (
        <div className="alert-success" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="alert-error" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setFilter('ACTIVE')}
          className={filter === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '6px 16px', fontSize: '0.85rem' }}
        >
          Active Deliveries ({activeCount})
        </button>
        <button
          onClick={() => setFilter('ALL')}
          className={filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '6px 16px', fontSize: '0.85rem' }}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setFilter('COMPLETED')}
          className={filter === 'COMPLETED' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '6px 16px', fontSize: '0.85rem' }}
        >
          Completed ({deliveredCount})
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <CheckCircle2 size={48} style={{ color: '#10b981', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>No Deliveries in this View</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            All current orders have been completed or there are no new orders placed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredOrders.map(order => {
            const action = getActionDetails(order.status);
            const isProcessing = processingId === order.id;

            return (
              <div
                key={order.id}
                className="glass-panel"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  borderLeft: `4px solid ${
                    order.status === 'OUT_FOR_DELIVERY'
                      ? '#f97316'
                      : order.status === 'PREPARING'
                      ? '#f59e0b'
                      : order.status === 'DELIVERED'
                      ? '#10b981'
                      : 'var(--border-subtle)'
                  }`,
                }}
              >
                {/* Order Top Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>Order #{order.id}</span>
                    <StatusBadge status={order.status} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      with <strong>{order.restaurant_name}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>
                      ${order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Details Row: Address, Items, and Phone */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <MapPin size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>DELIVERY ADDRESS</span>
                      <div>{order.delivery_address}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <Phone size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>CUSTOMER CONTACT</span>
                      <div>{order.contact_phone || 'Customer Phone on file'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <ShoppingBag size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>ITEMS ORDERED</span>
                      <div>
                        {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Driver Action Button Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
                  <Link
                    to={`/orders/${order.id}`}
                    style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    View Full Customer Tracker <ArrowRight size={13} />
                  </Link>

                  {action ? (
                    <button
                      onClick={() => handleAdvanceStatus(order.id)}
                      disabled={isProcessing}
                      style={{
                        background: action.color,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '9px 18px',
                        fontSize: '0.88rem',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: `0 4px 14px ${action.color}40`,
                        transition: 'var(--transition)',
                      }}
                    >
                      {React.createElement(action.icon, { size: 16 })}
                      <span>{isProcessing ? 'Updating Status...' : action.label}</span>
                    </button>
                  ) : order.status === 'DELIVERED' ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#10b981',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                      }}
                    >
                      <CheckCircle2 size={16} /> Delivered to Doorstep
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
