import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationApi } from '../api/client';
import { Notification } from '../types';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
    } catch {
      // Ignored if user not logged in
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000); // Poll notifications every 12s
    return () => clearInterval(interval);
  }, []);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: 'none',
          color: unreadCount > 0 ? '#fff' : 'var(--text-muted)',
          cursor: 'pointer',
          position: 'relative',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          transition: 'all 0.2s ease',
        }}
        title="In-app Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              background: 'var(--primary)',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              borderRadius: '9999px',
              minWidth: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              boxShadow: '0 0 8px rgba(249, 115, 22, 0.6)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '42px',
            right: '0',
            width: '340px',
            maxHeight: '440px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1100,
            overflow: 'hidden',
            boxShadow: '0 12px 36px rgba(0,0,0,0.7)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(18, 24, 38, 0.98)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Notifications</span>
              {unreadCount > 0 && (
                <span className="badge-count" style={{ fontSize: '0.65rem' }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '30px 16px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.88rem',
                }}
              >
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 6).map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    background: n.is_read ? 'transparent' : 'rgba(249, 115, 22, 0.08)',
                    cursor: n.is_read ? 'default' : 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: n.is_read ? 'var(--text-main)' : '#fff' }}>
                      {n.title}
                    </div>
                    {!n.is_read && (
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: 'var(--primary)',
                        }}
                      />
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '6px' }}>
                    {n.message}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    <Clock size={11} /> {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--border-subtle)',
              textAlign: 'center',
              background: 'rgba(10, 14, 23, 0.6)',
            }}
          >
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '0.82rem',
                color: 'var(--primary)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              View all notifications <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
