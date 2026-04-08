import { defineFunction } from '@aws-amplify/backend';

export const preTokenGeneration = defineFunction({
  name: 'preTokenGeneration',
  entry: './handler.ts',
});
