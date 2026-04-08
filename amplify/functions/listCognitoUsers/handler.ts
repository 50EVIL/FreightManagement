import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID!;

export const handler = async () => {
  const result = await cognito.send(
    new ListUsersCommand({ UserPoolId: USER_POOL_ID, Limit: 60 }),
  );

  const users = (result.Users ?? []).map((u) => {
    const attrs = Object.fromEntries(
      (u.Attributes ?? []).map((a) => [a.Name!, a.Value ?? '']),
    );
    return {
      username: u.Username ?? '',
      email: attrs['email'] ?? '',
      status: u.UserStatus ?? '',
      enabled: u.Enabled ?? true,
      tenantId: attrs['custom:tenantId'] || null,
      warehouseId: attrs['custom:warehouseId'] || null,
      brokerId: attrs['custom:brokerId'] || null,
      role: attrs['custom:role'] || null,
      createdAt: u.UserCreateDate?.toISOString() ?? null,
    };
  });

  return users;
};
