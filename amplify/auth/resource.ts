import { defineAuth } from '@aws-amplify/backend';
import { preTokenGeneration } from '../functions/preTokenGeneration/resource';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    'custom:brokerId': {
      dataType: 'String',
      mutable: true,
    },
    'custom:warehouseId': {
      dataType: 'String',
      mutable: true,
    },
    'custom:tenantId': {
      dataType: 'String',
      mutable: true,
    },
    'custom:role': {
      dataType: 'String',
      mutable: true,
    },
  },
  groups: ['Brokers', 'WarehouseAdmins', 'TenantUsers'],
  triggers: {
    preTokenGeneration,
  },
});
