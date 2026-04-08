export interface AddressBlock {
  name: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  contactName?: string;
  phone?: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  cubicM3?: number;
  packagingType?: string;
  dangerousGoodsClass?: string;
}

export interface ConnoteRequest {
  connoteId: string;
  internalConnoteNumber: string;
  tenantId: string;
  serviceType: string;
  from: AddressBlock;
  to: AddressBlock;
  lineItems: LineItem[];
  specialInstructions?: string;
  tailLift: boolean;
  dangerousGoods: boolean;
  authority2Leave: boolean;
  references: { type: string; value: string }[];
  dispatchDate?: string;
}

export interface ConnoteResponse {
  success: boolean;
  carrierConnoteNumber?: string;
  labelS3Key?: string;
  estimatedDeliveryDate?: string;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

export interface ManifestRequest {
  manifestId: string;
  internalManifestNumber: string;
  carrierId: string;
  dispatchDate: string;
  connotes: ConnoteRequest[];
}

export interface ManifestResponse {
  success: boolean;
  carrierManifestRef?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface TrackingRequest {
  items: { connoteId: string; carrierConnoteNumber: string }[];
}

export interface TrackingEvent {
  connoteId: string;
  carrierConnoteNumber: string;
  eventCode: string;
  eventType: string;
  description: string;
  location?: string;
  timestamp: string;
}

export interface TrackingResponse {
  events: TrackingEvent[];
  errors: { connoteId: string; error: string }[];
}

export interface PODRequest {
  connoteId: string;
  carrierConnoteNumber: string;
}

export interface PODResponse {
  success: boolean;
  podS3Key?: string;
  capturedAt?: string;
  errorMessage?: string;
}

export interface ICarrierAdapter {
  readonly carrierId: string;
  readonly carrierName: string;
  raiseConnote(req: ConnoteRequest): Promise<ConnoteResponse>;
  sendManifest(req: ManifestRequest): Promise<ManifestResponse>;
  getTrackingUpdates(req: TrackingRequest): Promise<TrackingResponse>;
  retrievePOD(req: PODRequest): Promise<PODResponse>;
}
