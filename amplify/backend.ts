import { defineBackend } from '@aws-amplify/backend';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cast IFunction → Function so we can call addEnvironment */
function fn(resource: { resources: { lambda: { node: unknown } } }): LambdaFunction {
  return resource.resources.lambda as unknown as LambdaFunction;
}

// ─── DynamoDB table references ────────────────────────────────────────────────

const tables = backend.data.resources.tables;

// ─── rateCardImport: CarrierRateCard (write), RateCardEntry (write) ───────────

fn(backend.rateCardImportFn).addEnvironment('RATE_CARD_TABLE',       tables['CarrierRateCard'].tableName);
fn(backend.rateCardImportFn).addEnvironment('RATE_CARD_ENTRY_TABLE',  tables['RateCardEntry'].tableName);
tables['CarrierRateCard'].grantWriteData(backend.rateCardImportFn.resources.lambda);
tables['RateCardEntry'].grantWriteData(backend.rateCardImportFn.resources.lambda);

// ─── rateCardPublish: RateCardEntry (read), PublishedRateCard/Entry (write) ───

fn(backend.rateCardPublishFn).addEnvironment('RATE_CARD_ENTRY_TABLE',          tables['RateCardEntry'].tableName);
fn(backend.rateCardPublishFn).addEnvironment('PUBLISHED_RATE_CARD_TABLE',       tables['PublishedRateCard'].tableName);
fn(backend.rateCardPublishFn).addEnvironment('PUBLISHED_RATE_CARD_ENTRY_TABLE', tables['PublishedRateCardEntry'].tableName);
tables['RateCardEntry'].grantReadData(backend.rateCardPublishFn.resources.lambda);
tables['PublishedRateCard'].grantWriteData(backend.rateCardPublishFn.resources.lambda);
tables['PublishedRateCardEntry'].grantWriteData(backend.rateCardPublishFn.resources.lambda);

// ─── connoteRaise: Connote (read/write), ConnoteLineItem (read) ───────────────

fn(backend.connoteRaiseFn).addEnvironment('CONNOTE_TABLE',          tables['Connote'].tableName);
fn(backend.connoteRaiseFn).addEnvironment('CONNOTE_LINE_ITEM_TABLE', tables['ConnoteLineItem'].tableName);
tables['Connote'].grantReadWriteData(backend.connoteRaiseFn.resources.lambda);
tables['ConnoteLineItem'].grantReadData(backend.connoteRaiseFn.resources.lambda);

// ─── manifestSend: Manifest (read/write), Connote (read), ConnoteLineItem (read)

fn(backend.manifestSendFn).addEnvironment('MANIFEST_TABLE',         tables['Manifest'].tableName);
fn(backend.manifestSendFn).addEnvironment('CONNOTE_TABLE',           tables['Connote'].tableName);
fn(backend.manifestSendFn).addEnvironment('CONNOTE_LINE_ITEM_TABLE', tables['ConnoteLineItem'].tableName);
tables['Manifest'].grantReadWriteData(backend.manifestSendFn.resources.lambda);
tables['Connote'].grantReadData(backend.manifestSendFn.resources.lambda);
tables['ConnoteLineItem'].grantReadData(backend.manifestSendFn.resources.lambda);

// ─── carrierInvoiceImport: CarrierInvoice (write), CarrierInvoiceLine (write) ─

fn(backend.carrierInvoiceImportFn).addEnvironment('CARRIER_INVOICE_TABLE',      tables['CarrierInvoice'].tableName);
fn(backend.carrierInvoiceImportFn).addEnvironment('CARRIER_INVOICE_LINE_TABLE',  tables['CarrierInvoiceLine'].tableName);
tables['CarrierInvoice'].grantWriteData(backend.carrierInvoiceImportFn.resources.lambda);
tables['CarrierInvoiceLine'].grantWriteData(backend.carrierInvoiceImportFn.resources.lambda);

// ─── invoiceReconcile: CarrierInvoice (write), CarrierInvoiceLine (rw), Connote (read)

fn(backend.invoiceReconcileFn).addEnvironment('CARRIER_INVOICE_TABLE',     tables['CarrierInvoice'].tableName);
fn(backend.invoiceReconcileFn).addEnvironment('CARRIER_INVOICE_LINE_TABLE', tables['CarrierInvoiceLine'].tableName);
fn(backend.invoiceReconcileFn).addEnvironment('CONNOTE_TABLE',              tables['Connote'].tableName);
tables['CarrierInvoice'].grantReadWriteData(backend.invoiceReconcileFn.resources.lambda);
tables['CarrierInvoiceLine'].grantReadWriteData(backend.invoiceReconcileFn.resources.lambda);
tables['Connote'].grantReadData(backend.invoiceReconcileFn.resources.lambda);

// ─── reportExport: Connote (read) ─────────────────────────────────────────────

fn(backend.reportExportFn).addEnvironment('CONNOTE_TABLE', tables['Connote'].tableName);
tables['Connote'].grantReadData(backend.reportExportFn.resources.lambda);

// ─── S3 storage grants ─────────────────────────────────────────────────────────

const bucket = backend.storage.resources.bucket;

fn(backend.rateCardImportFn).addEnvironment('STORAGE_BUCKET_NAME',       bucket.bucketName);
fn(backend.carrierInvoiceImportFn).addEnvironment('STORAGE_BUCKET_NAME', bucket.bucketName);
fn(backend.reportExportFn).addEnvironment('STORAGE_BUCKET_NAME',         bucket.bucketName);
bucket.grantRead(backend.rateCardImportFn.resources.lambda);
bucket.grantRead(backend.carrierInvoiceImportFn.resources.lambda);
bucket.grantReadWrite(backend.reportExportFn.resources.lambda);
