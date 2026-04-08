import { defineFunction } from '@aws-amplify/backend';

export const rateCardImportFn = defineFunction({
  name: 'rateCardImport',
  entry: './handler.ts',
  timeoutSeconds: 120,
  memoryMB: 512,
  resourceGroupName: 'data',
});
