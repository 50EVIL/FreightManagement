import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import { formatDate } from '@/lib/formatters';
import { getCarrierLabel } from '@/types/carriers';
import DataTable from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

type RateCard = Awaited<ReturnType<typeof client.models.CarrierRateCard.list>>['data'][number];

const columns: ColumnDef<RateCard, unknown>[] = [
  { accessorKey: 'name', header: 'Name', cell: (i) => <strong>{i.getValue<string>()}</strong> },
  { accessorKey: 'carrierId', header: 'Carrier', cell: (i) => getCarrierLabel(i.getValue<string>()) },
  { accessorKey: 'effectiveDate', header: 'Effective', cell: (i) => formatDate(i.getValue<string>()) },
  { accessorKey: 'expiryDate', header: 'Expires', cell: (i) => formatDate(i.getValue<string>()) },
  { accessorKey: 'entryCount', header: 'Entries', cell: (i) => i.getValue<number>()?.toLocaleString() ?? '—' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (i) => {
      const s = i.getValue<string>();
      const colors: Record<string, string> = { active: '#16a34a', draft: '#d97706', archived: '#6b7280' };
      return <span style={{ color: colors[s] ?? '#374151', fontWeight: 600, fontSize: 13 }}>{s}</span>;
    },
  },
  {
    id: 'actions',
    header: '',
    cell: () => (
      <button style={{ fontSize: 13, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>
        Publish →
      </button>
    ),
  },
];

export default function CarrierRateCards() {
  const { brokerId } = useTenant();

  const { data, isLoading } = useQuery({
    queryKey: ['rateCards', brokerId],
    queryFn: () => client.models.CarrierRateCard.list({ filter: { brokerId: { eq: brokerId! } } }),
    enabled: !!brokerId,
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
          Import carrier rate cards, apply markup, and publish to your warehouse customers.
        </p>
        <Link to="/broker/rate-cards/import" style={primaryBtnStyle}>
          📥 Import Rate Card
        </Link>
      </div>

      <div style={cardStyle}>
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No rate cards imported yet. Click 'Import Rate Card' to get started."
        />
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24 };
const primaryBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 };
