import { defineFunction } from '@aws-amplify/backend';

export const rateCardPublishFn = defineFunction({
  name: 'rateCardPublish',
  entry: './handler.ts',
  timeoutSeconds: 120,
  memoryMB: 512,
});
