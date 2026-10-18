import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Utensils, ClipboardList, User as UserIcon, LogOut, Bike } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { NotificationDropdown } from './NotificationDropdown';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="navbar">
      <div className="max-w-7xl navbar-inner" style={{ width: '100%' }}>
        {/* Brand */}
        <Link to="/" className="brand-logo">
          <span style={{ fontSize: '1.6rem' }}>🍔</span>
          Foodie<span>Hub</span>
        </Link>

        {/* Navigation Links */}
        <nav className="nav-links">
          <Link
            to="/restaurants"
            className={`nav-link ${isActive('/restaurants') ? 'active' : ''}`}
          >
            <Utensils size={18} />
            <span>Restaurants</span>
          </Link>

          {isAuthenticated && (
            <Link
              to="/orders"
              className={`nav-link ${isActive('/orders') ? 'active' : ''}`}
            >
              <ClipboardList size={18} />
              <span>My Orders</span>
            </Link>
          )}

          {isAuthenticated && (user?.role === 'driver' || user?.role === 'admin') && (
            <Link
              to="/driver"
              className={`nav-link ${isActive('/driver') ? 'active' : ''}`}
              style={{ color: '#f97316', fontWeight: 700 }}
            >
              <Bike size={18} />
              <span>Driver Portal</span>
            </Link>
          )}

          {/* Cart Icon & Badge */}
          <Link
            to="/cart"
            className={`nav-link ${isActive('/cart') ? 'active' : ''}`}
            style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
            title="Shopping Cart"
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <ShoppingBag size={20} />
              {totalItems > 0 && (
                <span
                  className="badge-count"
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-10px',
                    boxShadow: '0 0 10px rgba(249, 115, 22, 0.5)',
                  }}
                >
                  {totalItems}
                </span>
              )}
            </div>
          </Link>

          {/* Notifications Dropdown (When logged in) */}
          {isAuthenticated && <NotificationDropdown />}

          {/* User Auth Section */}
          {isAuthenticated && user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                  }}
                >
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>{user.full_name.split(' ')[0]}</span>
              </button>

              {userMenuOpen && (
                <div
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: '44px',
                    right: 0,
                    width: '220px',
                    padding: '8px 0',
                    zIndex: 1100,
                    background: 'rgba(18, 24, 38, 0.98)',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                      {user.full_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {user.email}
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(249, 115, 22, 0.2)',
                        color: 'var(--primary)',
                      }}
                    >
                      {user.role}
                    </span>
                  </div>

                  <Link
                    to="/orders"
                    onClick={() => setUserMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      fontSize: '0.88rem',
                      color: 'var(--text-main)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <ClipboardList size={16} /> Order History
                  </Link>

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      fontSize: '0.88rem',
                      color: '#f87171',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <LogOut size={16} /> Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link to="/login" className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.88rem' }}>
                <UserIcon size={15} /> Sign In
              </Link>
              <Link to="/register" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
                Sign Up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
