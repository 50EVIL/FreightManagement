import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { getCarrierLabel } from '@/types/carriers';
import type { ConnoteStatus } from '@/types/connote';

export default function Tracking() {
  const { tenantId } = useTenant();
  const today = new Date().toISOString().split('T')[0];

  const { data, isLoading } = useQuery({
    queryKey: ['connotes-active', tenantId],
    queryFn: () => client.models.Connote.list({
      filter: {
        tenantId: { eq: tenantId! },
        status: { ne: 'draft' },
      },
    }),
    enabled: !!tenantId,
    refetchInterval: 60_000, // refresh every minute
  });

  const connotes = data?.data ?? [];
  const inTransit = connotes.filter((c) => ['raised', 'in_transit', 'out_for_delivery'].includes(c.status ?? ''));
  const overdue = inTransit.filter((c) => c.expectedDeliveryDate && c.expectedDeliveryDate < today);
  const delivered = connotes.filter((c) => ['delivered', 'pod_received'].includes(c.status ?? ''));
  const exceptions = connotes.filter((c) => c.status === 'exception');

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: 'In Transit', count: inTransit.length, color: '#d97706' },
          { label: 'Overdue', count: overdue.length, color: overdue.length > 0 ? '#dc2626' : '#16a34a' },
          { label: 'Exceptions', count: exceptions.length, color: exceptions.length > 0 ? '#dc2626' : '#16a34a' },
          { label: 'Delivered', count: delivered.length, color: '#16a34a' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '18px 22px', border: '1px solid #e5e7eb', flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#6b7280' }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color, marginTop: 6 }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
          <strong style={{ color: '#dc2626' }}>⚠️ {overdue.length} overdue shipment{overdue.length > 1 ? 's' : ''}:</strong>
          {' '}{overdue.map((c) => c.connoteNumber).join(', ')}
        </div>
      )}

      {/* Active shipments table */}
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Active Shipments</h2>
        {isLoading ? (
          <p style={{ color: '#9ca3af' }}>Loading...</p>
        ) : inTransit.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>No active shipments.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                {['Connote #', 'Carrier Ref', 'Carrier', 'To', 'Status', 'Expected', 'Days Overdue', 'Last Update'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inTransit.map((c) => {
                const daysOverdue = c.expectedDeliveryDate && c.expectedDeliveryDate < today
                  ? Math.floor((Date.now() - new Date(c.expectedDeliveryDate).getTime()) / 86400000)
                  : 0;
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>
                      <Link to={`/tenant/connotes/${c.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                        {c.connoteNumber}
                      </Link>
                    </td>
                    <td style={tdStyle}>{c.carrierConnoteNumber ?? '—'}</td>
                    <td style={tdStyle}>{getCarrierLabel(c.carrierId ?? '')}</td>
                    <td style={tdStyle}>{c.shipToSuburb}, {c.shipToState} {c.shipToPostcode}</td>
                    <td style={tdStyle}><StatusBadge status={(c.status as ConnoteStatus) ?? 'raised'} /></td>
                    <td style={tdStyle}>{formatDate(c.expectedDeliveryDate)}</td>
                    <td style={{ ...tdStyle, color: daysOverdue > 0 ? '#dc2626' : '#374151', fontWeight: daysOverdue > 0 ? 700 : 400 }}>
                      {daysOverdue > 0 ? `${daysOverdue}d` : '—'}
                    </td>
                    <td style={{ ...tdStyle, color: '#9ca3af', fontSize: 12 }}>{formatDateTime(c.lastTrackedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Exceptions */}
      {exceptions.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#dc2626' }}>⚠️ Exceptions</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#fef2f2' }}>
              <tr>
                {['Connote #', 'Carrier Ref', 'To', 'Status', 'Last Update'].map((h) => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {exceptions.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #fee2e2' }}>
                  <td style={tdStyle}><Link to={`/tenant/connotes/${c.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>{c.connoteNumber}</Link></td>
                  <td style={tdStyle}>{c.carrierConnoteNumber ?? '—'}</td>
                  <td style={tdStyle}>{c.shipToSuburb}, {c.shipToState}</td>
                  <td style={tdStyle}><StatusBadge status="exception" /></td>
                  <td style={{ ...tdStyle, fontSize: 12, color: '#9ca3af' }}>{formatDateTime(c.lastTrackedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24 };
const thStyle: React.CSSProperties = { padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, color: '#374151' };
const tdStyle: React.CSSProperties = { padding: '10px 14px', verticalAlign: 'middle' };
