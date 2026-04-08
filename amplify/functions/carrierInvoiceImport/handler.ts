import type { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const INVOICE_TABLE = process.env.CARRIER_INVOICE_TABLE!;
const INVOICE_LINE_TABLE = process.env.CARRIER_INVOICE_LINE_TABLE!;
const BUCKET = process.env.STORAGE_BUCKET_NAME!;

interface ImportArgs {
  brokerId: string;
  s3Key: string;
  carrierId: string;
  invoiceNumber: string;
  invoiceDate: string;
}

export const handler: AppSyncResolverHandler<ImportArgs, unknown> = async (event) => {
  const { brokerId, s3Key, carrierId, invoiceNumber, invoiceDate } = event.arguments;

  const s3Res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
  const body = await s3Res.Body?.transformToString();
  if (!body) throw new Error('Empty file');

  const lines = body.split('\n').filter(Boolean);
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
    return row;
  });

  const invoiceId = randomUUID();
  const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r['amount'] ?? r['charge'] ?? '0') || 0), 0);

  await dynamo.send(new PutCommand({
    TableName: INVOICE_TABLE,
    Item: {
      id: invoiceId,
      brokerId,
      carrierId,
      invoiceNumber,
      invoiceDate,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      currency: 'AUD',
      status: 'matching',
      sourceFileKey: s3Key,
      importedAt: new Date().toISOString(),
      lineCount: rows.length,
      matchedCount: 0,
      varianceCount: 0,
      totalVarianceAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }));

  const putRequests = rows.map((row) => ({
    PutRequest: {
      Item: {
        id: randomUUID(),
        invoiceId,
        brokerId,
        carrierId,
        carrierConnoteNumber: row['connote_number'] ?? row['connote'] ?? row['consignment'] ?? '',
        serviceDate: row['service_date'] ?? row['date'] ?? invoiceDate,
        chargeDescription: row['description'] ?? row['charge_description'] ?? '',
        amount: parseFloat(row['amount'] ?? row['charge'] ?? '0') || 0,
        matchStatus: 'unmatched',
        matchedConnoteId: null,
        varianceAmount: null,
        varianceReason: null,
        disputeNotes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  }));

  for (let i = 0; i < putRequests.length; i += 25) {
    await dynamo.send(new BatchWriteCommand({
      RequestItems: { [INVOICE_LINE_TABLE]: putRequests.slice(i, i + 25) },
    }));
  }

  return { success: true, invoiceId, lineCount: rows.length };
};
