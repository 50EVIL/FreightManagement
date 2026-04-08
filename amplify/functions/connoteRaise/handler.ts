import type { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getCarrierAdapter } from './carriers/CarrierAdapterFactory';
import type { ConnoteRequest } from './carriers/ICarrierAdapter';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const CONNOTE_TABLE = process.env.CONNOTE_TABLE!;
const LINE_ITEM_TABLE = process.env.CONNOTE_LINE_ITEM_TABLE!;

export const handler: AppSyncResolverHandler<{ connoteId: string }, unknown> = async (event) => {
  const { connoteId } = event.arguments;

  // Load connote
  const { Item: connote } = await dynamo.send(new GetCommand({
    TableName: CONNOTE_TABLE,
    Key: { id: connoteId },
  }));
  if (!connote) throw new Error(`Connote not found: ${connoteId}`);
  if (!connote.carrierId) throw new Error('Connote has no carrier assigned');

  // Load line items
  const { Items: lineItems = [] } = await dynamo.send(new QueryCommand({
    TableName: LINE_ITEM_TABLE,
    IndexName: 'connoteId-index',
    KeyConditionExpression: 'connoteId = :cid',
    ExpressionAttributeValues: { ':cid': connoteId },
  }));

  const references: { type: string; value: string }[] = connote.referencesJson
    ? JSON.parse(connote.referencesJson)
    : [];

  const req: ConnoteRequest = {
    connoteId,
    internalConnoteNumber: connote.connoteNumber,
    tenantId: connote.tenantId,
    serviceType: connote.serviceType ?? 'STANDARD',
    from: {
      name: connote.shipFromName ?? '',
      address: connote.shipFromAddress ?? '',
      suburb: connote.shipFromSuburb ?? '',
      state: connote.shipFromState ?? '',
      postcode: connote.shipFromPostcode ?? '',
    },
    to: {
      name: connote.shipToName ?? '',
      address: connote.shipToAddress,
      suburb: connote.shipToSuburb,
      state: connote.shipToState,
      postcode: connote.shipToPostcode,
      contactName: connote.shipToContactName,
      phone: connote.shipToPhone,
    },
    lineItems: lineItems.map((li) => ({
      description: li.description ?? '',
      quantity: li.quantity,
      weightKg: li.weightKg,
      lengthCm: li.lengthCm,
      widthCm: li.widthCm,
      heightCm: li.heightCm,
      cubicM3: li.cubicM3,
      packagingType: li.packagingType,
      dangerousGoodsClass: li.dangerousGoodsClass,
    })),
    specialInstructions: connote.specialInstructions,
    tailLift: connote.tailLift ?? false,
    dangerousGoods: connote.dangerousGoods ?? false,
    authority2Leave: connote.authority2Leave ?? false,
    references,
  };

  const adapter = getCarrierAdapter(connote.carrierId);
  const result = await adapter.raiseConnote(req);

  if (!result.success) {
    await dynamo.send(new UpdateCommand({
      TableName: CONNOTE_TABLE,
      Key: { id: connoteId },
      UpdateExpression: 'SET #s = :s, updatedAt = :ua',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':s': 'raise_failed',
        ':ua': new Date().toISOString(),
      },
    }));
    throw new Error(`Carrier rejected connote: ${result.errorMessage}`);
  }

  await dynamo.send(new UpdateCommand({
    TableName: CONNOTE_TABLE,
    Key: { id: connoteId },
    UpdateExpression: 'SET #s = :s, carrierConnoteNumber = :ccn, ' +
      'expectedDeliveryDate = :edd, labelS3Key = :lsk, ' +
      'carrierRaisedAt = :cra, updatedAt = :ua',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':s': 'raised',
      ':ccn': result.carrierConnoteNumber ?? '',
      ':edd': result.estimatedDeliveryDate ?? '',
      ':lsk': result.labelS3Key ?? '',
      ':cra': new Date().toISOString(),
      ':ua': new Date().toISOString(),
    },
  }));

  return {
    success: true,
    carrierConnoteNumber: result.carrierConnoteNumber,
    estimatedDeliveryDate: result.estimatedDeliveryDate,
  };
};
