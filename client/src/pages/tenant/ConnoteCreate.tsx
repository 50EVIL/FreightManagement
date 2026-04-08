import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import ConnoteReferencesEditor from '@/components/connote/ConnoteReferencesEditor';
import ConnoteLineItemsTable, { type LineItemRow } from '@/components/connote/ConnoteLineItemsTable';
import type { ConnoteReference } from '@/types/connote';
import { computeCubicM3 } from '@/lib/formatters';

const STATES = ['VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const carriers = ['TOLL', 'STARTRACK', 'CP', 'TNT', 'SENDLE', 'MOCK'];

const schema = z.object({
  carrierId: z.string().min(1, 'Select a carrier'),
  serviceType: z.string().min(1, 'Select a service'),
  shipToName: z.string().min(2, 'Recipient name required'),
  shipToAddress: z.string().min(5, 'Address required'),
  shipToSuburb: z.string().min(2, 'Suburb required'),
  shipToState: z.string().min(2, 'State required'),
  shipToPostcode: z.string().length(4, 'Must be 4 digits'),
  shipToContactName: z.string().optional(),
  shipToPhone: z.string().optional(),
  specialInstructions: z.string().optional(),
  tailLift: z.boolean(),
  dangerousGoods: z.boolean(),
  authority2Leave: z.boolean(),
});

type FormData = z.infer<typeof schema>;

const SERVICE_TYPES = ['STANDARD', 'ROAD_EXPRESS', 'OVERNIGHT', 'ECONOMY', 'SAMEDAY'];

export default function ConnoteCreate() {
  const { tenantId, warehouseId, brokerId } = useTenant();
  const navigate = useNavigate();
  const [references, setReferences] = useState<ConnoteReference[]>([{ type: 'order_number', value: '' }]);
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [raiseNow, setRaiseNow] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tailLift: false, dangerousGoods: false, authority2Leave: false, serviceType: 'STANDARD' },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormData) => {
      if (!tenantId || !warehouseId || !brokerId) throw new Error('Missing tenant context');

      const totalWeightKg = lineItems.reduce((s, li) => s + li.weightKg * li.quantity, 0);
      const totalCubicM3 = lineItems.reduce(
        (s, li) => s + computeCubicM3(li.lengthCm, li.widthCm, li.heightCm, li.quantity), 0,
      );
      const connoteNumber = `CON${Date.now()}`;
      const validRefs = references.filter((r) => r.value.trim().length > 0);

      const { data: connote } = await client.models.Connote.create({
        ...values,
        tenantId,
        warehouseId,
        brokerId,
        connoteNumber,
        status: 'draft',
        totalWeightKg: parseFloat(totalWeightKg.toFixed(3)),
        totalCubicM3: parseFloat(totalCubicM3.toFixed(6)),
        referencesJson: validRefs.length > 0 ? JSON.stringify(validRefs) : null,
      });

      if (!connote) throw new Error('Failed to create connote');

      // Create line items
      await Promise.all(
        lineItems.map((li) =>
          client.models.ConnoteLineItem.create({
            connoteId: connote.id,
            tenantId,
            description: li.description,
            quantity: li.quantity,
            lengthCm: li.lengthCm,
            widthCm: li.widthCm,
            heightCm: li.heightCm,
            weightKg: li.weightKg,
            cubicM3: parseFloat(computeCubicM3(li.lengthCm, li.widthCm, li.heightCm, li.quantity).toFixed(6)),
            packagingType: li.packagingType as 'carton' | 'pallet' | 'crate' | 'drum' | 'roll' | 'bag' | 'other',
          }),
        ),
      );

      // Optionally raise with carrier immediately
      if (raiseNow) {
        await client.mutations.raiseConnote({ connoteId: connote.id });
      }

      return connote;
    },
    onSuccess: (connote) => navigate(`/tenant/connotes/${connote!.id}`),
  });

  return (
    <div style={{ maxWidth: 860 }}>
      <form onSubmit={handleSubmit((v) => createMutation.mutate(v))}>

        {/* Carrier & Service */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Carrier & Service</h3>
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Carrier *</label>
              <select {...register('carrierId')} style={inputStyle}>
                <option value="">Select carrier</option>
                {carriers.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.carrierId && <span style={errStyle}>{errors.carrierId.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Service Type *</label>
              <select {...register('serviceType')} style={inputStyle}>
                {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Delivery address */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Delivery Address</h3>
          <div style={gridStyle}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Recipient Company / Name *</label>
              <input {...register('shipToName')} style={inputStyle} placeholder="Acme Imports Pty Ltd" />
              {errors.shipToName && <span style={errStyle}>{errors.shipToName.message}</span>}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Street Address *</label>
              <input {...register('shipToAddress')} style={inputStyle} placeholder="45 Distribution Way" />
              {errors.shipToAddress && <span style={errStyle}>{errors.shipToAddress.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Suburb *</label>
              <input {...register('shipToSuburb')} style={inputStyle} />
              {errors.shipToSuburb && <span style={errStyle}>{errors.shipToSuburb.message}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={labelStyle}>State *</label>
                <select {...register('shipToState')} style={inputStyle}>
                  <option value="">Select</option>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
                {errors.shipToState && <span style={errStyle}>{errors.shipToState.message}</span>}
              </div>
              <div>
                <label style={labelStyle}>Postcode *</label>
                <input {...register('shipToPostcode')} style={inputStyle} maxLength={4} placeholder="3000" />
                {errors.shipToPostcode && <span style={errStyle}>{errors.shipToPostcode.message}</span>}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Contact Name</label>
              <input {...register('shipToContactName')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Contact Phone</label>
              <input {...register('shipToPhone')} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div style={sectionStyle}>
          <ConnoteLineItemsTable items={lineItems} onChange={setLineItems} />
        </div>

        {/* References */}
        <div style={sectionStyle}>
          <ConnoteReferencesEditor references={references} onChange={setReferences} />
        </div>

        {/* Special requirements */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Special Requirements & Instructions</h3>
          <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
            {[
              { name: 'tailLift', label: 'Tail-Lift Required' },
              { name: 'dangerousGoods', label: 'Dangerous Goods' },
              { name: 'authority2Leave', label: 'Authority to Leave' },
            ].map(({ name, label }) => (
              <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                <input {...register(name as keyof FormData)} type="checkbox" />
                {label}
              </label>
            ))}
          </div>
          <div>
            <label style={labelStyle}>Special Instructions</label>
            <textarea {...register('specialInstructions')} style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="e.g. Ring before delivery, fragile items" />
          </div>
        </div>

        {/* Raise option */}
        <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={raiseNow} onChange={(e) => setRaiseNow(e.target.checked)} />
            <span><strong>Raise with carrier immediately</strong> — sends the connote to the carrier API after saving</span>
          </label>
        </div>

        {createMutation.isError && (
          <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
            {(createMutation.error as Error).message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate('/tenant/connotes')} style={cancelBtnStyle}>Cancel</button>
          <button type="submit" disabled={createMutation.isPending} style={primaryBtnStyle}>
            {createMutation.isPending ? 'Saving...' : raiseNow ? '📤 Save & Raise' : '💾 Save Connote'}
          </button>
        </div>
      </form>
    </div>
  );
}

const sectionStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 };
const sectionTitleStyle: React.CSSProperties = { margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#374151', borderBottom: '1px solid #f3f4f6', paddingBottom: 10 };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const errStyle: React.CSSProperties = { fontSize: 11, color: '#dc2626' };
const primaryBtnStyle: React.CSSProperties = { padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const cancelBtnStyle: React.CSSProperties = { padding: '10px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14 };
