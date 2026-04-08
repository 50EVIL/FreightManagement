import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import DataTable from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

type Tenant = Awaited<ReturnType<typeof client.models.TenantAccount.list>>['data'][number];
type Warehouse = Awaited<ReturnType<typeof client.models.WarehouseCustomer.list>>['data'][number];

const schema = z.object({
  warehouseId: z.string().min(1, 'Select a warehouse'),
  name: z.string().min(2, 'Name required'),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function AllTenants() {
  const { brokerId } = useTenant();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterWarehouseId, setFilterWarehouseId] = useState('');

  // ─── Warehouses ───────────────────────────────────────────────────────────

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', brokerId],
    queryFn: () => client.models.WarehouseCustomer.list({ filter: { brokerId: { eq: brokerId! } } }),
    enabled: !!brokerId,
  });
  const warehouses: Warehouse[] = warehousesData?.data ?? [];
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

  // ─── All tenants for broker ───────────────────────────────────────────────

  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['all-tenants', brokerId],
    queryFn: () => client.models.TenantAccount.list({ filter: { brokerId: { eq: brokerId! } } }),
    enabled: !!brokerId,
  });

  const allTenants: Tenant[] = tenantsData?.data ?? [];
  const tenants = filterWarehouseId
    ? allTenants.filter((t) => t.warehouseId === filterWarehouseId)
    : allTenants;

  // ─── Create form ─────────────────────────────────────────────────────────

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (v: FormData) =>
      client.models.TenantAccount.create({
        ...v,
        brokerId: brokerId!,
        status: 'active',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-tenants', brokerId] });
      reset();
      setShowForm(false);
    },
  });

  // ─── Columns ─────────────────────────────────────────────────────────────

  const columns: ColumnDef<Tenant, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Tenant Name',
      cell: (i) => <strong>{i.getValue<string>()}</strong>,
    },
    {
      id: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }) => warehouseMap.get(row.original.warehouseId) ?? row.original.warehouseId,
    },
    { accessorKey: 'contactEmail', header: 'Email' },
    { accessorKey: 'contactPhone', header: 'Phone' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (i) => (
        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 12, background: i.getValue() === 'active' ? '#dcfce7' : '#fee2e2', color: i.getValue() === 'active' ? '#15803d' : '#dc2626' }}>
          {i.getValue<string>()}
        </span>
      ),
    },
    {
      id: 'tenantId',
      header: 'Tenant ID',
      cell: ({ row }) => <code style={{ fontSize: 11, color: '#6b7280' }}>{row.original.id.slice(0, 12)}…</code>,
    },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Filter by warehouse:</label>
          <select
            value={filterWarehouseId}
            onChange={(e) => setFilterWarehouseId(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
          >
            <option value="">All warehouses</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtnStyle}>
          {showForm ? 'Cancel' : '+ Add Tenant'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>New Tenant Account</h3>
          <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Warehouse *</label>
              <select {...register('warehouseId')} style={inputStyle}>
                <option value="">Select warehouse…</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              {errors.warehouseId && <span style={errStyle}>{errors.warehouseId.message}</span>}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Tenant Name *</label>
              <input {...register('name')} style={inputStyle} placeholder="Acme Imports Pty Ltd" />
              {errors.name && <span style={errStyle}>{errors.name.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Contact Email</label>
              <input {...register('contactEmail')} style={inputStyle} type="email" />
            </div>
            <div>
              <label style={labelStyle}>Contact Phone</label>
              <input {...register('contactPhone')} style={inputStyle} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={cancelBtnStyle}>Cancel</button>
              <button type="submit" disabled={isSubmitting || createMutation.isPending} style={primaryBtnStyle}>
                {createMutation.isPending ? 'Saving…' : 'Create Tenant'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tenants table */}
      <div style={cardStyle}>
        <DataTable data={tenants} columns={columns} isLoading={isLoading} emptyMessage="No tenants yet. Add your first tenant above." />
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
