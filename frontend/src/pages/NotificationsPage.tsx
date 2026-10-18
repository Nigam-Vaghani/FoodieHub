import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import { notificationApi } from '../api/client';
import { Notification } from '../types';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationApi.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = filter === 'all' ? notifications : notifications.filter(n => !n.is_read);

  return (
    <div className="max-w-7xl" style={{ paddingTop: '30px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>In-App Notifications</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time delivery progress updates and order confirmation alerts
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="btn-secondary"
            style={{ fontSize: '0.88rem', padding: '8px 14px' }}
          >
            <CheckCheck size={16} /> Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            border: filter === 'all' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
            background: filter === 'all' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
            color: filter === 'all' ? '#fff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          style={{
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            border: filter === 'unread' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
            background: filter === 'unread' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
            color: filter === 'unread' ? '#fff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="alert-error">{error}</div>
      ) : filtered.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            maxWidth: '480px',
            margin: '40px auto',
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <Bell size={32} color="var(--text-dim)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>No notifications to display</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {filter === 'unread' ? "You're all caught up! No unread notifications." : 'You have no notifications at this time.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(item => (
            <div
              key={item.id}
              className="glass-panel"
              style={{
                padding: '16px 20px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                borderLeft: !item.is_read ? '4px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: !item.is_read ? 'rgba(249, 115, 22, 0.06)' : 'var(--bg-card)',
              }}
            >
              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '1rem', color: '#fff' }}>{item.title}</h4>
                  {!item.is_read && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: 'rgba(249, 115, 22, 0.2)',
                        color: 'var(--primary)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      New
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {item.message}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  <Clock size={12} /> {new Date(item.created_at).toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {item.order_id && (
                  <Link
                    to={`/orders/${item.order_id}`}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    <span>View Order #{item.order_id}</span>
                    <ExternalLink size={13} />
                  </Link>
                )}

                {!item.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      padding: '6px',
                    }}
                    title="Mark as read"
                  >
                    <CheckCheck size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
