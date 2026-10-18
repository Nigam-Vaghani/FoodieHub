import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, MapPin, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      navigate('/restaurants');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl" style={{ paddingTop: '50px', paddingBottom: '60px' }}>
      <div
        className="glass-panel"
        style={{
          maxWidth: '500px',
          margin: '0 auto',
          padding: '36px 30px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🚀</div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Create an Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Join FoodieHub for fast online ordering and real-time delivery tracking.
          </p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} color="var(--primary)" /> Full Name *
            </label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} color="var(--primary)" /> Email Address *
            </label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. john@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} color="var(--primary)" /> Password * (min 6 characters)
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} color="var(--primary)" /> Phone Number (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. +1-555-0199"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color="var(--primary)" /> Default Delivery Address (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 742 Evergreen Terrace, Springfield"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '12px', padding: '12px' }}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                Creating Account...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={16} /> Register Account
              </span>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
