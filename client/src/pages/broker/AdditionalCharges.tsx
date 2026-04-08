import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import { formatCurrency } from '@/lib/formatters';

const CHARGE_TYPES = [
  { value: 'flat', label: 'Flat Fee ($)' },
  { value: 'percentage', label: 'Percentage of Freight (%)' },
  { value: 'per_kg', label: 'Per Kilogram ($/kg)' },
  { value: 'per_cubic', label: 'Per Cubic Metre ($/m³)' },
  { value: 'per_connote', label: 'Per Connote ($)' },
  { value: 'single_connote_minimum', label: 'Minimum Connote Charge ($)' },
  { value: 'fuel_surcharge_pct', label: 'Fuel Surcharge (%)' },
  { value: 'remote_area_flat', label: 'Remote Area Surcharge ($)' },
  { value: 'tailLift_flat', label: 'Tail-Lift Fee ($)' },
  { value: 'dangerous_goods_pct', label: 'Dangerous Goods Surcharge (%)' },
  { value: 'booking_fee_flat', label: 'Booking Fee ($)' },
];

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  chargeType: z.string().min(1),
  value: z.coerce.number().positive(),
  applicableTo: z.string(),
  carrierId: z.string().optional(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().optional(),
});

type FormData = z.infer<typeof schema>;
type Charge = Awaited<ReturnType<typeof client.models.AdditionalCharge.list>>['data'][number];

export default function AdditionalCharges() {
  const { brokerId } = useTenant();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['additionalCharges', brokerId],
    queryFn: () => client.models.AdditionalCharge.list({ filter: { brokerId: { eq: brokerId! } } }),
    enabled: !!brokerId,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { applicableTo: 'all', isActive: true, sortOrder: 10 },
  });

  const createMutation = useMutation({
    mutationFn: (v: FormData) => client.models.AdditionalCharge.create({ ...v, brokerId: brokerId! }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['additionalCharges', brokerId] }); reset(); setShowForm(false); },
  });

  const toggleMutation = useMutation({
    mutationFn: (charge: Charge) => client.models.AdditionalCharge.update({ id: charge.id, isActive: !charge.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['additionalCharges', brokerId] }),
  });

  const charges = [...(data?.data ?? [])].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
          Configure additional charges applied on top of freight rates (fuel surcharges, booking fees, minimums etc.)
        </p>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtnStyle}>
          {showForm ? 'Cancel' : '+ Add Charge'}
        </button>
      </div>

      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>New Additional Charge</h3>
          <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Charge Name *</label>
              <input {...register('name')} style={inputStyle} placeholder="Fuel Surcharge" />
              {errors.name && <span style={errStyle}>{errors.name.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Charge Type *</label>
              <select {...register('chargeType')} style={inputStyle}>
                <option value="">Select type</option>
                {CHARGE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Value *</label>
              <input {...register('value')} type="number" step="0.01" style={inputStyle} placeholder="e.g. 12.5" />
              {errors.value && <span style={errStyle}>{errors.value.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Applies To</label>
              <select {...register('applicableTo')} style={inputStyle}>
                <option value="all">All Carriers / Routes</option>
                <option value="specific_carrier">Specific Carrier</option>
                <option value="specific_service">Specific Service Type</option>
                <option value="specific_route">Specific Route</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input {...register('description')} style={inputStyle} placeholder="Optional description" />
            </div>
            <div>
              <label style={labelStyle}>Sort Order</label>
              <input {...register('sortOrder')} type="number" style={inputStyle} placeholder="10" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input {...register('isActive')} type="checkbox" id="isActive" defaultChecked />
              <label htmlFor="isActive" style={{ fontSize: 14 }}>Active (applied to all new connotes)</label>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} style={cancelBtnStyle}>Cancel</button>
              <button type="submit" disabled={createMutation.isPending} style={primaryBtnStyle}>
                {createMutation.isPending ? 'Saving...' : 'Save Charge'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={cardStyle}>
        {isLoading ? (
          <p style={{ color: '#9ca3af' }}>Loading...</p>
        ) : charges.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>No additional charges configured. Add one above.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                {['#', 'Name', 'Type', 'Value', 'Applies To', 'Active', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => {
                const typeLabel = CHARGE_TYPES.find((t) => t.value === c.chargeType)?.label ?? c.chargeType;
                const isPct = c.chargeType?.includes('pct') || c.chargeType === 'percentage';
                const displayValue = isPct ? `${c.value}%` : formatCurrency(c.value ?? 0);
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>{c.sortOrder ?? '—'}</td>
                    <td style={tdStyle}><strong>{c.name}</strong>{c.description && <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.description}</div>}</td>
                    <td style={tdStyle}>{typeLabel}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{displayValue}</td>
                    <td style={tdStyle}>{c.applicableTo}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleMutation.mutate(c)}
                        style={{ padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: c.isActive ? '#dcfce7' : '#fee2e2', color: c.isActive ? '#15803d' : '#dc2626' }}
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={tdStyle}>
                      <button style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24, marginBottom: 20 };
const primaryBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const errStyle: React.CSSProperties = { fontSize: 11, color: '#dc2626' };
const tdStyle: React.CSSProperties = { padding: '10px 14px', verticalAlign: 'middle' };
