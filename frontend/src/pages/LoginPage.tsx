import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, LogIn, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUrl = new URLSearchParams(location.search).get('redirect') || '/restaurants';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide your email and password');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="max-w-7xl" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      <div
        className="glass-panel"
        style={{
          maxWidth: '460px',
          margin: '0 auto',
          padding: '36px 30px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🍔</div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Sign in to access your orders, track deliveries, and order food.
          </p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} color="var(--primary)" /> Email Address
            </label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. customer@foodiehub.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} color="var(--primary)" /> Password
            </label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '10px', padding: '12px' }}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                Authenticating...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LogIn size={16} /> Sign In
              </span>
            )}
          </button>
        </form>

        {/* Quick Demo Fill Buttons */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <Sparkles size={13} color="var(--primary)" /> Quick Demo Logins
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => fillCredentials('customer@foodiehub.com', 'Password123!')}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 4px' }}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('driver@foodiehub.com', 'DriverPass123!')}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 4px' }}
            >
              Driver
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('admin@foodiehub.com', 'AdminPass123!')}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '6px 4px' }}
            >
              Admin
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};
