import type { AppSyncResolverHandler } from 'aws-lambda';
import type { Schema } from '../../data/resource.ts';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID!;

type Args = Schema['inviteUser']['args'];
type Result = Schema['inviteUser']['returnType'];

export const handler: AppSyncResolverHandler<Args, Result> = async (event) => {
  const { email } = event.arguments;

  const createResult = await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
      DesiredDeliveryMediums: ['EMAIL'],
    }),
  );

  const username = createResult.User?.Username;
  if (!username) throw new Error('Failed to create user');

  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: 'TenantUsers',
    }),
  );

  return { success: true, username };
};
