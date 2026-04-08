import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import { getCarrierLabel } from '@/types/carriers';
import { formatWeight, formatCubic, computeCubicM3 } from '@/lib/formatters';
import StatusBadge from '@/components/ui/StatusBadge';
import type { ConnoteStatus } from '@/types/connote';

const carriers = ['TOLL', 'STARTRACK', 'CP', 'TNT', 'SENDLE', 'MOCK'];
const SERVICE_TYPES = ['STANDARD', 'ROAD_EXPRESS', 'OVERNIGHT', 'ECONOMY'];

const schema = z.object({
  carrierId: z.string().min(1),
  serviceType: z.string().min(1),
  dispatchDate: z.string().min(1),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ManifestCreate() {
  const { tenantId, warehouseId, brokerId } = useTenant();
  const navigate = useNavigate();
  const [selectedConnoteIds, setSelectedConnoteIds] = useState<Set<string>>(new Set());

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceType: 'STANDARD', dispatchDate: new Date().toISOString().split('T')[0] },
  });

  const selectedCarrier = watch('carrierId');
  const selectedService = watch('serviceType');

  // Load raised connotes not yet on a manifest, matching carrier+service
  const { data: connoteData } = useQuery({
    queryKey: ['connotes-raised', tenantId, selectedCarrier, selectedService],
    queryFn: () => client.models.Connote.list({
      filter: {
        tenantId: { eq: tenantId! },
        carrierId: { eq: selectedCarrier },
        status: { eq: 'raised' },
        manifestId: { attributeExists: false },
      },
    }),
    enabled: !!tenantId && !!selectedCarrier,
  });

  const availableConnotes = connoteData?.data ?? [];

  function toggleConnote(id: string) {
    setSelectedConnoteIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedConnoteIds(new Set(availableConnotes.map((c) => c.id)));
  }

  const selectedConnotes = availableConnotes.filter((c) => selectedConnoteIds.has(c.id));
  const totalWeight = selectedConnotes.reduce((s, c) => s + (c.totalWeightKg ?? 0), 0);
  const totalCubic = selectedConnotes.reduce((s, c) => s + (c.totalCubicM3 ?? 0), 0);

  const createMutation = useMutation({
    mutationFn: async (values: FormData) => {
      if (!tenantId || !warehouseId || !brokerId) throw new Error('Missing context');
      if (selectedConnoteIds.size === 0) throw new Error('Select at least one connote');

      const manifestNumber = `MAN${Date.now()}`;

      const { data: manifest } = await client.models.Manifest.create({
        tenantId,
        warehouseId,
        brokerId,
        manifestNumber,
        carrierId: values.carrierId,
        serviceType: values.serviceType,
        dispatchDate: values.dispatchDate,
        notes: values.notes,
        status: 'draft',
        connoteCount: selectedConnoteIds.size,
        totalWeightKg: parseFloat(totalWeight.toFixed(3)),
        totalCubicM3: parseFloat(totalCubic.toFixed(6)),
      });

      if (!manifest) throw new Error('Failed to create manifest');

      // Attach connotes to this manifest
      await Promise.all(
        [...selectedConnoteIds].map((connoteId) =>
          client.models.Connote.update({ id: connoteId, manifestId: manifest.id }),
        ),
      );

      // Send to carrier
      const result = await client.mutations.sendManifest({ manifestId: manifest.id });
      return manifest;
    },
    onSuccess: (manifest) => navigate(`/tenant/manifests`),
  });

  return (
    <div style={{ maxWidth: 820 }}>
      <form onSubmit={handleSubmit((v) => createMutation.mutate(v))}>
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Manifest Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Carrier *</label>
              <select {...register('carrierId')} style={inputStyle}>
                <option value="">Select carrier</option>
                {carriers.map((c) => <option key={c} value={c}>{getCarrierLabel(c)}</option>)}
              </select>
              {errors.carrierId && <span style={errStyle}>{errors.carrierId.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Service Type *</label>
              <select {...register('serviceType')} style={inputStyle}>
                {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Dispatch Date *</label>
              <input {...register('dispatchDate')} type="date" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <input {...register('notes')} style={inputStyle} placeholder="Optional notes for the carrier" />
          </div>
        </div>

        {selectedCarrier && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                Select Connotes ({availableConnotes.length} raised, unmanifested)
              </h3>
              <button type="button" onClick={selectAll} style={secondaryBtnStyle}>Select All</button>
            </div>

            {availableConnotes.length === 0 ? (
              <p style={{ color: '#9ca3af', textAlign: 'center', padding: 16 }}>
                No raised connotes available for {getCarrierLabel(selectedCarrier)} / {selectedService}.
              </p>
            ) : (
              <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={thStyle}><input type="checkbox" checked={selectedConnoteIds.size === availableConnotes.length && availableConnotes.length > 0} onChange={(e) => e.target.checked ? selectAll() : setSelectedConnoteIds(new Set())} /></th>
                      <th style={thStyle}>Connote #</th>
                      <th style={thStyle}>Carrier Ref</th>
                      <th style={thStyle}>To</th>
                      <th style={thStyle}>Weight</th>
                      <th style={thStyle}>Cubic</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableConnotes.map((c) => (
                      <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6', cursor: 'pointer', background: selectedConnoteIds.has(c.id) ? '#eff6ff' : undefined }} onClick={() => toggleConnote(c.id)}>
                        <td style={tdStyle}><input type="checkbox" checked={selectedConnoteIds.has(c.id)} onChange={() => toggleConnote(c.id)} onClick={(e) => e.stopPropagation()} /></td>
                        <td style={tdStyle}><strong>{c.connoteNumber}</strong></td>
                        <td style={tdStyle}>{c.carrierConnoteNumber ?? '—'}</td>
                        <td style={tdStyle}>{c.shipToSuburb}, {c.shipToState}</td>
                        <td style={tdStyle}>{formatWeight(c.totalWeightKg)}</td>
                        <td style={tdStyle}>{formatCubic(c.totalCubicM3)}</td>
                        <td style={tdStyle}><StatusBadge status={(c.status as ConnoteStatus) ?? 'draft'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedConnoteIds.size > 0 && (
              <div style={{ marginTop: 12, padding: 12, background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', display: 'flex', gap: 24, fontSize: 14 }}>
                <div><strong>{selectedConnoteIds.size}</strong> connotes selected</div>
                <div>Total weight: <strong>{formatWeight(totalWeight)}</strong></div>
                <div>Total cubic: <strong>{formatCubic(totalCubic)}</strong></div>
              </div>
            )}
          </div>
        )}

        {createMutation.isError && (
          <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
            {(createMutation.error as Error).message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate('/tenant/manifests')} style={cancelBtnStyle}>Cancel</button>
          <button type="submit" disabled={createMutation.isPending || selectedConnoteIds.size === 0} style={{ ...primaryBtnStyle, opacity: selectedConnoteIds.size === 0 ? 0.6 : 1 }}>
            {createMutation.isPending ? 'Creating & Sending...' : '📤 Create & Send Manifest'}
          </button>
        </div>
      </form>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 };
const sectionTitleStyle: React.CSSProperties = { margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#374151' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const errStyle: React.CSSProperties = { fontSize: 11, color: '#dc2626' };
const primaryBtnStyle: React.CSSProperties = { padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const cancelBtnStyle: React.CSSProperties = { padding: '10px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14 };
const secondaryBtnStyle: React.CSSProperties = { padding: '5px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, color: '#374151' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', verticalAlign: 'middle' };
