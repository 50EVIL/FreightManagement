import { defineFunction } from '@aws-amplify/backend';

export const invoiceReconcileFn = defineFunction({
  name: 'invoiceReconcile',
  entry: './handler.ts',
  timeoutSeconds: 120,
  memoryMB: 256,
});
