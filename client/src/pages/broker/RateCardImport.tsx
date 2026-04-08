import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import FileUpload from '@/components/ui/FileUpload';
import { getCarrierLabel } from '@/types/carriers';

const carriers = ['TOLL', 'STARTRACK', 'CP', 'TNT', 'SENDLE', 'MOCK'];

const schema = z.object({
  carrierId: z.string().min(1, 'Select a carrier'),
  name: z.string().min(2, 'Name is required'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
});

type FormData = z.infer<typeof schema>;

export default function RateCardImport() {
  const { brokerId } = useTenant();
  const navigate = useNavigate();
  const [s3Key, setS3Key] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { effectiveDate: new Date().toISOString().split('T')[0] },
  });

  const carrierId = watch('carrierId');

  async function onSubmit(values: FormData) {
    if (!s3Key) { setError('Please upload a rate card file first.'); return; }
    if (!brokerId) return;
    setError(null);
    setIsImporting(true);
    try {
      const result = await client.mutations.importRateCard({
        brokerId,
        s3Key,
        carrierId: values.carrierId,
        name: values.name,
        effectiveDate: values.effectiveDate,
      });
      const data = result.data as { success: boolean; rateCardId: string; entryCount: number } | null;
      if (data?.success) {
        setSuccess(`Successfully imported ${data.entryCount.toLocaleString()} rate entries.`);
        setTimeout(() => navigate('/broker/rate-cards'), 2000);
      } else {
        setError('Import failed. Please check your file format.');
      }
    } catch (e) {
      setError((e as Error).message ?? 'Import failed');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600 }}>Import Carrier Rate Card</h2>

        <div style={{ marginBottom: 24, padding: 16, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd', fontSize: 13, color: '#0369a1' }}>
          <strong>Expected CSV format:</strong> from_state, to_state, from_postcode, to_postcode, service_type, weight_break_kg, cubic_break_m3, base_rate, unit, dim_factor
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Carrier *</label>
            <select {...register('carrierId')} style={inputStyle}>
              <option value="">Select carrier</option>
              {carriers.map((c) => <option key={c} value={c}>{getCarrierLabel(c)}</option>)}
            </select>
            {errors.carrierId && <span style={errStyle}>{errors.carrierId.message}</span>}
          </div>

          <div>
            <label style={labelStyle}>Rate Card Name *</label>
            <input {...register('name')} style={inputStyle} placeholder={carrierId ? `${getCarrierLabel(carrierId)} Standard Rates 2025` : 'Rate card name'} />
            {errors.name && <span style={errStyle}>{errors.name.message}</span>}
          </div>

          <div>
            <label style={labelStyle}>Effective Date *</label>
            <input {...register('effectiveDate')} style={inputStyle} type="date" />
            {errors.effectiveDate && <span style={errStyle}>{errors.effectiveDate.message}</span>}
          </div>

          <div>
            <label style={labelStyle}>Rate Card File (CSV or Excel) *</label>
            <FileUpload
              accept=".csv,.xlsx,.xls"
              path={`rate-cards/${brokerId}`}
              onUploadComplete={setS3Key}
              label="Drop carrier rate card CSV/Excel here"
            />
          </div>

          {error && <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 13 }}>{error}</div>}
          {success && <div style={{ padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, color: '#15803d', fontSize: 13 }}>{success}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => navigate('/broker/rate-cards')} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={isImporting || !s3Key} style={{ ...primaryBtnStyle, opacity: (!s3Key || isImporting) ? 0.6 : 1 }}>
              {isImporting ? 'Importing...' : '📥 Import Rate Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 28 };
const primaryBtnStyle: React.CSSProperties = { padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const errStyle: React.CSSProperties = { fontSize: 11, color: '#dc2626' };
