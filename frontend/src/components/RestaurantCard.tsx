import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Bike } from 'lucide-react';
import { Restaurant } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      className="glass-panel glass-panel-hover"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '180px', overflow: 'hidden' }}>
        <img
          src={restaurant.image_url}
          alt={restaurant.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease',
          }}
          loading="lazy"
        />
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(10, 14, 23, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#fbbf24',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Star size={13} fill="#fbbf24" stroke="#fbbf24" />
          <span>{restaurant.rating.toFixed(1)}</span>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'rgba(249, 115, 22, 0.9)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            padding: '3px 8px',
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {restaurant.cuisine_type}
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{restaurant.name}</h3>
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            lineHeight: '1.4',
            marginBottom: '16px',
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {restaurant.description}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '12px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={14} color="var(--primary)" />
            <span>{restaurant.delivery_time_mins} mins</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Bike size={14} color="var(--primary)" />
            <span>${restaurant.delivery_fee.toFixed(2)} delivery</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
