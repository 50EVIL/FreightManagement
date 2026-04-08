import { defineFunction } from '@aws-amplify/backend';

export const carrierInvoiceImportFn = defineFunction({
  name: 'carrierInvoiceImport',
  entry: './handler.ts',
  timeoutSeconds: 120,
  memoryMB: 512,
  resourceGroupName: 'data',
});
