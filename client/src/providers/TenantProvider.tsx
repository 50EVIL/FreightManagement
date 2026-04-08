import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export type UserRole = 'Brokers' | 'WarehouseAdmins' | 'TenantUsers' | null;

export interface TenantContext {
  brokerId: string | null;
  warehouseId: string | null;
  tenantId: string | null;
  role: UserRole;
  isLoading: boolean;
  isBroker: boolean;
  isWarehouseAdmin: boolean;
  isTenantUser: boolean;
}

const TenantCtx = createContext<TenantContext>({
  brokerId: null,
  warehouseId: null,
  tenantId: null,
  role: null,
  isLoading: true,
  isBroker: false,
  isWarehouseAdmin: false,
  isTenantUser: false,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<TenantContext>({
    brokerId: null,
    warehouseId: null,
    tenantId: null,
    role: null,
    isLoading: true,
    isBroker: false,
    isWarehouseAdmin: false,
    isTenantUser: false,
  });

  useEffect(() => {
    fetchAuthSession()
      .then(({ tokens }) => {
        const claims = tokens?.idToken?.payload ?? {};
        const groups: string[] = (claims['cognito:groups'] as string[]) ?? [];

        const role: UserRole = groups.includes('Brokers')
          ? 'Brokers'
          : groups.includes('WarehouseAdmins')
            ? 'WarehouseAdmins'
            : groups.includes('TenantUsers')
              ? 'TenantUsers'
              : null;

        setCtx({
          brokerId: (claims['custom:brokerId'] as string) || null,
          warehouseId: (claims['custom:warehouseId'] as string) || null,
          tenantId: (claims['custom:tenantId'] as string) || null,
          role,
          isLoading: false,
          isBroker: groups.includes('Brokers'),
          isWarehouseAdmin: groups.includes('WarehouseAdmins'),
          isTenantUser: groups.includes('TenantUsers'),
        });
      })
      .catch(() => {
        setCtx((prev) => ({ ...prev, isLoading: false }));
      });
  }, []);

  return <TenantCtx.Provider value={ctx}>{children}</TenantCtx.Provider>;
}

export function useTenant(): TenantContext {
  return useContext(TenantCtx);
}
