import type { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getCarrierAdapter } from '../connoteRaise/carriers/CarrierAdapterFactory';
import type { ManifestRequest, ConnoteRequest } from '../connoteRaise/carriers/ICarrierAdapter';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const MANIFEST_TABLE = process.env.MANIFEST_TABLE!;
const CONNOTE_TABLE = process.env.CONNOTE_TABLE!;
const LINE_ITEM_TABLE = process.env.CONNOTE_LINE_ITEM_TABLE!;

export const handler: AppSyncResolverHandler<{ manifestId: string }, unknown> = async (event) => {
  const { manifestId } = event.arguments;

  const { Item: manifest } = await dynamo.send(new GetCommand({
    TableName: MANIFEST_TABLE,
    Key: { id: manifestId },
  }));
  if (!manifest) throw new Error(`Manifest not found: ${manifestId}`);

  // Load all connotes on this manifest
  const { Items: connotes = [] } = await dynamo.send(new QueryCommand({
    TableName: CONNOTE_TABLE,
    IndexName: 'manifestId-index',
    KeyConditionExpression: 'manifestId = :mid',
    ExpressionAttributeValues: { ':mid': manifestId },
  }));

  // Build connote requests with their line items
  const connoteRequests: ConnoteRequest[] = await Promise.all(
    connotes.map(async (connote) => {
      const { Items: lineItems = [] } = await dynamo.send(new QueryCommand({
        TableName: LINE_ITEM_TABLE,
        IndexName: 'connoteId-index',
        KeyConditionExpression: 'connoteId = :cid',
        ExpressionAttributeValues: { ':cid': connote.id },
      }));

      return {
        connoteId: connote.id,
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
        },
        lineItems: lineItems.map((li) => ({
          description: li.description ?? '',
          quantity: li.quantity,
          weightKg: li.weightKg,
          lengthCm: li.lengthCm,
          widthCm: li.widthCm,
          heightCm: li.heightCm,
          cubicM3: li.cubicM3,
        })),
        tailLift: connote.tailLift ?? false,
        dangerousGoods: connote.dangerousGoods ?? false,
        authority2Leave: connote.authority2Leave ?? false,
        references: connote.referencesJson ? JSON.parse(connote.referencesJson) : [],
      };
    }),
  );

  const req: ManifestRequest = {
    manifestId,
    internalManifestNumber: manifest.manifestNumber,
    carrierId: manifest.carrierId,
    dispatchDate: manifest.dispatchDate,
    connotes: connoteRequests,
  };

  const adapter = getCarrierAdapter(manifest.carrierId);
  const result = await adapter.sendManifest(req);

  if (!result.success) {
    throw new Error(`Carrier rejected manifest: ${result.errorMessage}`);
  }

  await dynamo.send(new UpdateCommand({
    TableName: MANIFEST_TABLE,
    Key: { id: manifestId },
    UpdateExpression: 'SET #s = :s, carrierManifestRef = :cmr, sentToCarrierAt = :sca, updatedAt = :ua',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':s': 'sent',
      ':cmr': result.carrierManifestRef ?? '',
      ':sca': new Date().toISOString(),
      ':ua': new Date().toISOString(),
    },
  }));

  return { success: true, carrierManifestRef: result.carrierManifestRef };
};
