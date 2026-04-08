import { NavLink } from 'react-router-dom';
import { useTenant } from '@/providers/TenantProvider';
import { signOut } from 'aws-amplify/auth';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const BROKER_NAV: NavItem[] = [
  { path: '/broker', label: 'Dashboard', icon: '🏠' },
  { path: '/broker/warehouses', label: 'Warehouses', icon: '🏭' },  { path: '/broker/tenants', label: 'Tenants', icon: '🏢' },
  { path: '/broker/users', label: 'Users', icon: '👥' },  { path: '/broker/rate-cards', label: 'Rate Cards', icon: '📋' },
  { path: '/broker/additional-charges', label: 'Surcharges', icon: '💲' },
  { path: '/broker/invoice-reconciliation', label: 'Invoice Reconciliation', icon: '🧾' },
];

const TENANT_NAV: NavItem[] = [
  { path: '/tenant', label: 'Dashboard', icon: '🏠' },
  { path: '/tenant/connotes', label: 'Connotes', icon: '📦' },
  { path: '/tenant/manifests', label: 'Manifests', icon: '📃' },
  { path: '/tenant/tracking', label: 'Tracking', icon: '📍' },
  { path: '/tenant/reports', label: 'Reports', icon: '📊' },
];

export default function Sidebar() {
  const { role, isBroker } = useTenant();
  const navItems = isBroker ? BROKER_NAV : TENANT_NAV;

  return (
    <aside style={sidebarStyle}>
      {/* Logo */}
      <div style={logoStyle}>
        <span style={{ fontSize: 22 }}>🚚</span>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>FreightViz</span>
      </div>

      {/* Role badge */}
      <div style={roleBadgeStyle}>
        {role === 'Brokers' ? 'Broker' : role === 'WarehouseAdmins' ? 'Warehouse Admin' : 'Tenant User'}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path.split('/').length === 2}
            style={({ isActive }) => ({
              ...navLinkStyle,
              background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
            })}
          >
            <span style={{ fontSize: 18, minWidth: 24 }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <button
        onClick={() => signOut()}
        style={signOutStyle}
      >
        <span>↩</span> Sign Out
      </button>
    </aside>
  );
}

const sidebarStyle: React.CSSProperties = {
  width: 240,
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%)',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  position: 'sticky',
  top: 0,
  height: '100vh',
  overflowY: 'auto',
};

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '20px 16px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
};

const roleBadgeStyle: React.CSSProperties = {
  margin: '8px 12px',
  padding: '4px 10px',
  borderRadius: 20,
  background: 'rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.8)',
  fontSize: 11,
  fontWeight: 600,
  textAlign: 'center',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const navLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 16px',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 500,
  borderRadius: 6,
  margin: '2px 8px',
  transition: 'all 0.15s',
};

const signOutStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 16px',
  background: 'transparent',
  border: 'none',
  color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer',
  fontSize: 14,
  borderTop: '1px solid rgba(255,255,255,0.1)',
  width: '100%',
  textAlign: 'left',
};
