import { useState } from 'react';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';

const REPORT_TYPES = [
  { value: 'connote_summary', label: 'Connote Summary', description: 'All connotes with status, references, cost, delivery details' },
  { value: 'overdue_connotes', label: 'Overdue Connotes', description: 'Connotes past their expected delivery date' },
  { value: 'carrier_performance', label: 'Carrier Performance', description: 'Delivery rates, transit times by carrier' },
  { value: 'connote_cost', label: 'Connote Cost Report', description: 'Estimated vs actual costs, charges breakdown' },
];

type ReportType = 'connote_summary' | 'overdue_connotes' | 'carrier_performance' | 'invoice_reconciliation' | 'connote_cost';

export default function Reports() {
  const { tenantId } = useTenant();
  const [reportType, setReportType] = useState<ReportType>('connote_summary');
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!tenantId) return;
    setIsExporting(true);
    setDownloadUrl(null);
    setError(null);
    try {
      const result = await client.mutations.exportReport({
        tenantId,
        reportType,
        format,
      });
      const data = result.data as { downloadUrl: string; rowCount: number } | null;
      if (data?.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
        setRowCount(data.rowCount);
      } else {
        setError('Export failed — no download URL returned.');
      }
    } catch (e) {
      setError((e as Error).message ?? 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }

  const selectedReport = REPORT_TYPES.find((r) => r.value === reportType);

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 600 }}>Export Reports</h2>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Report Type</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {REPORT_TYPES.map((rt) => (
              <label
                key={rt.value}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
                  borderRadius: 8, border: `1px solid ${reportType === rt.value ? '#bfdbfe' : '#e5e7eb'}`,
                  background: reportType === rt.value ? '#eff6ff' : '#fff',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  value={rt.value}
                  checked={reportType === rt.value}
                  onChange={() => setReportType(rt.value as ReportType)}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{rt.label}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{rt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Format</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['csv', 'pdf'] as const).map((f) => (
              <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, padding: '8px 16px', borderRadius: 6, border: `1px solid ${format === f ? '#bfdbfe' : '#e5e7eb'}`, background: format === f ? '#eff6ff' : '#fff' }}>
                <input type="radio" value={f} checked={format === f} onChange={() => setFormat(f)} />
                {f.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleExport} disabled={isExporting} style={primaryBtnStyle}>
          {isExporting ? 'Generating report...' : `📊 Export ${selectedReport?.label}`}
        </button>

        {error && (
          <div style={{ marginTop: 16, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        )}

        {downloadUrl && (
          <div style={{ marginTop: 16, padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, color: '#15803d', marginBottom: 8 }}>
              ✓ Report ready — {rowCount?.toLocaleString()} records
            </div>
            <a
              href={downloadUrl}
              download
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#16a34a', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}
            >
              ⬇️ Download {format.toUpperCase()}
            </a>
            <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280' }}>Link expires in 15 minutes</div>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 28 };
const primaryBtnStyle: React.CSSProperties = { padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, width: '100%' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 };
