import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import { formatCurrency } from '@/lib/formatters';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';

function StatCard({ label, value, sub, color = '#2563eb' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', border: '1px solid #e5e7eb', flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, margin: '8px 0 4px' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#9ca3af' }}>{sub}</div>}
    </div>
  );
}

export default function BrokerDashboard() {
  const { brokerId } = useTenant();

  const { data: warehouses, isLoading: wLoading } = useQuery({
    queryKey: ['warehouses', brokerId],
    queryFn: () => client.models.WarehouseCustomer.list({ filter: { brokerId: { eq: brokerId! } } }),
    enabled: !!brokerId,
  });

  const { data: rateCards, isLoading: rcLoading } = useQuery({
    queryKey: ['rateCards', brokerId],
    queryFn: () => client.models.CarrierRateCard.list({ filter: { brokerId: { eq: brokerId! }, status: { eq: 'active' } } }),
    enabled: !!brokerId,
  });

  const { data: invoices, isLoading: invLoading } = useQuery({
    queryKey: ['invoices', brokerId],
    queryFn: () => client.models.CarrierInvoice.list({ filter: { brokerId: { eq: brokerId! } } }),
    enabled: !!brokerId,
  });

  const isLoading = wLoading || rcLoading || invLoading;

  if (isLoading) return <LoadingSpinner label="Loading dashboard..." />;

  const warehouseCount = warehouses?.data?.length ?? 0;
  const activeRateCards = rateCards?.data?.length ?? 0;
  const pendingInvoices = invoices?.data?.filter((i) => i.status === 'matching').length ?? 0;
  const openVariances = invoices?.data?.filter((i) => i.varianceCount && i.varianceCount > 0).reduce((s, i) => s + (i.totalVarianceAmount ?? 0), 0) ?? 0;

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatCard label="Warehouse Customers" value={warehouseCount} sub="Active accounts" color="#2563eb" />
        <StatCard label="Active Rate Cards" value={activeRateCards} sub="Published to customers" color="#7c3aed" />
        <StatCard label="Pending Reconciliation" value={pendingInvoices} sub="Carrier invoices" color="#d97706" />
        <StatCard label="Open Variances" value={formatCurrency(openVariances)} sub="Across all carriers" color={openVariances > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      {/* Quick actions */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24, marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/broker/rate-cards/import" style={actionBtnStyle}>
            📥 Import Rate Card
          </Link>
          <Link to="/broker/warehouses" style={actionBtnStyle}>
            🏭 Manage Warehouses
          </Link>
          <Link to="/broker/additional-charges" style={actionBtnStyle}>
            💲 Configure Surcharges
          </Link>
          <Link to="/broker/invoice-reconciliation" style={actionBtnStyle}>
            🧾 Reconcile Invoices
          </Link>
        </div>
      </div>

      {/* Recent warehouses */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Warehouse Customers</h2>
          <Link to="/broker/warehouses" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>View all →</Link>
        </div>
        {warehouses?.data?.slice(0, 5).map((w) => (
          <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 500 }}>{w.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{w.suburb}, {w.state} {w.postcode}</div>
            </div>
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: w.status === 'active' ? '#dcfce7' : '#fee2e2', color: w.status === 'active' ? '#15803d' : '#dc2626', alignSelf: 'center' }}>
              {w.status}
            </span>
          </div>
        ))}
        {warehouseCount === 0 && (
          <p style={{ color: '#9ca3af', fontSize: 14 }}>No warehouse customers yet. <Link to="/broker/warehouses">Add one →</Link></p>
        )}
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 8,
  background: '#f0f9ff',
  border: '1px solid #bae6fd',
  color: '#0369a1',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};
