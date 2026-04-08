import { useLocation } from 'react-router-dom';
import { useTenant } from '@/providers/TenantProvider';

const PAGE_TITLES: Record<string, string> = {
  '/broker': 'Broker Dashboard',
  '/broker/warehouses': 'Warehouse Customers',
  '/broker/rate-cards': 'Carrier Rate Cards',
  '/broker/rate-cards/import': 'Import Rate Card',
  '/broker/additional-charges': 'Additional Charges & Surcharges',
  '/broker/invoice-reconciliation': 'Invoice Reconciliation',
  '/tenant': 'Dashboard',
  '/tenant/connotes': 'Connotes',
  '/tenant/connotes/new': 'Create Connote',
  '/tenant/manifests': 'Manifests',
  '/tenant/manifests/new': 'Create Manifest',
  '/tenant/tracking': 'Tracking',
  '/tenant/reports': 'Reports',
};

export default function TopBar() {
  const location = useLocation();
  const { tenantId, brokerId } = useTenant();

  const title = PAGE_TITLES[location.pathname] ?? 'FreightOS';

  return (
    <header style={headerStyle}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          {tenantId ? `Tenant: ${tenantId.slice(0, 8)}…` : brokerId ? `Broker: ${brokerId.slice(0, 8)}…` : ''}
        </span>
      </div>
    </header>
  );
}

const headerStyle: React.CSSProperties = {
  height: 60,
  borderBottom: '1px solid #e5e7eb',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: '#fff',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};
