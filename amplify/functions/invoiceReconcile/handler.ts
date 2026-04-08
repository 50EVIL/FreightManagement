import type { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const INVOICE_TABLE = process.env.CARRIER_INVOICE_TABLE!;
const INVOICE_LINE_TABLE = process.env.CARRIER_INVOICE_LINE_TABLE!;
const CONNOTE_TABLE = process.env.CONNOTE_TABLE!;

/** Tolerance in dollars below which a variance is considered matched */
const MATCH_TOLERANCE = 0.50;

export const handler: AppSyncResolverHandler<{ invoiceId: string }, unknown> = async (event) => {
  const { invoiceId } = event.arguments;

  const { Items: lines = [] } = await dynamo.send(new QueryCommand({
    TableName: INVOICE_LINE_TABLE,
    IndexName: 'invoiceId-index',
    KeyConditionExpression: 'invoiceId = :iid',
    ExpressionAttributeValues: { ':iid': invoiceId },
  }));

  let matchedCount = 0;
  let varianceCount = 0;
  let totalVariance = 0;

  for (const line of lines) {
    if (!line.carrierConnoteNumber) continue;

    // Find connote by carrier connote number
    const { Items: connotes = [] } = await dynamo.send(new QueryCommand({
      TableName: CONNOTE_TABLE,
      IndexName: 'carrierConnoteNumber-index',
      KeyConditionExpression: 'carrierConnoteNumber = :ccn',
      ExpressionAttributeValues: { ':ccn': line.carrierConnoteNumber },
    }));

    if (connotes.length === 0) {
      // No matching connote found — leave as unmatched
      continue;
    }

    const connote = connotes[0];
    const chargedAmount = connote.actualCost ?? connote.estimatedCost ?? 0;
    const variance = Math.abs(line.amount - chargedAmount);
    const isWithinTolerance = variance <= MATCH_TOLERANCE;

    const matchStatus = isWithinTolerance ? 'matched' : 'variance';
    const varianceAmount = isWithinTolerance ? 0 : parseFloat((line.amount - chargedAmount).toFixed(2));

    if (matchStatus === 'matched') matchedCount++;
    else {
      varianceCount++;
      totalVariance += Math.abs(varianceAmount);
    }

    await dynamo.send(new UpdateCommand({
      TableName: INVOICE_LINE_TABLE,
      Key: { id: line.id },
      UpdateExpression: 'SET matchStatus = :ms, matchedConnoteId = :mcid, ' +
        'varianceAmount = :va, updatedAt = :ua',
      ExpressionAttributeValues: {
        ':ms': matchStatus,
        ':mcid': connote.id,
        ':va': varianceAmount,
        ':ua': new Date().toISOString(),
      },
    }));
  }

  // Update invoice summary
  await dynamo.send(new UpdateCommand({
    TableName: INVOICE_TABLE,
    Key: { id: invoiceId },
    UpdateExpression: 'SET #s = :s, matchedCount = :mc, varianceCount = :vc, ' +
      'totalVarianceAmount = :tva, updatedAt = :ua',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':s': 'reconciled',
      ':mc': matchedCount,
      ':vc': varianceCount,
      ':tva': parseFloat(totalVariance.toFixed(2)),
      ':ua': new Date().toISOString(),
    },
  }));

  return { success: true, matchedCount, varianceCount, totalVarianceAmount: totalVariance };
};
