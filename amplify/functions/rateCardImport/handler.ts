import type { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const RATE_CARD_TABLE = process.env.RATE_CARD_TABLE!;
const RATE_CARD_ENTRY_TABLE = process.env.RATE_CARD_ENTRY_TABLE!;
const BUCKET = process.env.STORAGE_BUCKET_NAME!;

interface ImportRateCardArgs {
  brokerId: string;
  s3Key: string;
  carrierId: string;
  name: string;
  effectiveDate?: string;
}

export const handler: AppSyncResolverHandler<ImportRateCardArgs, unknown> = async (event) => {
  const { brokerId, s3Key, carrierId, name, effectiveDate } = event.arguments;

  // Fetch file from S3
  const s3Res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
  const body = await s3Res.Body?.transformToString();
  if (!body) throw new Error('Empty file');

  // Parse CSV (simple split — production would use papaparse Lambda layer)
  const lines = body.split('\n').filter(Boolean);
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const entries = lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
    return row;
  });

  // Write RateCardEntry records in batches of 25
  const rateCardId = randomUUID();
  const putRequests = entries.map((row) => ({
    PutRequest: {
      Item: {
        id: randomUUID(),
        rateCardId,
        brokerId,
        fromState: row['from_state'] ?? row['fromstate'] ?? '',
        toState: row['to_state'] ?? row['tostate'] ?? '',
        fromPostcode: row['from_postcode'] ?? row['frompostcode'] ?? '',
        toPostcode: row['to_postcode'] ?? row['topostcode'] ?? '',
        serviceType: row['service_type'] ?? row['servicetype'] ?? 'STANDARD',
        weightBreakKg: parseFloat(row['weight_break_kg'] ?? row['weightbreakkg'] ?? '0') || null,
        cubicBreakM3: parseFloat(row['cubic_break_m3'] ?? row['cubicbreakm3'] ?? '0') || null,
        baseRate: parseFloat(row['base_rate'] ?? row['baserate'] ?? '0'),
        unit: row['unit'] ?? 'per_kg',
        dimFactor: parseFloat(row['dim_factor'] ?? '250') || 250,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  }));

  for (let i = 0; i < putRequests.length; i += 25) {
    await dynamo.send(new BatchWriteCommand({
      RequestItems: { [RATE_CARD_ENTRY_TABLE]: putRequests.slice(i, i + 25) },
    }));
  }

  // Create the CarrierRateCard record
  await dynamo.send(new UpdateCommand({
    TableName: RATE_CARD_TABLE,
    Key: { id: rateCardId },
    UpdateExpression: 'SET brokerId = :bid, carrierId = :cid, #n = :n, effectiveDate = :ed, ' +
      '#s = :s, sourceFileKey = :sfk, importedAt = :ia, entryCount = :ec, ' +
      'createdAt = :ca, updatedAt = :ua',
    ExpressionAttributeNames: { '#n': 'name', '#s': 'status' },
    ExpressionAttributeValues: {
      ':bid': brokerId,
      ':cid': carrierId,
      ':n': name,
      ':ed': effectiveDate ?? new Date().toISOString().split('T')[0],
      ':s': 'active',
      ':sfk': s3Key,
      ':ia': new Date().toISOString(),
      ':ec': entries.length,
      ':ca': new Date().toISOString(),
      ':ua': new Date().toISOString(),
    },
  }));

  return { success: true, rateCardId, entryCount: entries.length };
};
