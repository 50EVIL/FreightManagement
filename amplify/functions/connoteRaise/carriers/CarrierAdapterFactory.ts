import type { ICarrierAdapter } from './ICarrierAdapter';
import { MockAdapter } from './mock/MockAdapter';

/**
 * Registry of carrier adapters.
 * Add real carrier adapters here as they are implemented.
 * Each entry is a factory function to allow fresh instances per invocation.
 */
const REGISTRY: Record<string, () => ICarrierAdapter> = {
  MOCK: () => new MockAdapter(),
  // TOLL: () => new TollAdapter(),
  // STARTRACK: () => new StarTrackAdapter(),
  // CP: () => new CPAdapter(),
  // TNT: () => new TNTAdapter(),
  // SENDLE: () => new SendleAdapter(),
};

export function getCarrierAdapter(carrierId: string): ICarrierAdapter {
  const factory = REGISTRY[carrierId.toUpperCase()];
  if (!factory) {
    // In sandbox/dev, fall back to mock
    if (process.env.AMPLIFY_BRANCH === 'sandbox' || !process.env.AMPLIFY_BRANCH) {
      return new MockAdapter();
    }
    throw new Error(`No carrier adapter registered for: ${carrierId}`);
  }
  return factory();
}
