import { defineFunction } from '@aws-amplify/backend';

export const manifestSendFn = defineFunction({
  name: 'manifestSend',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 256,
  resourceGroupName: 'data',
});
