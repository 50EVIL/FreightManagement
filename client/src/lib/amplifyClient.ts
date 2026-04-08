import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

/**
 * Type-safe Amplify Data client.
 * Import this everywhere instead of calling generateClient() directly
 * so we stay on a single instance.
 */
export const client = generateClient<Schema>();
