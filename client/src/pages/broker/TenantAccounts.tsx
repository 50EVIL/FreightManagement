import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import DataTable from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

const schema = z.object({
  name: z.string().min(2),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

const assignSchema = z.object({
  email: z.string().email('Valid email required'),
  tenantId: z.string().min(1, 'Select a tenant'),
});

type FormData = z.infer<typeof schema>;
type AssignFormData = z.infer<typeof assignSchema>;
type TenantAcc = Awaited<ReturnType<typeof client.models.TenantAccount.list>>['data'][number];

const columns: ColumnDef<TenantAcc, unknown>[] = [
  { accessorKey: 'name', header: 'Tenant Name', cell: (i) => <strong>{i.getValue<string>()}</strong> },
  { accessorKey: 'contactEmail', header: 'Email' },
  { accessorKey: 'contactPhone', header: 'Phone' },
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
    id: 'tenantId',
    header: 'Tenant ID',
    cell: ({ row }) => <code style={{ fontSize: 11, color: '#6b7280' }}>{row.original.id.slice(0, 12)}…</code>,
  },
];

export default function TenantAccounts() {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const { brokerId } = useTenant();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  const { data: warehouse } = useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: () => client.models.WarehouseCustomer.get({ id: warehouseId! }),
    enabled: !!warehouseId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', warehouseId],
    queryFn: () => client.models.TenantAccount.list({ filter: { warehouseId: { eq: warehouseId! } } }),
    enabled: !!warehouseId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { register: registerAssign, handleSubmit: handleAssignSubmit, reset: resetAssign, formState: { errors: assignErrors } } = useForm<AssignFormData>({
    resolver: zodResolver(assignSchema),
  });

  const assignMutation = useMutation({
    mutationFn: async (v: AssignFormData) => {
      const tenant = tenants.find((t) => t.id === v.tenantId);
      if (!tenant) throw new Error('Tenant not found');
      return client.mutations.assignUserTenant({
        email: v.email,
        tenantId: v.tenantId,
        warehouseId: warehouseId!,
        brokerId: brokerId!,
      });
    },
    onSuccess: (_, v) => {
      setAssignSuccess(`User ${v.email} successfully linked to tenant.`);
      resetAssign();
      setTimeout(() => setAssignSuccess(null), 5000);
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormData) =>
      client.models.TenantAccount.create({
        ...values,
        warehouseId: warehouseId!,
        brokerId: brokerId!,
        status: 'active',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants', warehouseId] });
      reset();
      setShowForm(false);
    },
  });

  const tenants = data?.data ?? [];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
          Tenants for: <strong>{warehouse?.data?.name ?? warehouseId}</strong>
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtnStyle}>
          {showForm ? 'Cancel' : '+ Add Tenant'}
        </button>
      </div>

      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>New Tenant Account</h3>
          <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                {createMutation.isPending ? 'Saving...' : 'Create Tenant'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={cardStyle}>
        <DataTable data={tenants} columns={columns} isLoading={isLoading} emptyMessage="No tenants yet." />
      </div>

      {/* Assign existing user to a tenant */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAssignForm ? 16 : 0 }}>
          <div>
            <strong style={{ fontSize: 14 }}>Assign User to Tenant</strong>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>Link a signed-up user's account to one of the tenants above.</p>
          </div>
          <button onClick={() => setShowAssignForm(!showAssignForm)} style={primaryBtnStyle}>
            {showAssignForm ? 'Cancel' : 'Assign User'}
          </button>
        </div>
        {showAssignForm && (
          <form onSubmit={handleAssignSubmit((v) => assignMutation.mutate(v))} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>User Email *</label>
              <input {...registerAssign('email')} style={inputStyle} type="email" placeholder="user@example.com" />
              {assignErrors.email && <span style={errStyle}>{assignErrors.email.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Tenant *</label>
              <select {...registerAssign('tenantId')} style={inputStyle}>
                <option value="">Select tenant…</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {assignErrors.tenantId && <span style={errStyle}>{assignErrors.tenantId.message}</span>}
            </div>
            {assignSuccess && <div style={{ gridColumn: '1 / -1', color: '#15803d', fontSize: 13 }}>{assignSuccess}</div>}
            {assignMutation.error && <div style={{ gridColumn: '1 / -1', color: '#dc2626', fontSize: 13 }}>{String(assignMutation.error)}</div>}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={assignMutation.isPending} style={primaryBtnStyle}>
                {assignMutation.isPending ? 'Assigning…' : 'Assign User'}
              </button>
            </div>
          </form>
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
