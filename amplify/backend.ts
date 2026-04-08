import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { preTokenGeneration } from './functions/preTokenGeneration/resource';
import { rateCardImportFn } from './functions/rateCardImport/resource';
import { rateCardPublishFn } from './functions/rateCardPublish/resource';
import { connoteRaiseFn } from './functions/connoteRaise/resource';
import { manifestSendFn } from './functions/manifestSend/resource';
import { carrierInvoiceImportFn } from './functions/carrierInvoiceImport/resource';
import { invoiceReconcileFn } from './functions/invoiceReconcile/resource';
import { reportExportFn } from './functions/reportExport/resource';

/**
 * Freight Management — Amplify Gen 2 Backend
 *
 * Tenancy model:
 *   BrokerAccount → WarehouseCustomer → TenantAccount
 *
 * Cognito groups:
 *   Brokers          — top-level freight broker users
 *   WarehouseAdmins  — warehouse customer admins
 *   TenantUsers      — warehouse sub-tenant users (create connotes, manifests)
 *
 * JWT custom claims injected by preTokenGeneration Lambda:
 *   custom:brokerId, custom:warehouseId, custom:tenantId, custom:role
 */
export const backend = defineBackend({
  auth,
  data,
  storage,
  preTokenGeneration,
  rateCardImportFn,
  rateCardPublishFn,
  connoteRaiseFn,
  manifestSendFn,
  carrierInvoiceImportFn,
  invoiceReconcileFn,
  reportExportFn,
});

// ─── Grant Lambda functions access to DynamoDB tables ─────────────────────────

const {
  amplifyDynamoDbTables: tables,
} = backend.data.resources;

// rateCardImport needs: CarrierRateCard (write), RateCardEntry (write)
backend.rateCardImportFn.resources.lambda.addEnvironment(
  'RATE_CARD_TABLE', tables['CarrierRateCard'].tableName,
);
backend.rateCardImportFn.resources.lambda.addEnvironment(
  'RATE_CARD_ENTRY_TABLE', tables['RateCardEntry'].tableName,
);
tables['CarrierRateCard'].grantWriteData(backend.rateCardImportFn.resources.lambda);
tables['RateCardEntry'].grantWriteData(backend.rateCardImportFn.resources.lambda);

// rateCardPublish needs: RateCardEntry (read), PublishedRateCard (write), PublishedRateCardEntry (write)
backend.rateCardPublishFn.resources.lambda.addEnvironment(
  'RATE_CARD_ENTRY_TABLE', tables['RateCardEntry'].tableName,
);
backend.rateCardPublishFn.resources.lambda.addEnvironment(
  'PUBLISHED_RATE_CARD_TABLE', tables['PublishedRateCard'].tableName,
);
backend.rateCardPublishFn.resources.lambda.addEnvironment(
  'PUBLISHED_RATE_CARD_ENTRY_TABLE', tables['PublishedRateCardEntry'].tableName,
);
tables['RateCardEntry'].grantReadData(backend.rateCardPublishFn.resources.lambda);
tables['PublishedRateCard'].grantWriteData(backend.rateCardPublishFn.resources.lambda);
tables['PublishedRateCardEntry'].grantWriteData(backend.rateCardPublishFn.resources.lambda);

// connoteRaise needs: Connote (read/write), ConnoteLineItem (read)
backend.connoteRaiseFn.resources.lambda.addEnvironment(
  'CONNOTE_TABLE', tables['Connote'].tableName,
);
backend.connoteRaiseFn.resources.lambda.addEnvironment(
  'CONNOTE_LINE_ITEM_TABLE', tables['ConnoteLineItem'].tableName,
);
tables['Connote'].grantReadWriteData(backend.connoteRaiseFn.resources.lambda);
tables['ConnoteLineItem'].grantReadData(backend.connoteRaiseFn.resources.lambda);

// manifestSend needs: Manifest (read/write), Connote (read), ConnoteLineItem (read)
backend.manifestSendFn.resources.lambda.addEnvironment(
  'MANIFEST_TABLE', tables['Manifest'].tableName,
);
backend.manifestSendFn.resources.lambda.addEnvironment(
  'CONNOTE_TABLE', tables['Connote'].tableName,
);
backend.manifestSendFn.resources.lambda.addEnvironment(
  'CONNOTE_LINE_ITEM_TABLE', tables['ConnoteLineItem'].tableName,
);
tables['Manifest'].grantReadWriteData(backend.manifestSendFn.resources.lambda);
tables['Connote'].grantReadData(backend.manifestSendFn.resources.lambda);
tables['ConnoteLineItem'].grantReadData(backend.manifestSendFn.resources.lambda);

// carrierInvoiceImport needs: CarrierInvoice (write), CarrierInvoiceLine (write)
backend.carrierInvoiceImportFn.resources.lambda.addEnvironment(
  'CARRIER_INVOICE_TABLE', tables['CarrierInvoice'].tableName,
);
backend.carrierInvoiceImportFn.resources.lambda.addEnvironment(
  'CARRIER_INVOICE_LINE_TABLE', tables['CarrierInvoiceLine'].tableName,
);
tables['CarrierInvoice'].grantWriteData(backend.carrierInvoiceImportFn.resources.lambda);
tables['CarrierInvoiceLine'].grantWriteData(backend.carrierInvoiceImportFn.resources.lambda);

// invoiceReconcile needs: CarrierInvoice (write), CarrierInvoiceLine (read/write), Connote (read)
backend.invoiceReconcileFn.resources.lambda.addEnvironment(
  'CARRIER_INVOICE_TABLE', tables['CarrierInvoice'].tableName,
);
backend.invoiceReconcileFn.resources.lambda.addEnvironment(
  'CARRIER_INVOICE_LINE_TABLE', tables['CarrierInvoiceLine'].tableName,
);
backend.invoiceReconcileFn.resources.lambda.addEnvironment(
  'CONNOTE_TABLE', tables['Connote'].tableName,
);
tables['CarrierInvoice'].grantReadWriteData(backend.invoiceReconcileFn.resources.lambda);
tables['CarrierInvoiceLine'].grantReadWriteData(backend.invoiceReconcileFn.resources.lambda);
tables['Connote'].grantReadData(backend.invoiceReconcileFn.resources.lambda);

// reportExport needs: Connote (read)
backend.reportExportFn.resources.lambda.addEnvironment(
  'CONNOTE_TABLE', tables['Connote'].tableName,
);
tables['Connote'].grantReadData(backend.reportExportFn.resources.lambda);

// ─── Grant Lambda functions access to S3 storage ──────────────────────────────
const { buckets } = backend.storage.resources;
const mainBucket = buckets['freightStorage'];

backend.rateCardImportFn.resources.lambda.addEnvironment(
  'STORAGE_BUCKET_NAME', mainBucket.bucketName,
);
backend.carrierInvoiceImportFn.resources.lambda.addEnvironment(
  'STORAGE_BUCKET_NAME', mainBucket.bucketName,
);
backend.reportExportFn.resources.lambda.addEnvironment(
  'STORAGE_BUCKET_NAME', mainBucket.bucketName,
);
mainBucket.grantRead(backend.rateCardImportFn.resources.lambda);
mainBucket.grantRead(backend.carrierInvoiceImportFn.resources.lambda);
mainBucket.grantReadWrite(backend.reportExportFn.resources.lambda);
