import type { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  BatchWriteCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const RATE_CARD_ENTRY_TABLE = process.env.RATE_CARD_ENTRY_TABLE!;
const PUBLISHED_RATE_CARD_TABLE = process.env.PUBLISHED_RATE_CARD_TABLE!;
const PUBLISHED_ENTRY_TABLE = process.env.PUBLISHED_RATE_CARD_ENTRY_TABLE!;

interface RouteOverride {
  fromState?: string;
  toState?: string;
  fromPostcode?: string;
  toPostcode?: string;
  serviceType?: string;
  marginPct?: number;
  fixedMarkup?: number;
}

interface PublishRateCardArgs {
  rateCardId: string;
  tenantIds?: string[];
  warehouseIds?: string[];
  markupType: 'percentage' | 'per_route' | 'fixed_margin';
  globalMarginPct?: number;
  routeOverridesJson?: string;
  effectiveDate?: string;
  expiryDate?: string;
}

function applyMarkup(
  baseRate: number,
  markupType: string,
  globalMarginPct: number,
  override?: RouteOverride,
): { markupAmount: number; customerRate: number } {
  if (override?.fixedMarkup != null) {
    return { markupAmount: override.fixedMarkup, customerRate: baseRate + override.fixedMarkup };
  }
  const pct = override?.marginPct ?? globalMarginPct;
  const markupAmount = parseFloat((baseRate * pct / 100).toFixed(4));
  return { markupAmount, customerRate: parseFloat((baseRate + markupAmount).toFixed(4)) };
}

export const handler: AppSyncResolverHandler<PublishRateCardArgs, unknown> = async (event) => {
  const {
    rateCardId,
    tenantIds = [],
    warehouseIds = [],
    markupType,
    globalMarginPct = 0,
    routeOverridesJson,
    effectiveDate,
    expiryDate,
  } = event.arguments;

  const routeOverrides: RouteOverride[] = routeOverridesJson
    ? JSON.parse(routeOverridesJson)
    : [];

  // Load all source rate entries
  const { Items: sourceEntries = [] } = await dynamo.send(new QueryCommand({
    TableName: RATE_CARD_ENTRY_TABLE,
    IndexName: 'rateCardId-index',
    KeyConditionExpression: 'rateCardId = :rcid',
    ExpressionAttributeValues: { ':rcid': rateCardId },
  }));

  const targetIds = [...(tenantIds ?? []), ...(warehouseIds ?? [])];

  for (const targetId of targetIds) {
    const publishedRateCardId = randomUUID();

    // Create the published rate card header
    await dynamo.send(new PutCommand({
      TableName: PUBLISHED_RATE_CARD_TABLE,
      Item: {
        id: publishedRateCardId,
        sourceRateCardId: rateCardId,
        tenantId: targetId,
        markupType,
        globalMarginPct,
        status: 'active',
        publishedAt: new Date().toISOString(),
        effectiveDate: effectiveDate ?? new Date().toISOString().split('T')[0],
        expiryDate: expiryDate ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }));

    // Build published entries with markup applied
    const publishedEntries = sourceEntries.map((entry) => {
      // Find route-specific override (most specific match wins)
      const override = routeOverrides.find((o) =>
        (!o.fromState || o.fromState === entry.fromState) &&
        (!o.toState || o.toState === entry.toState) &&
        (!o.fromPostcode || o.fromPostcode === entry.fromPostcode) &&
        (!o.toPostcode || o.toPostcode === entry.toPostcode) &&
        (!o.serviceType || o.serviceType === entry.serviceType),
      );

      const { markupAmount, customerRate } = applyMarkup(
        entry.baseRate,
        markupType,
        globalMarginPct,
        override,
      );

      return {
        PutRequest: {
          Item: {
            id: randomUUID(),
            publishedRateCardId,
            tenantId: targetId,
            fromState: entry.fromState,
            toState: entry.toState,
            fromPostcode: entry.fromPostcode,
            toPostcode: entry.toPostcode,
            serviceType: entry.serviceType,
            weightBreakKg: entry.weightBreakKg,
            cubicBreakM3: entry.cubicBreakM3,
            carrierRate: entry.baseRate,
            markupAmount,
            customerRate,
            unit: entry.unit,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });

    // Batch write in chunks of 25
    for (let i = 0; i < publishedEntries.length; i += 25) {
      await dynamo.send(new BatchWriteCommand({
        RequestItems: { [PUBLISHED_ENTRY_TABLE]: publishedEntries.slice(i, i + 25) },
      }));
    }
  }

  return { success: true, publishedCount: targetIds.length, entryCount: sourceEntries.length };
};
