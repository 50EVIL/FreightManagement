import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { rateCardImportFn } from '../functions/rateCardImport/resource.ts';
import { rateCardPublishFn } from '../functions/rateCardPublish/resource.ts';
import { connoteRaiseFn } from '../functions/connoteRaise/resource.ts';
import { manifestSendFn } from '../functions/manifestSend/resource.ts';
import { carrierInvoiceImportFn } from '../functions/carrierInvoiceImport/resource.ts';
import { invoiceReconcileFn } from '../functions/invoiceReconcile/resource.ts';
import { reportExportFn } from '../functions/reportExport/resource.ts';
import { assignUserTenantFn } from '../functions/assignUserTenant/resource.ts';

const schema = a.schema({
  // ─────────────────────────────────────────────────────────────────────────
  // TENANT HIERARCHY
  // ─────────────────────────────────────────────────────────────────────────

  BrokerAccount: a
    .model({
      name: a.string().required(),
      contactEmail: a.string().required(),
      plan: a.string(),
      status: a.enum(['active', 'suspended', 'trial']),
      abn: a.string(),
      phone: a.string(),
    })
    .authorization((allow) => [allow.groups(['Brokers'])]),

  WarehouseCustomer: a
    .model({
      brokerId: a.string().required(),
      name: a.string().required(),
      address: a.string(),
      suburb: a.string(),
      state: a.string(),
      postcode: a.string(),
      contactEmail: a.string(),
      contactPhone: a.string(),
      status: a.enum(['active', 'inactive']),
    })
    .authorization((allow) => [
      allow.groups(['Brokers']),
      allow.groups(['WarehouseAdmins']).to(['read', 'update']),
    ]),

  TenantAccount: a
    .model({
      warehouseId: a.string().required(),
      brokerId: a.string().required(),
      name: a.string().required(),
      contactEmail: a.string(),
      contactPhone: a.string(),
      status: a.enum(['active', 'inactive']),
      defaultCarrierId: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['Brokers']),
      allow.groups(['WarehouseAdmins']).to(['read', 'update']),
      allow.groups(['TenantUsers']).to(['read']),
    ]),

  // ─────────────────────────────────────────────────────────────────────────
  // CARRIERS
  // ─────────────────────────────────────────────────────────────────────────

  Carrier: a
    .model({
      code: a.string().required(),
      name: a.string().required(),
      logoUrl: a.string(),
      apiType: a.enum(['toll', 'startrack', 'couriersplease', 'tnt', 'sendle', 'manual']),
      isActive: a.boolean(),
      trackingUrlTemplate: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['Brokers']),
      allow.groups(['WarehouseAdmins']).to(['read']),
      allow.groups(['TenantUsers']).to(['read']),
    ]),

  // ─────────────────────────────────────────────────────────────────────────
  // RATE CARDS
  // ─────────────────────────────────────────────────────────────────────────

  CarrierRateCard: a
    .model({
      brokerId: a.string().required(),
      carrierId: a.string().required(),
      name: a.string().required(),
      effectiveDate: a.string(),
      expiryDate: a.string(),
      status: a.enum(['draft', 'active', 'archived']),
      sourceFileKey: a.string(),
      importedAt: a.string(),
      entryCount: a.integer(),
    })
    .authorization((allow) => [allow.groups(['Brokers'])]),

  RateCardEntry: a
    .model({
      rateCardId: a.string().required(),
      brokerId: a.string().required(),
      fromState: a.string(),
      toState: a.string(),
      fromPostcode: a.string(),
      toPostcode: a.string(),
      fromSuburb: a.string(),
      toSuburb: a.string(),
      serviceType: a.string(),
      weightBreakKg: a.float(),
      cubicBreakM3: a.float(),
      baseRate: a.float().required(),
      unit: a.enum(['per_kg', 'per_cubic', 'per_connote', 'flat']),
      dimFactor: a.float(),
    })
    .authorization((allow) => [allow.groups(['Brokers'])]),

  /**
   * A rate card that has been marked up and published to one or more
   * warehouse customers / tenants.
   */
  PublishedRateCard: a
    .model({
      brokerId: a.string().required(),
      warehouseId: a.string(),
      tenantId: a.string(),
      sourceRateCardId: a.string().required(),
      carrierId: a.string().required(),
      name: a.string().required(),
      markupType: a.enum(['percentage', 'per_route', 'fixed_margin']),
      globalMarginPct: a.float(),
      status: a.enum(['draft', 'active', 'expired', 'archived']),
      publishedAt: a.string(),
      effectiveDate: a.string(),
      expiryDate: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['Brokers']),
      allow.groups(['WarehouseAdmins']).to(['read']),
      allow.groups(['TenantUsers']).to(['read']),
    ]),

  PublishedRateCardEntry: a
    .model({
      publishedRateCardId: a.string().required(),
      tenantId: a.string().required(),
      fromState: a.string(),
      toState: a.string(),
      fromPostcode: a.string(),
      toPostcode: a.string(),
      serviceType: a.string(),
      weightBreakKg: a.float(),
      cubicBreakM3: a.float(),
      carrierRate: a.float().required(),
      markupAmount: a.float().required(),
      customerRate: a.float().required(),
      unit: a.enum(['per_kg', 'per_cubic', 'per_connote', 'flat']),
    })
    .authorization((allow) => [
      allow.groups(['Brokers']),
      allow.groups(['WarehouseAdmins']).to(['read']),
      allow.groups(['TenantUsers']).to(['read']),
    ]),

  /**
   * Highly-configurable additional charges: fuel surcharges, booking fees,
   * tail-lift fees, remote area, single connote minimums, DG surcharges etc.
   */
  AdditionalCharge: a
    .model({
      brokerId: a.string().required(),
      name: a.string().required(),
      description: a.string(),
      chargeType: a.enum([
        'flat',
        'percentage',
        'per_kg',
        'per_cubic',
        'per_connote',
        'single_connote_minimum',
        'fuel_surcharge_pct',
        'remote_area_flat',
        'tailLift_flat',
        'dangerous_goods_pct',
        'booking_fee_flat',
      ]),
      value: a.float().required(),
      applicableTo: a.enum(['all', 'specific_carrier', 'specific_service', 'specific_route']),
      carrierId: a.string(),
      serviceType: a.string(),
      fromState: a.string(),
      toState: a.string(),
      minThreshold: a.float(),
      maxThreshold: a.float(),
      isActive: a.boolean(),
      sortOrder: a.integer(),
    })
    .authorization((allow) => [allow.groups(['Brokers'])]),

  // ─────────────────────────────────────────────────────────────────────────
  // CONNOTES
  // ─────────────────────────────────────────────────────────────────────────

  Connote: a
    .model({
      tenantId: a.string().required(),
      warehouseId: a.string().required(),
      brokerId: a.string().required(),
      connoteNumber: a.string().required(),
      carrierConnoteNumber: a.string(),
      carrierId: a.string(),
      serviceType: a.string(),
      publishedRateCardId: a.string(),
      status: a.enum([
        'draft',
        'ready',
        'raised',
        'raise_failed',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'pod_received',
        'exception',
        'returned',
        'cancelled',
      ]),
      /** JSON array of {type: string, value: string} — unlimited references */
      referencesJson: a.string(),
      shipFromName: a.string(),
      shipFromAddress: a.string(),
      shipFromSuburb: a.string(),
      shipFromState: a.string(),
      shipFromPostcode: a.string(),
      shipToName: a.string(),
      shipToAddress: a.string().required(),
      shipToSuburb: a.string().required(),
      shipToState: a.string().required(),
      shipToPostcode: a.string().required(),
      shipToContactName: a.string(),
      shipToPhone: a.string(),
      totalWeightKg: a.float(),
      totalCubicM3: a.float(),
      estimatedCost: a.float(),
      actualCost: a.float(),
      specialInstructions: a.string(),
      tailLift: a.boolean(),
      dangerousGoods: a.boolean(),
      authority2Leave: a.boolean(),
      expectedDeliveryDate: a.string(),
      actualDeliveryDate: a.string(),
      manifestId: a.string(),
      podS3Key: a.string(),
      labelS3Key: a.string(),
      carrierRaisedAt: a.string(),
      lastTrackedAt: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['Brokers']),
      allow.groups(['WarehouseAdmins']).to(['read']),
      allow.groups(['TenantUsers']),
    ]),

  ConnoteLineItem: a
    .model({
      connoteId: a.string().required(),
      tenantId: a.string().required(),
      description: a.string(),
      quantity: a.integer().required(),
      lengthCm: a.float(),
      widthCm: a.float(),
      heightCm: a.float(),
      weightKg: a.float().required(),
      /** Computed: (L × W × H) / 1,000,000 × quantity */
      cubicM3: a.float(),
      itemType: a.string(),
      dangerousGoodsClass: a.string(),
      packagingType: a.enum(['carton', 'pallet', 'crate', 'drum', 'roll', 'bag', 'other']),
    })
    .authorization((allow) => [
      allow.groups(['Brokers']),
      allow.groups(['TenantUsers']),
    ]),

  ConnoteCharge: a
    .model({
      connoteId: a.string().required(),
      tenantId: a.string().required(),
      chargeType: a.string().required(),
      description: a.string().required(),
      amount: a.float().required(),
      basis: a.enum(['carrier', 'customer']),
      isReconciled: a.boolean(),
    })
    .authorization((allow) => [
      allow.groups(['Brokers']),
      allow.groups(['TenantUsers']).to(['read']),
    ]),

  // ─────────────────────────────────────────────────────────────────────────
  // MANIFESTS
  // ─────────────────────────────────────────────────────────────────────────

  Manifest: a
    .model({
      tenantId: a.string().required(),
      warehouseId: a.string().required(),
      brokerId: a.string().required(),
      manifestNumber: a.string().required(),
      carrierId: a.string().required(),
      serviceType: a.string(),
      status: a.enum(['draft', 'sent', 'acknowledged', 'closed', 'cancelled']),
      totalWeightKg: a.float(),
      totalCubicM3: a.float(),
      connoteCount: a.integer(),
      dispatchDate: a.string().required(),
      carrierManifestRef: a.string(),
      sentToCarrierAt: a.string(),
      notes: a.string(),
    })
    .authorization((allow) => [
      allow.groups(['Brokers']),
      allow.groups(['TenantUsers']),
    ]),

  // ─────────────────────────────────────────────────────────────────────────
  // TRACKING EVENTS
  // ─────────────────────────────────────────────────────────────────────────

  ShipmentEvent: a
    .model({
      connoteId: a.string().required(),
      tenantId: a.string().required(),
      carrierId: a.string(),
      eventType: a.enum([
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'attempted_delivery',
        'exception',
        'returned',
        'pod_captured',
        'status_update',
      ]),
      eventCode: a.string(),
      description: a.string(),
      location: a.string(),
      /** ISO 8601 timestamp from the carrier */
      timestamp: a.string().required(),
      rawPayload: a.string(),
      source: a.enum(['api_poll', 'webhook', 'manual']),
    })
    .authorization((allow) => [
      allow.groups(['Brokers']),
      allow.groups(['WarehouseAdmins']).to(['read']),
      allow.groups(['TenantUsers']).to(['read']),
    ]),

  // ─────────────────────────────────────────────────────────────────────────
  // CARRIER INVOICE RECONCILIATION
  // ─────────────────────────────────────────────────────────────────────────

  CarrierInvoice: a
    .model({
      brokerId: a.string().required(),
      carrierId: a.string().required(),
      invoiceNumber: a.string().required(),
      invoiceDate: a.string().required(),
      dueDate: a.string(),
      totalAmount: a.float().required(),
      currency: a.string(),
      status: a.enum(['imported', 'matching', 'reconciled', 'disputed', 'paid']),
      sourceFileKey: a.string(),
      importedAt: a.string(),
      lineCount: a.integer(),
      matchedCount: a.integer(),
      varianceCount: a.integer(),
      totalVarianceAmount: a.float(),
    })
    .authorization((allow) => [allow.groups(['Brokers'])]),

  CarrierInvoiceLine: a
    .model({
      invoiceId: a.string().required(),
      brokerId: a.string().required(),
      carrierId: a.string(),
      carrierConnoteNumber: a.string(),
      serviceDate: a.string(),
      chargeDescription: a.string(),
      amount: a.float().required(),
      matchedConnoteId: a.string(),
      matchStatus: a.enum(['unmatched', 'matched', 'variance', 'disputed', 'accepted']),
      varianceAmount: a.float(),
      varianceReason: a.string(),
      disputeNotes: a.string(),
    })
    .authorization((allow) => [allow.groups(['Brokers'])]),

  Dispute: a
    .model({
      brokerId: a.string().required(),
      invoiceLineId: a.string().required(),
      connoteId: a.string(),
      carrierId: a.string().required(),
      disputeType: a.enum(['overcharge', 'undercharge', 'not_found', 'duplicate']),
      claimedAmount: a.float().required(),
      invoicedAmount: a.float().required(),
      varianceAmount: a.float().required(),
      status: a.enum(['open', 'submitted', 'resolved', 'closed', 'withdrawn']),
      notes: a.string(),
      resolution: a.string(),
      resolvedAt: a.string(),
    })
    .authorization((allow) => [allow.groups(['Brokers'])]),

  // ─────────────────────────────────────────────────────────────────────────
  // CUSTOM LAMBDA-BACKED MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────

  importRateCard: a
    .mutation()
    .arguments({
      brokerId: a.string().required(),
      s3Key: a.string().required(),
      carrierId: a.string().required(),
      name: a.string().required(),
      effectiveDate: a.string(),
    })
    .returns(a.json())
    .handler(a.handler.function(rateCardImportFn))
    .authorization((allow) => [allow.groups(['Brokers'])]),

  publishRateCard: a
    .mutation()
    .arguments({
      rateCardId: a.string().required(),
      tenantIds: a.string().array(),
      warehouseIds: a.string().array(),
      markupType: a.string().required(),
      globalMarginPct: a.float(),
      routeOverridesJson: a.string(),
      effectiveDate: a.string(),
      expiryDate: a.string(),
    })
    .returns(a.json())
    .handler(a.handler.function(rateCardPublishFn))
    .authorization((allow) => [allow.groups(['Brokers'])]),

  raiseConnote: a
    .mutation()
    .arguments({
      connoteId: a.string().required(),
    })
    .returns(a.json())
    .handler(a.handler.function(connoteRaiseFn))
    .authorization((allow) => [allow.groups(['Brokers', 'TenantUsers'])]),

  sendManifest: a
    .mutation()
    .arguments({
      manifestId: a.string().required(),
    })
    .returns(a.json())
    .handler(a.handler.function(manifestSendFn))
    .authorization((allow) => [allow.groups(['Brokers', 'TenantUsers'])]),

  importCarrierInvoice: a
    .mutation()
    .arguments({
      brokerId: a.string().required(),
      s3Key: a.string().required(),
      carrierId: a.string().required(),
      invoiceNumber: a.string().required(),
      invoiceDate: a.string().required(),
    })
    .returns(a.json())
    .handler(a.handler.function(carrierInvoiceImportFn))
    .authorization((allow) => [allow.groups(['Brokers'])]),

  reconcileInvoice: a
    .mutation()
    .arguments({
      invoiceId: a.string().required(),
    })
    .returns(a.json())
    .handler(a.handler.function(invoiceReconcileFn))
    .authorization((allow) => [allow.groups(['Brokers'])]),

  exportReport: a
    .mutation()
    .arguments({
      tenantId: a.string().required(),
      reportType: a.enum([
        'connote_summary',
        'overdue_connotes',
        'carrier_performance',
        'invoice_reconciliation',
        'connote_cost',
      ]),
      filters: a.json(),
      format: a.enum(['csv', 'pdf']),
    })
    .returns(a.json())
    .handler(a.handler.function(reportExportFn))
    .authorization((allow) => [
      allow.groups(['Brokers', 'WarehouseAdmins', 'TenantUsers']),
    ]),

  assignUserTenant: a
    .mutation()
    .arguments({
      email: a.string().required(),
      tenantId: a.string().required(),
      warehouseId: a.string().required(),
      brokerId: a.string().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      username: a.string().required(),
    }))
    .handler(a.handler.function(assignUserTenantFn))
    .authorization((allow) => [allow.groups(['Brokers'])]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
