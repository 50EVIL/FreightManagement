import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { client } from '@/lib/amplifyClient';
import { useTenant } from '@/providers/TenantProvider';
import DataTable from '@/components/ui/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

type CognitoUser = {
  username: string;
  email: string;
  status: string;
  enabled: boolean;
  tenantId: string | null;
  warehouseId: string | null;
  brokerId: string | null;
  role: string | null;
  createdAt: string | null;
};

type Warehouse = Awaited<ReturnType<typeof client.models.WarehouseCustomer.list>>['data'][number];
type Tenant = Awaited<ReturnType<typeof client.models.TenantAccount.list>>['data'][number];

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
});
const assignSchema = z.object({
  warehouseId: z.string().min(1, 'Select a warehouse'),
  tenantId: z.string().min(1, 'Select a tenant'),
});

type InviteForm = z.infer<typeof inviteSchema>;
type AssignForm = z.infer<typeof assignSchema>;

export default function UserManagement() {
  const { brokerId } = useTenant();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [assigningUser, setAssigningUser] = useState<CognitoUser | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);

  // ─── Data queries ────────────────────────────────────────────────────────

  const { data: usersResult, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['cognitoUsers'],
    queryFn: () => client.queries.listCognitoUsers({}),
  });
  const users: CognitoUser[] = (usersResult?.data as CognitoUser[] | null) ?? [];

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses', brokerId],
    queryFn: () => client.models.WarehouseCustomer.list({ filter: { brokerId: { eq: brokerId! } } }),
    enabled: !!brokerId,
  });
  const warehouses: Warehouse[] = warehousesData?.data ?? [];
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

  // ─── Forms ───────────────────────────────────────────────────────────────

  const { register: regInvite, handleSubmit: handleInvite, reset: resetInvite, formState: { errors: inviteErrors } } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) });

  const { register: regAssign, handleSubmit: handleAssign, reset: resetAssign, watch: watchAssign, formState: { errors: assignErrors } } = useForm<AssignForm>({ resolver: zodResolver(assignSchema) });

  const selectedWarehouseId = watchAssign('warehouseId');

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants', selectedWarehouseId],
    queryFn: () => client.models.TenantAccount.list({ filter: { warehouseId: { eq: selectedWarehouseId } } }),
    enabled: !!selectedWarehouseId,
  });
  const tenants: Tenant[] = tenantsData?.data ?? [];

  // ─── Mutations ───────────────────────────────────────────────────────────

  const inviteMutation = useMutation({
    mutationFn: (v: InviteForm) => client.mutations.inviteUser({ email: v.email }),
    onSuccess: (_, v) => {
      setInviteSuccess(`Invitation sent to ${v.email}. They will receive a temporary password by email.`);
      resetInvite();
      setShowInviteForm(false);
      refetchUsers();
      setTimeout(() => setInviteSuccess(null), 8000);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (v: AssignForm) =>
      client.mutations.assignUserTenant({
        email: assigningUser!.email,
        tenantId: v.tenantId,
        warehouseId: v.warehouseId,
        brokerId: brokerId!,
      }),
    onSuccess: () => {
      setAssignSuccess(`${assigningUser!.email} successfully assigned.`);
      setAssigningUser(null);
      resetAssign();
      refetchUsers();
      setTimeout(() => setAssignSuccess(null), 5000);
    },
  });

  // ─── Table columns ───────────────────────────────────────────────────────

  const columns: ColumnDef<CognitoUser, unknown>[] = [
    {
      accessorKey: 'email',
      header: 'Email',
      cell: (i) => <strong style={{ fontSize: 13 }}>{i.getValue<string>()}</strong>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (i) => {
        const v = i.getValue<string>();
        const isPending = v === 'FORCE_CHANGE_PASSWORD';
        return (
          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 12, background: isPending ? '#fef9c3' : v === 'CONFIRMED' ? '#dcfce7' : '#fee2e2', color: isPending ? '#854d0e' : v === 'CONFIRMED' ? '#15803d' : '#dc2626' }}>
            {isPending ? 'Pending' : v === 'CONFIRMED' ? 'Active' : v}
          </span>
        );
      },
    },
    {
      id: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }) => {
        const wid = row.original.warehouseId;
        return wid ? <span style={{ fontSize: 12 }}>{warehouseMap.get(wid) ?? wid.slice(0, 10) + '…'}</span> : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>;
      },
    },
    {
      accessorKey: 'tenantId',
      header: 'Tenant ID',
      cell: (i) => {
        const v = i.getValue<string | null>();
        return v ? <code style={{ fontSize: 11, color: '#6b7280' }}>{v.slice(0, 12)}…</code> : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => { setAssigningUser(row.original); resetAssign(); }}
          style={{ padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          Assign →
        </button>
      ),
    },
  ];

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 8 }}>
        <button onClick={() => { setShowInviteForm(!showInviteForm); setAssigningUser(null); }} style={primaryBtnStyle}>
          {showInviteForm ? 'Cancel' : '+ Invite User'}
        </button>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Invite New User</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
            The user will receive an email with a temporary password. They will be added to the <strong>TenantUsers</strong> group and can be assigned to a tenant below.
          </p>
          <form onSubmit={handleInvite((v) => inviteMutation.mutate(v))} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <input {...regInvite('email')} style={inputStyle} type="email" placeholder="user@example.com" />
              {inviteErrors.email && <span style={errStyle}>{inviteErrors.email.message}</span>}
            </div>
            <button type="submit" disabled={inviteMutation.isPending} style={primaryBtnStyle}>
              {inviteMutation.isPending ? 'Sending…' : 'Send Invitation'}
            </button>
          </form>
          {inviteMutation.error && <p style={{ marginTop: 8, ...errStyle }}>{String(inviteMutation.error)}</p>}
        </div>
      )}

      {/* Success banners */}
      {inviteSuccess && <div style={successBanner}>{inviteSuccess}</div>}
      {assignSuccess && <div style={successBanner}>{assignSuccess}</div>}

      {/* Users table */}
      <div style={cardStyle}>
        <DataTable data={users} columns={columns} isLoading={usersLoading} emptyMessage="No users found." />
      </div>

      {/* Assign panel */}
      {assigningUser && (
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>Assign User to Tenant</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
            Assigning: <strong>{assigningUser.email}</strong>
          </p>
          <form onSubmit={handleAssign((v) => assignMutation.mutate(v))} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Warehouse *</label>
              <select {...regAssign('warehouseId')} style={inputStyle}>
                <option value="">Select warehouse…</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              {assignErrors.warehouseId && <span style={errStyle}>{assignErrors.warehouseId.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Tenant *</label>
              <select {...regAssign('tenantId')} style={inputStyle} disabled={!selectedWarehouseId}>
                <option value="">Select tenant…</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {assignErrors.tenantId && <span style={errStyle}>{assignErrors.tenantId.message}</span>}
            </div>
            {assignMutation.error && <div style={{ gridColumn: '1 / -1', ...errStyle }}>{String(assignMutation.error)}</div>}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={() => setAssigningUser(null)} style={cancelBtnStyle}>Cancel</button>
              <button type="submit" disabled={assignMutation.isPending} style={primaryBtnStyle}>
                {assignMutation.isPending ? 'Assigning…' : 'Assign User'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24, marginBottom: 20 };
const cardTitleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 15, fontWeight: 600 };
const primaryBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const errStyle: React.CSSProperties = { fontSize: 11, color: '#dc2626' };
const successBanner: React.CSSProperties = { background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#15803d' };
