import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { getCarrierLabel } from '@/types/carriers';
import FileUpload from '@/components/ui/FileUpload';

const schema = z.object({
  carrierId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

const carriers = ['TOLL', 'STARTRACK', 'CP', 'TNT', 'SENDLE', 'MOCK'];

type Invoice = Awaited<ReturnType<typeof client.models.CarrierInvoice.list>>['data'][number];

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    imported: ['#dbeafe', '#1d4ed8'],
    matching: ['#fef9c3', '#854d0e'],
    reconciled: ['#dcfce7', '#15803d'],
    disputed: ['#fee2e2', '#dc2626'],
    paid: ['#f0fdf4', '#15803d'],
  };
  const [bg, color] = colors[status] ?? ['#f3f4f6', '#374151'];
  return <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: bg, color }}>{status}</span>;
}

export default function InvoiceReconciliation() {
  const { brokerId } = useTenant();
  const qc = useQueryClient();
  const [showImport, setShowImport] = useState(false);
  const [s3Key, setS3Key] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [reconResult, setReconResult] = useState<{ matchedCount: number; varianceCount: number; totalVarianceAmount: number } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', brokerId],
    queryFn: () => client.models.CarrierInvoice.list({ filter: { brokerId: { eq: brokerId! } } }),
    enabled: !!brokerId,
  });

  const { register, handleSubmit, reset, formState: { errors: _errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const importMutation = useMutation({
    mutationFn: async (v: FormData) => {
      if (!s3Key || !brokerId) throw new Error('Missing required fields');
      const result = await client.mutations.importCarrierInvoice({
        brokerId,
        s3Key,
        carrierId: v.carrierId,
        invoiceNumber: v.invoiceNumber,
        invoiceDate: v.invoiceDate,
      });
      return result.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices', brokerId] }); reset(); setS3Key(null); setShowImport(false); },
  });

  async function handleReconcile(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setReconciling(true);
    setReconResult(null);
    try {
      const r = await client.mutations.reconcileInvoice({ invoiceId: invoice.id });
      const d = r.data as { matchedCount: number; varianceCount: number; totalVarianceAmount: number } | null;
      if (d) setReconResult(d);
      qc.invalidateQueries({ queryKey: ['invoices', brokerId] });
    } finally {
      setReconciling(false);
    }
  }

  const invoices = data?.data ?? [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Import carrier invoices and auto-reconcile against your connote charges.</p>
        <button onClick={() => setShowImport(!showImport)} style={primaryBtnStyle}>
          {showImport ? 'Cancel' : '📥 Import Invoice'}
        </button>
      </div>

      {showImport && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Import Carrier Invoice</h3>
          <form onSubmit={handleSubmit((v) => importMutation.mutate(v))} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Carrier *</label>
              <select {...register('carrierId')} style={inputStyle}>
                <option value="">Select</option>
                {carriers.map((c) => <option key={c} value={c}>{getCarrierLabel(c)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Invoice Number *</label>
              <input {...register('invoiceNumber')} style={inputStyle} placeholder="INV-2025-001234" />
            </div>
            <div>
              <label style={labelStyle}>Invoice Date *</label>
              <input {...register('invoiceDate')} type="date" style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Invoice CSV File *</label>
              <FileUpload accept=".csv" path={`carrier-invoices/${brokerId}`} onUploadComplete={setS3Key} label="Drop carrier invoice CSV here" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="submit" disabled={!s3Key || importMutation.isPending} style={{ ...primaryBtnStyle, opacity: (!s3Key || importMutation.isPending) ? 0.6 : 1 }}>
                {importMutation.isPending ? 'Importing...' : 'Import Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {reconResult && selectedInvoice && (
        <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 16 }}>
          <strong>Reconciliation complete for {selectedInvoice.invoiceNumber}:</strong>
          {' '}{reconResult.matchedCount} matched, {reconResult.varianceCount} variances
          {reconResult.varianceCount > 0 && ` (${formatCurrency(reconResult.totalVarianceAmount)} total variance)`}
        </div>
      )}

      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              {['Invoice #', 'Carrier', 'Date', 'Total', 'Lines', 'Matched', 'Variances', 'Status', ''].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No invoices imported yet.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}><strong>{inv.invoiceNumber}</strong></td>
                  <td style={tdStyle}>{getCarrierLabel(inv.carrierId)}</td>
                  <td style={tdStyle}>{formatDate(inv.invoiceDate)}</td>
                  <td style={tdStyle}>{formatCurrency(inv.totalAmount)}</td>
                  <td style={tdStyle}>{inv.lineCount ?? '—'}</td>
                  <td style={tdStyle}>{inv.matchedCount ?? '—'}</td>
                  <td style={{ ...tdStyle, color: (inv.varianceCount ?? 0) > 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                    {inv.varianceCount ?? '—'}
                    {(inv.varianceCount ?? 0) > 0 && <div style={{ fontSize: 11, fontWeight: 400 }}>{formatCurrency(inv.totalVarianceAmount ?? 0)}</div>}
                  </td>
                  <td style={tdStyle}><StatusPill status={inv.status ?? 'imported'} /></td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleReconcile(inv)}
                      disabled={reconciling && selectedInvoice?.id === inv.id}
                      style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {reconciling && selectedInvoice?.id === inv.id ? 'Reconciling...' : 'Reconcile'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24, marginBottom: 20 };
const primaryBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4 };
const tdStyle: React.CSSProperties = { padding: '10px 14px', verticalAlign: 'middle' };
