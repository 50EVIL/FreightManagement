import { defineFunction } from '@aws-amplify/backend';

export const connoteRaiseFn = defineFunction({
  name: 'connoteRaise',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 256,
  resourceGroupName: 'data',
});
