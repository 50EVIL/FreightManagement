import type { PreTokenGenerationTriggerHandler } from 'aws-lambda';

/**
 * Injects custom tenant claims into the Cognito JWT so that
 * AppSync resolvers and the React client can read tenantId,
 * warehouseId, brokerId and role without an extra API call.
 */
export const handler: PreTokenGenerationTriggerHandler = async (event) => {
  const attrs = event.request.userAttributes;

  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        'custom:brokerId': attrs['custom:brokerId'] ?? '',
        'custom:warehouseId': attrs['custom:warehouseId'] ?? '',
        'custom:tenantId': attrs['custom:tenantId'] ?? '',
        'custom:role': attrs['custom:role'] ?? 'TenantUser',
      },
    },
  };

  return event;
};
