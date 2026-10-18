import React from 'react';
import { OrderStatus, DeliveryStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus | DeliveryStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let bg = 'rgba(148, 163, 184, 0.15)';
  let color = '#94a3b8';
  let border = 'rgba(148, 163, 184, 0.3)';

  switch (status) {
    case 'PENDING':
    case 'ASSIGNED':
      bg = 'rgba(245, 158, 11, 0.15)';
      color = '#fbbf24';
      border = 'rgba(245, 158, 11, 0.3)';
      break;
    case 'CONFIRMED':
    case 'PICKED_UP':
      bg = 'rgba(59, 130, 246, 0.15)';
      color = '#60a5fa';
      border = 'rgba(59, 130, 246, 0.3)';
      break;
    case 'PREPARING':
    case 'IN_TRANSIT':
      bg = 'rgba(168, 85, 247, 0.15)';
      color = '#c084fc';
      border = 'rgba(168, 85, 247, 0.3)';
      break;
    case 'OUT_FOR_DELIVERY':
      bg = 'rgba(249, 115, 22, 0.15)';
      color = '#fb923c';
      border = 'rgba(249, 115, 22, 0.3)';
      break;
    case 'DELIVERED':
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#34d399';
      border = 'rgba(16, 185, 129, 0.3)';
      break;
    case 'CANCELLED':
    case 'FAILED':
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#f87171';
      border = 'rgba(239, 68, 68, 0.3)';
      break;
  }

  const formatted = status.replace(/_/g, ' ');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      {formatted}
    </span>
  );
};
