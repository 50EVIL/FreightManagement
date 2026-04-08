import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/amplifyClient';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, formatDateTime, formatCurrency, formatWeight, formatCubic } from '@/lib/formatters';
import { getCarrierLabel, getServiceLabel } from '@/types/carriers';
import type { ConnoteStatus } from '@/types/connote';

export default function ConnoteDetail() {
  const { connoteId } = useParams<{ connoteId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isRaising, setIsRaising] = useState(false);
  const [raiseError, setRaiseError] = useState<string | null>(null);

  const { data: connoteResp, isLoading } = useQuery({
    queryKey: ['connote', connoteId],
    queryFn: () => client.models.Connote.get({ id: connoteId! }),
    enabled: !!connoteId,
  });

  const { data: lineItemsResp } = useQuery({
    queryKey: ['connoteLineItems', connoteId],
    queryFn: () => client.models.ConnoteLineItem.list({ filter: { connoteId: { eq: connoteId! } } }),
    enabled: !!connoteId,
  });

  const { data: eventsResp } = useQuery({
    queryKey: ['connoteEvents', connoteId],
    queryFn: () => client.models.ShipmentEvent.list({ filter: { connoteId: { eq: connoteId! } } }),
    enabled: !!connoteId,
  });

  const connote = connoteResp?.data;
  const lineItems = lineItemsResp?.data ?? [];
  const events = [...(eventsResp?.data ?? [])].sort((a, b) => (b.timestamp ?? '') > (a.timestamp ?? '') ? 1 : -1);
  const references: { type: string; value: string }[] = connote?.referencesJson ? JSON.parse(connote.referencesJson) : [];

  async function handleRaise() {
    if (!connoteId) return;
    setIsRaising(true);
    setRaiseError(null);
    try {
      await client.mutations.raiseConnote({ connoteId });
      qc.invalidateQueries({ queryKey: ['connote', connoteId] });
    } catch (e) {
      setRaiseError((e as Error).message ?? 'Failed to raise connote');
    } finally {
      setIsRaising(false);
    }
  }

  if (isLoading) return <LoadingSpinner label="Loading connote..." />;
  if (!connote) return <div>Connote not found. <Link to="/tenant/connotes">Back to list</Link></div>;

  const canRaise = ['draft', 'ready', 'raise_failed'].includes(connote.status ?? '');

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{connote.connoteNumber}</h2>
            <StatusBadge status={(connote.status as ConnoteStatus) ?? 'draft'} />
          </div>
          {connote.carrierConnoteNumber && (
            <div style={{ fontSize: 14, color: '#6b7280' }}>
              Carrier Ref: <strong>{connote.carrierConnoteNumber}</strong>
              {' '}({getCarrierLabel(connote.carrierId ?? '')})
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canRaise && (
            <button onClick={handleRaise} disabled={isRaising} style={primaryBtnStyle}>
              {isRaising ? 'Raising...' : '📤 Raise with Carrier'}
            </button>
          )}
          <Link to="/tenant/connotes" style={cancelBtnStyle}>← Back</Link>
        </div>
      </div>

      {raiseError && <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{raiseError}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Delivery details */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Delivery Details</h3>
          <dl style={dlStyle}>
            <dt>Carrier</dt><dd>{getCarrierLabel(connote.carrierId ?? '')} — {getServiceLabel(connote.serviceType ?? '')}</dd>
            <dt>To</dt>
            <dd>
              <div>{connote.shipToName}</div>
              <div>{connote.shipToAddress}</div>
              <div>{connote.shipToSuburb}, {connote.shipToState} {connote.shipToPostcode}</div>
              {connote.shipToContactName && <div style={{ color: '#6b7280', fontSize: 12 }}>{connote.shipToContactName} {connote.shipToPhone}</div>}
            </dd>
            <dt>Expected Delivery</dt><dd>{formatDate(connote.expectedDeliveryDate)}</dd>
            <dt>Actual Delivery</dt><dd>{connote.actualDeliveryDate ? formatDate(connote.actualDeliveryDate) : '—'}</dd>
            <dt>Special Instructions</dt><dd>{connote.specialInstructions ?? '—'}</dd>
          </dl>
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            {connote.tailLift && <span style={tagStyle}>Tail-Lift</span>}
            {connote.dangerousGoods && <span style={{ ...tagStyle, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>DG</span>}
            {connote.authority2Leave && <span style={tagStyle}>Authority to Leave</span>}
          </div>
        </div>

        {/* Cost & weight */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Weight & Cost</h3>
          <dl style={dlStyle}>
            <dt>Total Weight</dt><dd style={{ fontWeight: 700, fontSize: 16 }}>{formatWeight(connote.totalWeightKg)}</dd>
            <dt>Total Cubic</dt><dd style={{ fontWeight: 700, fontSize: 16 }}>{formatCubic(connote.totalCubicM3)}</dd>
            <dt>Estimated Cost</dt><dd style={{ fontWeight: 700, fontSize: 16, color: '#2563eb' }}>{formatCurrency(connote.estimatedCost)}</dd>
            <dt>Actual Cost</dt><dd>{formatCurrency(connote.actualCost)}</dd>
            <dt>Raised At</dt><dd>{formatDateTime(connote.carrierRaisedAt)}</dd>
            <dt>Last Tracked</dt><dd>{formatDateTime(connote.lastTrackedAt)}</dd>
          </dl>
        </div>
      </div>

      {/* References */}
      {references.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={cardTitleStyle}>References</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {references.map((ref, i) => (
              <div key={i} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '4px 12px', fontSize: 13 }}>
                <span style={{ color: '#6b7280', fontWeight: 500 }}>{ref.type.replace('_', ' ')}: </span>
                <strong>{ref.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Line items */}
      {lineItems.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={cardTitleStyle}>Line Items</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                {['Type', 'Description', 'Qty', 'L×W×H (cm)', 'Weight', 'Cubic'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, color: '#374151' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <tr key={li.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 12px' }}>{li.packagingType}</td>
                  <td style={{ padding: '8px 12px' }}>{li.description}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{li.quantity}</td>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{li.lengthCm}×{li.widthCm}×{li.heightCm}</td>
                  <td style={{ padding: '8px 12px' }}>{formatWeight(li.weightKg)}</td>
                  <td style={{ padding: '8px 12px' }}>{formatCubic(li.cubicM3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tracking timeline */}
      {events.length > 0 && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={cardTitleStyle}>Tracking Timeline</h3>
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            {events.map((ev, i) => (
              <div key={ev.id} style={{ display: 'flex', gap: 12, marginBottom: i < events.length - 1 ? 16 : 0, position: 'relative' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? '#2563eb' : '#d1d5db', flexShrink: 0, marginTop: 4, zIndex: 1 }} />
                {i < events.length - 1 && (
                  <div style={{ position: 'absolute', left: 4, top: 14, width: 2, height: '100%', background: '#e5e7eb' }} />
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.description ?? ev.eventType}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {ev.location && `${ev.location} · `}
                    {formatDateTime(ev.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 };
const cardTitleStyle: React.CSSProperties = { margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#374151', paddingBottom: 10, borderBottom: '1px solid #f3f4f6' };
const dlStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 10, fontSize: 14 };
const tagStyle: React.CSSProperties = { padding: '2px 10px', borderRadius: 20, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontSize: 12 };
const primaryBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 14px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' };
