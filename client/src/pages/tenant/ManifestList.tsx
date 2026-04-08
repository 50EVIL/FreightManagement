import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import DataTable from '@/components/ui/DataTable';
import { formatDate, formatWeight, formatCubic } from '@/lib/formatters';
import { getCarrierLabel } from '@/types/carriers';
import type { ColumnDef } from '@tanstack/react-table';

type Manifest = Awaited<ReturnType<typeof client.models.Manifest.list>>['data'][number];

export default function ManifestList() {
  const { tenantId } = useTenant();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['manifests', tenantId],
    queryFn: () => client.models.Manifest.list({ filter: { tenantId: { eq: tenantId! } } }),
    enabled: !!tenantId,
  });

  const statusColors: Record<string, string> = {
    draft: '#d97706', sent: '#2563eb', acknowledged: '#7c3aed', closed: '#16a34a', cancelled: '#dc2626',
  };

  const columns: ColumnDef<Manifest, unknown>[] = [
    { accessorKey: 'manifestNumber', header: 'Manifest #', cell: (i) => <strong style={{ color: '#2563eb' }}>{i.getValue<string>()}</strong> },
    { accessorKey: 'carrierId', header: 'Carrier', cell: (i) => getCarrierLabel(i.getValue<string>()) },
    { accessorKey: 'serviceType', header: 'Service' },
    { accessorKey: 'dispatchDate', header: 'Dispatch Date', cell: (i) => formatDate(i.getValue<string>()) },
    { accessorKey: 'connoteCount', header: 'Connotes', cell: (i) => i.getValue<number>() ?? 0 },
    { accessorKey: 'totalWeightKg', header: 'Weight', cell: (i) => formatWeight(i.getValue<number>()) },
    { accessorKey: 'totalCubicM3', header: 'Cubic', cell: (i) => formatCubic(i.getValue<number>()) },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (i) => {
        const s = i.getValue<string>() ?? 'draft';
        return <span style={{ color: statusColors[s] ?? '#374151', fontWeight: 600, fontSize: 13 }}>{s}</span>;
      },
    },
    { accessorKey: 'carrierManifestRef', header: 'Carrier Ref', cell: (i) => i.getValue<string>() ?? '—' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <Link to="/tenant/manifests/new" style={primaryBtnStyle}>📃 New Manifest</Link>
      </div>
      <div style={cardStyle}>
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No manifests yet."
          onRowClick={(row) => navigate(`/tenant/manifests/${row.id}`)}
        />
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24 };
const primaryBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none' };
