import { defineFunction } from '@aws-amplify/backend';

export const reportExportFn = defineFunction({
  name: 'reportExport',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 512,
});
