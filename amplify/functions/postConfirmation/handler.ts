import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({});

/**
 * Automatically assigns every confirmed user to the TenantUsers group.
 * Brokers and WarehouseAdmins must be promoted via the AWS Console or an admin API.
 */
export const handler: PostConfirmationTriggerHandler = async (event) => {
  // Only act on the ConfirmSignUp trigger, not admin-create
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }

  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      GroupName: 'TenantUsers',
    }),
  );

  return event;
};
