import type {
  ICarrierAdapter,
  ConnoteRequest,
  ConnoteResponse,
  ManifestRequest,
  ManifestResponse,
  TrackingRequest,
  TrackingResponse,
  PODRequest,
  PODResponse,
} from '../ICarrierAdapter';

/**
 * Mock carrier adapter for development and testing.
 * Returns plausible responses without making real API calls.
 */
export class MockAdapter implements ICarrierAdapter {
  readonly carrierId = 'MOCK';
  readonly carrierName = 'Mock Carrier';

  async raiseConnote(req: ConnoteRequest): Promise<ConnoteResponse> {
    // Simulate carrier assigning a connote number
    const carrierConnoteNumber = `MOCK${Date.now()}`;
    const today = new Date();
    today.setDate(today.getDate() + 3);
    return {
      success: true,
      carrierConnoteNumber,
      estimatedDeliveryDate: today.toISOString().split('T')[0],
      rawResponse: { mockRequest: req.connoteId },
    };
  }

  async sendManifest(req: ManifestRequest): Promise<ManifestResponse> {
    return {
      success: true,
      carrierManifestRef: `MMAN${Date.now()}`,
    };
  }

  async getTrackingUpdates(req: TrackingRequest): Promise<TrackingResponse> {
    const events = req.items.map((item) => ({
      connoteId: item.connoteId,
      carrierConnoteNumber: item.carrierConnoteNumber,
      eventCode: 'IN_TRANSIT',
      eventType: 'in_transit' as const,
      description: 'Shipment in transit (mock)',
      location: 'Sydney NSW',
      timestamp: new Date().toISOString(),
    }));
    return { events, errors: [] };
  }

  async retrievePOD(req: PODRequest): Promise<PODResponse> {
    return {
      success: true,
      podS3Key: `pod-documents/mock/${req.connoteId}.pdf`,
      capturedAt: new Date().toISOString(),
    };
  }
}
