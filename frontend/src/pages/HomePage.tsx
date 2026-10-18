import React, { useState, useEffect } from 'react';
import { Search, Flame, ShieldCheck, Zap, Server } from 'lucide-react';
import { restaurantApi } from '../api/client';
import { Restaurant } from '../types';
import { RestaurantCard } from '../components/RestaurantCard';

const CUISINES = ['All', 'Italian', 'Indian', 'Japanese', 'American'];

export const HomePage: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await restaurantApi.getRestaurants({
          cuisine: selectedCuisine === 'All' ? undefined : selectedCuisine,
          search: searchQuery.trim() || undefined,
        });
        setRestaurants(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [selectedCuisine, searchQuery]);

  return (
    <div>
      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          padding: '60px 0 50px 0',
          background: 'linear-gradient(180deg, rgba(249, 115, 22, 0.12) 0%, transparent 100%)',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '40px',
        }}
      >
        <div className="max-w-7xl">
          <div style={{ maxWidth: '720px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(249, 115, 22, 0.15)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                color: 'var(--primary)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: 700,
                marginBottom: '16px',
              }}
            >
              <Flame size={14} /> Cloud-Native Microservices Architecture
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
                lineHeight: '1.15',
                marginBottom: '16px',
              }}
            >
              Crave it? Get it fast with <span style={{ color: 'var(--primary)' }}>FoodieHub</span>.
            </h1>

            <p
              style={{
                fontSize: '1.05rem',
                color: 'var(--text-muted)',
                lineHeight: '1.6',
                marginBottom: '28px',
              }}
            >
              Discover artisanal kitchens, wood-fired pizzas, authentic curries, and gourmet burgers.
              Powered by autonomous microservices, containerization, and instant order tracking.
            </p>

            {/* Search & Filter Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(22, 29, 45, 0.9)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 14px',
                boxShadow: 'var(--shadow-lg)',
                maxWidth: '560px',
              }}
            >
              <Search size={20} color="var(--text-dim)" style={{ marginRight: '10px' }} />
              <input
                type="text"
                placeholder="Search restaurant or cuisine..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.95rem',
                  width: '100%',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl">
        {/* Cuisine Filter Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '16px',
            marginBottom: '28px',
          }}
        >
          {CUISINES.map(cuisine => (
            <button
              key={cuisine}
              onClick={() => setSelectedCuisine(cuisine)}
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--radius-full)',
                border: selectedCuisine === cuisine ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: selectedCuisine === cuisine ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedCuisine === cuisine ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {cuisine}
            </button>
          ))}
        </div>

        {/* Section Heading */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.5rem' }}>Popular Restaurants</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Hand-picked dining options available for delivery in your area
            </p>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            {restaurants.length} {restaurants.length === 1 ? 'place' : 'places'}
          </span>
        </div>

        {/* Restaurant Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="alert-error">{error}</div>
        ) : restaurants.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '50px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No restaurants found</p>
            <p style={{ fontSize: '0.88rem' }}>Try searching for a different keyword or cuisine filter.</p>
          </div>
        ) : (
          <div className="grid-responsive">
            {restaurants.map(rest => (
              <RestaurantCard key={rest.id} restaurant={rest} />
            ))}
          </div>
        )}

        {/* Cloud-Native Architecture Showcase */}
        <section
          className="glass-panel"
          style={{
            marginTop: '60px',
            padding: '36px',
            background: 'linear-gradient(135deg, rgba(22, 29, 45, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 30px auto' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
              Engineered as a Cloud-Native Microservices Ecosystem
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Built according to 12-factor cloud native principles for maximum resilience, horizontal scalability, and isolated state persistence.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}
          >
            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
              <Server size={24} color="var(--primary)" style={{ marginBottom: '10px' }} />
              <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>5 Isolated Services</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                User, Restaurant, Order, Delivery, and Notification services each with an independent persistent database.
              </p>
            </div>

            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
              <ShieldCheck size={24} color="#10b981" style={{ marginBottom: '10px' }} />
              <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Server-Side Pricing</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Zero client trust. Every price, subtotal, tax, and delivery fee is verified against the restaurant catalog.
              </p>
            </div>

            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
              <Zap size={24} color="#fbbf24" style={{ marginBottom: '10px' }} />
              <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Nginx API Gateway</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Unified single point of ingress with automated reverse proxy routing to containerized backend microservices.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
