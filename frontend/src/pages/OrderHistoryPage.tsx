import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ChevronRight, Clock, MapPin } from 'lucide-react';
import { orderApi } from '../api/client';
import { Order } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const OrderHistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await orderApi.getOrders();
        setOrders(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load order history');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="max-w-7xl" style={{ paddingTop: '30px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>Your Orders</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Track active deliveries and review previous culinary orders
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="alert-error">{error}</div>
      ) : orders.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            maxWidth: '500px',
            margin: '40px auto',
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--text-muted)',
            }}
          >
            <ClipboardList size={28} />
          </div>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>No orders found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
            You haven't placed any food orders yet.
          </p>
          <Link to="/restaurants" className="btn-primary">Browse Restaurants</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '20px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>{order.restaurant_name}</h3>
                  <StatusBadge status={order.status} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>Order #{order.id}</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>•</span>
                  <span>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} /> {order.delivery_address}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                    ${order.total_amount.toFixed(2)}
                  </div>
                </div>

                <div style={{ color: 'var(--primary)' }}>
                  <ChevronRight size={20} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
