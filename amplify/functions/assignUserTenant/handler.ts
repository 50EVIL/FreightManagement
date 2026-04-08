import type { Schema } from '../../data/resource.ts';
import type { AppSyncResolverHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID!;

type Args = Schema['assignUserTenant']['args'];
type Result = Schema['assignUserTenant']['returnType'];

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const { email, tenantId, warehouseId, brokerId } = event.arguments;

  // Find Cognito user by email
  const listResult = await cognito.send(
    new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    }),
  );

  const user = listResult.Users?.[0];
  if (!user?.Username) {
    throw new Error(`No user found with email: ${email}`);
  }

  // Set all tenant-context attributes
  await cognito.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: user.Username,
      UserAttributes: [
        { Name: 'custom:tenantId',    Value: tenantId },
        { Name: 'custom:warehouseId', Value: warehouseId },
        { Name: 'custom:brokerId',    Value: brokerId },
        { Name: 'custom:role',        Value: 'TenantUser' },
      ],
    }),
  );

  return { success: true, username: user.Username };
};
