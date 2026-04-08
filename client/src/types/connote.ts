export interface ConnoteReference {
  type: string;
  value: string;
}

export const REFERENCE_TYPES = [
  { value: 'order_number', label: 'Order Number' },
  { value: 'po_number', label: 'PO Number' },
  { value: 'invoice_number', label: 'Invoice Number' },
  { value: 'customer_ref', label: 'Customer Reference' },
  { value: 'sku', label: 'SKU' },
  { value: 'other', label: 'Other' },
] as const;

export type ConnoteStatus =
  | 'draft'
  | 'ready'
  | 'raised'
  | 'raise_failed'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'pod_received'
  | 'exception'
  | 'returned'
  | 'cancelled';

export const STATUS_LABELS: Record<ConnoteStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  raised: 'Raised',
  raise_failed: 'Raise Failed',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  pod_received: 'POD Received',
  exception: 'Exception',
  returned: 'Returned',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<ConnoteStatus, string> = {
  draft: '#6b7280',
  ready: '#2563eb',
  raised: '#7c3aed',
  raise_failed: '#dc2626',
  in_transit: '#d97706',
  out_for_delivery: '#0891b2',
  delivered: '#16a34a',
  pod_received: '#15803d',
  exception: '#dc2626',
  returned: '#9333ea',
  cancelled: '#6b7280',
};
