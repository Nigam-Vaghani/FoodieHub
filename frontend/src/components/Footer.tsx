import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(10, 14, 23, 0.95)',
        padding: '36px 0 24px 0',
        marginTop: 'auto',
      }}
    >
      <div className="max-w-7xl">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '24px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 800 }}>
              🍔 Foodie<span style={{ color: 'var(--primary)' }}>Hub</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
              Cloud-Native Distributed Food Ordering Microservices Platform
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {['User Service', 'Restaurant Service', 'Order Service', 'Delivery Service', 'Notification Service'].map(svc => (
              <span
                key={svc}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-muted)',
                }}
              >
                ● {svc}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            paddingTop: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            FoodieHub Academic Project &copy; {new Date().getFullYear()} — Built for Cloud Native Applications
          </div>
          <div>
            FastAPI • React • TypeScript • SQLite • Docker • Nginx Gateway
          </div>
        </div>
      </div>
    </footer>
  );
};
