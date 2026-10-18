import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Clock, Bike, MapPin, Phone, ArrowLeft, ShoppingBag } from 'lucide-react';
import { restaurantApi } from '../api/client';
import { RestaurantDetail } from '../types';
import { FoodItemCard } from '../components/FoodItemCard';
import { useCart } from '../context/CartContext';

export const RestaurantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { totalItems, subtotal, restaurantId } = useCart();

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await restaurantApi.getRestaurant(parseInt(id, 10));
        setRestaurant(data);
      } catch (err: any) {
        setError(err.message || 'Restaurant not found');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="max-w-7xl" style={{ paddingTop: '40px' }}>
        <div className="alert-error">{error || 'Restaurant not found'}</div>
        <Link to="/restaurants" className="btn-secondary" style={{ marginTop: '16px' }}>
          <ArrowLeft size={16} /> Back to Restaurants
        </Link>
      </div>
    );
  }

  const categories = ['All', ...Array.from(new Set(restaurant.menu_items.map(i => i.category)))];
  const filteredItems = selectedCategory === 'All'
    ? restaurant.menu_items
    : restaurant.menu_items.filter(i => i.category === selectedCategory);

  const hasItemsFromThisRestaurant = restaurantId === restaurant.id && totalItems > 0;

  return (
    <div style={{ paddingBottom: hasItemsFromThisRestaurant ? '80px' : '30px' }}>
      {/* Restaurant Header Banner */}
      <div
        style={{
          position: 'relative',
          height: '280px',
          overflow: 'hidden',
          marginBottom: '30px',
        }}
      >
        <img
          src={restaurant.image_url}
          alt={restaurant.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.55)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, var(--bg-primary) 0%, transparent 80%)',
          }}
        />

        <div
          className="max-w-7xl"
          style={{
            position: 'absolute',
            bottom: '20px',
            left: 0,
            right: 0,
          }}
        >
          <Link
            to="/restaurants"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              marginBottom: '12px',
            }}
          >
            <ArrowLeft size={14} /> Back to restaurants
          </Link>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: 'var(--primary)',
                    color: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {restaurant.cuisine_type}
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#fbbf24',
                  }}
                >
                  <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                  {restaurant.rating.toFixed(1)}
                </div>
              </div>

              <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '8px' }}>
                {restaurant.name}
              </h1>

              <p style={{ color: 'var(--text-muted)', maxWidth: '650px', fontSize: '0.9rem', lineHeight: '1.4' }}>
                {restaurant.description}
              </p>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: '12px 18px',
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
                background: 'rgba(18, 24, 38, 0.85)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <Clock size={13} color="var(--primary)" /> Delivery Time
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '2px' }}>
                  {restaurant.delivery_time_mins} mins
                </div>
              </div>

              <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <Bike size={13} color="var(--primary)" /> Delivery Fee
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '2px' }}>
                  ${restaurant.delivery_fee.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl">
        {/* Contact & Location Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            marginBottom: '28px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={15} color="var(--primary)" /> {restaurant.address}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Phone size={15} color="var(--primary)" /> {restaurant.phone}
          </div>
        </div>

        {/* Menu Categories */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '14px',
            marginBottom: '28px',
            overflowX: 'auto',
          }}
        >
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                border: selectedCategory === cat ? '1px solid var(--primary)' : '1px solid transparent',
                background: selectedCategory === cat ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                color: selectedCategory === cat ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid-responsive">
          {filteredItems.map(item => (
            <FoodItemCard key={item.id} item={item} restaurant={restaurant} />
          ))}
        </div>
      </div>

      {/* Floating Bottom Cart Bar */}
      {hasItemsFromThisRestaurant && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 40px)',
            maxWidth: '680px',
            zIndex: 1000,
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: '12px 20px',
              background: 'rgba(249, 115, 22, 0.95)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 30px rgba(249, 115, 22, 0.4)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 12px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                Subtotal: ${subtotal.toFixed(2)}
              </div>
            </div>

            <Link
              to="/cart"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#fff',
                color: '#ea580c',
                padding: '8px 18px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '0.9rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <ShoppingBag size={16} /> View Cart & Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
