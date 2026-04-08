import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/formatters';
import type { ConnoteStatus } from '@/types/connote';

function StatCard({ label, value, color = '#2563eb', to }: { label: string; value: string | number; color?: string; to?: string }) {
  const inner = (
    <div style={{ background: '#fff', borderRadius: 10, padding: '20px 24px', border: '1px solid #e5e7eb', flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, margin: '8px 0 0' }}>{value}</div>
    </div>
  );
  if (to) return <Link to={to} style={{ textDecoration: 'none', flex: 1, minWidth: 160 }}>{inner}</Link>;
  return inner;
}

export default function TenantDashboard() {
  const { tenantId } = useTenant();

  const { data } = useQuery({
    queryKey: ['connotes', tenantId],
    queryFn: () => client.models.Connote.list({ filter: { tenantId: { eq: tenantId! } } }),
    enabled: !!tenantId,
  });

  const connotes = data?.data ?? [];
  const today = new Date().toISOString().split('T')[0];

  const totalConnotes = connotes.length;
  const inTransit = connotes.filter((c) => ['raised', 'in_transit', 'out_for_delivery'].includes(c.status ?? '')).length;
  const overdue = connotes.filter((c) =>
    ['raised', 'in_transit'].includes(c.status ?? '') &&
    c.expectedDeliveryDate &&
    c.expectedDeliveryDate < today,
  ).length;
  const delivered = connotes.filter((c) => ['delivered', 'pod_received'].includes(c.status ?? '')).length;

  const recent = [...connotes]
    .sort((a, b) => (b.createdAt ?? '') > (a.createdAt ?? '') ? 1 : -1)
    .slice(0, 8);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="Total Connotes" value={totalConnotes} to="/tenant/connotes" />
        <StatCard label="In Transit" value={inTransit} color="#d97706" to="/tenant/tracking" />
        <StatCard label="Overdue" value={overdue} color={overdue > 0 ? '#dc2626' : '#16a34a'} to="/tenant/tracking" />
        <StatCard label="Delivered" value={delivered} color="#16a34a" />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <Link to="/tenant/connotes/new" style={actionBtnStyle}>📦 Create Connote</Link>
        <Link to="/tenant/manifests/new" style={actionBtnStyle}>📃 Create Manifest</Link>
        <Link to="/tenant/tracking" style={actionBtnStyle}>📍 Track Shipments</Link>
        <Link to="/tenant/reports" style={actionBtnStyle}>📊 Export Report</Link>
      </div>

      {overdue > 0 && (
        <div style={{ padding: 14, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 20, fontSize: 14, color: '#dc2626' }}>
          ⚠️ <strong>{overdue} connote{overdue > 1 ? 's are' : ' is'} overdue.</strong>{' '}
          <Link to="/tenant/tracking" style={{ color: '#dc2626' }}>View tracking →</Link>
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Recent Connotes</h2>
          <Link to="/tenant/connotes" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>View all →</Link>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>
            No connotes yet. <Link to="/tenant/connotes/new">Create your first connote →</Link>
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                {['Connote #', 'Carrier Ref', 'To', 'Status', 'Expected', 'Est. Cost'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  onClick={() => window.location.href = `/tenant/connotes/${c.id}`}
                >
                  <td style={tdStyle}><strong>{c.connoteNumber}</strong></td>
                  <td style={tdStyle}>{c.carrierConnoteNumber ?? <span style={{ color: '#9ca3af' }}>Not raised</span>}</td>
                  <td style={tdStyle}>{c.shipToSuburb}, {c.shipToState} {c.shipToPostcode}</td>
                  <td style={tdStyle}><StatusBadge status={(c.status as ConnoteStatus) ?? 'draft'} /></td>
                  <td style={tdStyle}>{formatDate(c.expectedDeliveryDate)}</td>
                  <td style={tdStyle}>{formatCurrency(c.estimatedCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24 };
const actionBtnStyle: React.CSSProperties = { padding: '10px 16px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', textDecoration: 'none', fontSize: 14, fontWeight: 500 };
const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4 };
const tdStyle: React.CSSProperties = { padding: '10px 14px', verticalAlign: 'middle' };
