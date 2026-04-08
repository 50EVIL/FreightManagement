import { Link } from 'react-router-dom';
import { useTenant } from '@/providers/TenantProvider';

export default function NotFoundPage() {
  const { isBroker } = useTenant();
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🚚</div>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px' }}>404</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>This page has gone off-route.</p>
      <Link
        to={isBroker ? '/broker' : '/tenant'}
        style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
