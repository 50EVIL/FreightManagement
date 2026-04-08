export const CARRIER_LABELS: Record<string, string> = {
  TOLL: 'Toll',
  STARTRACK: 'StarTrack',
  CP: 'Couriers Please',
  TNT: 'TNT',
  SENDLE: 'Sendle',
  MOCK: 'Mock Carrier',
};

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  ROAD_EXPRESS: 'Road Express',
  OVERNIGHT: 'Overnight',
  SAMEDAY: 'Same Day',
  ECONOMY: 'Economy',
  STANDARD: 'Standard',
};

export function getCarrierLabel(carrierId: string): string {
  return CARRIER_LABELS[carrierId.toUpperCase()] ?? carrierId;
}

export function getServiceLabel(serviceType: string): string {
  return SERVICE_TYPE_LABELS[serviceType.toUpperCase()] ?? serviceType;
}
