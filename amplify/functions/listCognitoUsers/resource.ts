import { defineFunction } from '@aws-amplify/backend';

export const listCognitoUsersFn = defineFunction({
  name: 'listCognitoUsers',
  entry: './handler.ts',
  resourceGroupName: 'data',
  environment: {
    USER_POOL_ID: '',   // injected in backend.ts
  },
});
