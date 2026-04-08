import type { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const CONNOTE_TABLE = process.env.CONNOTE_TABLE!;
const BUCKET = process.env.STORAGE_BUCKET_NAME!;

type ReportType =
  | 'connote_summary'
  | 'overdue_connotes'
  | 'carrier_performance'
  | 'invoice_reconciliation'
  | 'connote_cost';

interface ExportArgs {
  tenantId: string;
  reportType: ReportType;
  filters?: Record<string, unknown>;
  format?: 'csv' | 'pdf';
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = r[h] ?? '';
        const s = String(v);
        return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','),
    ),
  ];
  return lines.join('\n');
}

export const handler: AppSyncResolverHandler<ExportArgs, unknown> = async (event) => {
  const { tenantId, reportType, filters = {}, format = 'csv' } = event.arguments;

  let rows: Record<string, unknown>[] = [];

  if (reportType === 'connote_summary' || reportType === 'connote_cost') {
    const { Items = [] } = await dynamo.send(new QueryCommand({
      TableName: CONNOTE_TABLE,
      IndexName: 'tenantId-createdAt-index',
      KeyConditionExpression: 'tenantId = :tid',
      ExpressionAttributeValues: { ':tid': tenantId },
      Limit: 5000,
    }));

    rows = Items.map((c) => {
      const refs: { type: string; value: string }[] = c.referencesJson
        ? JSON.parse(c.referencesJson)
        : [];
      const refStr = refs.map((r) => `${r.type}:${r.value}`).join('; ');
      return {
        connote_number: c.connoteNumber,
        carrier_connote: c.carrierConnoteNumber ?? '',
        carrier: c.carrierId ?? '',
        status: c.status,
        ship_to_address: c.shipToAddress,
        ship_to_suburb: c.shipToSuburb,
        ship_to_state: c.shipToState,
        ship_to_postcode: c.shipToPostcode,
        weight_kg: c.totalWeightKg ?? '',
        cubic_m3: c.totalCubicM3 ?? '',
        estimated_cost: c.estimatedCost ?? '',
        actual_cost: c.actualCost ?? '',
        expected_delivery: c.expectedDeliveryDate ?? '',
        actual_delivery: c.actualDeliveryDate ?? '',
        references: refStr,
        created_at: c.createdAt,
      };
    });
  } else if (reportType === 'overdue_connotes') {
    const today = new Date().toISOString().split('T')[0];
    const { Items = [] } = await dynamo.send(new QueryCommand({
      TableName: CONNOTE_TABLE,
      IndexName: 'tenantId-createdAt-index',
      KeyConditionExpression: 'tenantId = :tid',
      FilterExpression: '#s IN (:raised, :transit) AND expectedDeliveryDate < :today',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':tid': tenantId,
        ':raised': 'raised',
        ':transit': 'in_transit',
        ':today': today,
      },
      Limit: 5000,
    }));

    rows = Items.map((c) => {
      const refs: { type: string; value: string }[] = c.referencesJson
        ? JSON.parse(c.referencesJson)
        : [];
      return {
        connote_number: c.connoteNumber,
        carrier_connote: c.carrierConnoteNumber ?? '',
        carrier: c.carrierId ?? '',
        status: c.status,
        expected_delivery: c.expectedDeliveryDate ?? '',
        days_overdue: c.expectedDeliveryDate
          ? Math.max(0, Math.floor((Date.now() - new Date(c.expectedDeliveryDate).getTime()) / 86400000))
          : '',
        ship_to_suburb: c.shipToSuburb,
        ship_to_state: c.shipToState,
        references: refs.map((r) => `${r.type}:${r.value}`).join('; '),
      };
    });
  }

  // Serialize to CSV (PDF would require a separate layer with pdfkit)
  const csvContent = toCsv(rows);
  const s3Key = `reports/${tenantId}/${reportType}_${randomUUID()}.csv`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: csvContent,
    ContentType: 'text/csv',
  }));

  const downloadUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }),
    { expiresIn: 900 }, // 15 minutes
  );

  return { success: true, downloadUrl, rowCount: rows.length, s3Key };
};
