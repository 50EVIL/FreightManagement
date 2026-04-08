import { defineFunction } from '@aws-amplify/backend';

export const inviteUserFn = defineFunction({
  name: 'inviteUser',
  entry: './handler.ts',
  resourceGroupName: 'data',
  environment: {
    USER_POOL_ID: '',   // injected in backend.ts
  },
});
