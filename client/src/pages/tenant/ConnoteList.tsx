import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate, formatCurrency, formatWeight, formatCubic } from '@/lib/formatters';
import type { ColumnDef } from '@tanstack/react-table';
import type { ConnoteStatus } from '@/types/connote';

type Connote = Awaited<ReturnType<typeof client.models.Connote.list>>['data'][number];

export default function ConnoteList() {
  const { tenantId } = useTenant();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['connotes', tenantId],
    queryFn: () => client.models.Connote.list({ filter: { tenantId: { eq: tenantId! } } }),
    enabled: !!tenantId,
  });

  const columns: ColumnDef<Connote, unknown>[] = [
    {
      accessorKey: 'connoteNumber',
      header: 'Connote #',
      cell: (i) => <strong style={{ color: '#2563eb' }}>{i.getValue<string>()}</strong>,
    },
    {
      accessorKey: 'carrierConnoteNumber',
      header: 'Carrier Ref',
      cell: (i) => i.getValue<string>() ?? <span style={{ color: '#9ca3af' }}>Not raised</span>,
    },
    { accessorKey: 'carrierId', header: 'Carrier' },
    {
      id: 'destination',
      header: 'Destination',
      cell: ({ row }) => `${row.original.shipToSuburb}, ${row.original.shipToState} ${row.original.shipToPostcode}`,
    },
    {
      id: 'weight',
      header: 'Weight',
      cell: ({ row }) => formatWeight(row.original.totalWeightKg),
    },
    {
      id: 'cubic',
      header: 'Cubic',
      cell: ({ row }) => formatCubic(row.original.totalCubicM3),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (i) => <StatusBadge status={(i.getValue<string>() as ConnoteStatus) ?? 'draft'} />,
    },
    { accessorKey: 'expectedDeliveryDate', header: 'Est. Delivery', cell: (i) => formatDate(i.getValue<string>()) },
    { accessorKey: 'estimatedCost', header: 'Est. Cost', cell: (i) => formatCurrency(i.getValue<number>()) },
    {
      id: 'references',
      header: 'References',
      cell: ({ row }) => {
        const refs: { type: string; value: string }[] = row.original.referencesJson
          ? JSON.parse(row.original.referencesJson)
          : [];
        return refs.length > 0
          ? <span style={{ fontSize: 11, color: '#6b7280' }}>{refs.slice(0, 2).map((r) => r.value).join(', ')}{refs.length > 2 ? ` +${refs.length - 2}` : ''}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <Link to="/tenant/connotes/new" style={primaryBtnStyle}>📦 New Connote</Link>
      </div>

      <div style={cardStyle}>
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No connotes yet. Create your first one."
          onRowClick={(row) => navigate(`/tenant/connotes/${row.id}`)}
        />
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24 };
const primaryBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none' };
