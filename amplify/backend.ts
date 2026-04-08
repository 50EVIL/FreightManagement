import { defineBackend } from '@aws-amplify/backend';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { aws_iam as iam } from 'aws-cdk-lib';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { auth } from './auth/resource.ts';
import { data } from './data/resource.ts';
import { storage } from './storage/resource.ts';
import { preTokenGeneration } from './functions/preTokenGeneration/resource.ts';
import { postConfirmation } from './functions/postConfirmation/resource.ts';
import { assignUserTenantFn } from './functions/assignUserTenant/resource.ts';
import { rateCardImportFn } from './functions/rateCardImport/resource.ts';
import { rateCardPublishFn } from './functions/rateCardPublish/resource.ts';
import { connoteRaiseFn } from './functions/connoteRaise/resource.ts';
import { manifestSendFn } from './functions/manifestSend/resource.ts';
import { carrierInvoiceImportFn } from './functions/carrierInvoiceImport/resource.ts';
import { invoiceReconcileFn } from './functions/invoiceReconcile/resource.ts';
import { reportExportFn } from './functions/reportExport/resource.ts';

export const backend = defineBackend({
  auth,
  data,
  storage,
  preTokenGeneration,
  postConfirmation,
  assignUserTenantFn,
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

// ─── postConfirmation: grant AdminAddUserToGroup on the user pool ─────────────

backend.postConfirmation.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['cognito-idp:AdminAddUserToGroup'],
    // Use '*' here — referencing userPoolArn directly creates a CDK circular
    // dependency since postConfirmation lives inside the auth stack alongside
    // the UserPool that also references this Lambda as a trigger.
    resources: ['*'],
  }),
);

// ─── assignUserTenant: ListUsers + AdminUpdateUserAttributes ──────────────────

fn(backend.assignUserTenantFn).addEnvironment('USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
backend.assignUserTenantFn.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminUpdateUserAttributes'],
    resources: [backend.auth.resources.userPool.userPoolArn],
  }),
);

// ─── Default admin (Broker) seed user ────────────────────────────────────────
// Created once on first deploy via a CloudFormation custom resource.
// Email: admin@freightviz.com  |  Temp password: FreightViz@Admin1!
// Change the password on first sign-in. UsernameExistsException is ignored
// on subsequent deploys so re-running deploy is safe.

const adminStack = backend.createStack('defaultAdmin');
const ADMIN_EMAIL = 'admin@freightviz.com';

const createAdminUser = new AwsCustomResource(adminStack, 'CreateAdminUser', {
  resourceType: 'Custom::CognitoAdminUser',
  onCreate: {
    service: 'CognitoIdentityServiceProvider',
    action: 'adminCreateUser',
    parameters: {
      UserPoolId: backend.auth.resources.userPool.userPoolId,
      Username: ADMIN_EMAIL,
      TemporaryPassword: 'FreightViz@Admin1!',
      UserAttributes: [
        { Name: 'email', Value: ADMIN_EMAIL },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:brokerId', Value: 'default' },
        { Name: 'custom:role', Value: 'Brokers' },
      ],
      MessageAction: 'SUPPRESS',
    },
    physicalResourceId: PhysicalResourceId.of(`admin-user-${ADMIN_EMAIL}`),
    ignoreErrorCodesMatching: 'UsernameExistsException',
  },
  policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: ['*'] }),
});

new AwsCustomResource(adminStack, 'AddAdminToGroup', {
  resourceType: 'Custom::CognitoAdminGroup',
  onCreate: {
    service: 'CognitoIdentityServiceProvider',
    action: 'adminAddUserToGroup',
    parameters: {
      UserPoolId: backend.auth.resources.userPool.userPoolId,
      Username: ADMIN_EMAIL,
      GroupName: 'Brokers',
    },
    physicalResourceId: PhysicalResourceId.of(`admin-group-${ADMIN_EMAIL}`),
    ignoreErrorCodesMatching: 'UserNotFoundException',
  },
  policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: ['*'] }),
}).node.addDependency(createAdminUser);
