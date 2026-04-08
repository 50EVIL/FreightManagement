import { defineFunction } from '@aws-amplify/backend';

export const assignUserTenantFn = defineFunction({
  name: 'assignUserTenant',
  entry: './handler.ts',
  resourceGroupName: 'data',
  environment: {
    USER_POOL_ID: '',   // injected in backend.ts
  },
});
