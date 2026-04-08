import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import DataTable from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

const schema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  suburb: z.string().min(2),
  state: z.string().length(3).or(z.string().length(2)),
  postcode: z.string().length(4),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Warehouse = Awaited<ReturnType<typeof client.models.WarehouseCustomer.list>>['data'][number];

const columns: ColumnDef<Warehouse, unknown>[] = [
  { accessorKey: 'name', header: 'Name', cell: (i) => <strong>{i.getValue<string>()}</strong> },
  {
    id: 'location',
    header: 'Location',
    cell: ({ row }) => `${row.original.suburb ?? ''}, ${row.original.state ?? ''} ${row.original.postcode ?? ''}`,
  },
  { accessorKey: 'contactEmail', header: 'Email' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (i) => (
      <span style={{ padding: '2px 8px', borderRadius: 20, background: i.getValue() === 'active' ? '#dcfce7' : '#fee2e2', color: i.getValue() === 'active' ? '#15803d' : '#dc2626', fontSize: 12 }}>
        {i.getValue<string>()}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Link to={`/broker/warehouses/${row.original.id}/tenants`} style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
        Tenants →
      </Link>
    ),
  },
];

export default function WarehouseCustomers() {
  const { brokerId } = useTenant();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', brokerId],
    queryFn: () => client.models.WarehouseCustomer.list({ filter: { brokerId: { eq: brokerId! } } }),
    enabled: !!brokerId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (values: FormData) =>
      client.models.WarehouseCustomer.create({ ...values, brokerId: brokerId!, status: 'active' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses', brokerId] });
      reset();
      setShowForm(false);
    },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Manage your warehouse customer accounts.</p>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtnStyle}>
          {showForm ? 'Cancel' : '+ Add Warehouse'}
        </button>
      </div>

      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>New Warehouse Customer</h3>
          <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Company Name *</label>
              <input {...register('name')} style={inputStyle} placeholder="ABC Logistics Pty Ltd" />
              {errors.name && <span style={errStyle}>{errors.name.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Street Address *</label>
              <input {...register('address')} style={inputStyle} placeholder="123 Warehouse Dr" />
              {errors.address && <span style={errStyle}>{errors.address.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Suburb *</label>
              <input {...register('suburb')} style={inputStyle} placeholder="Campbellfield" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={labelStyle}>State *</label>
                <select {...register('state')} style={inputStyle}>
                  <option value="">Select</option>
                  {['VIC','NSW','QLD','WA','SA','TAS','ACT','NT'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Postcode *</label>
                <input {...register('postcode')} style={inputStyle} placeholder="3061" maxLength={4} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Contact Email</label>
              <input {...register('contactEmail')} style={inputStyle} type="email" placeholder="ops@warehouse.com.au" />
            </div>
            <div>
              <label style={labelStyle}>Contact Phone</label>
              <input {...register('contactPhone')} style={inputStyle} placeholder="03 9999 9999" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={cancelBtnStyle}>Cancel</button>
              <button type="submit" disabled={isSubmitting || createMutation.isPending} style={primaryBtnStyle}>
                {createMutation.isPending ? 'Saving...' : 'Save Warehouse'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={cardStyle}>
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No warehouse customers yet."
        />
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
