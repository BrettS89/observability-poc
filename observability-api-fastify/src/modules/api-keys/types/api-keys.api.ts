import Type from 'typebox';
import { resource } from '../../../types/resource';

export const createApiKeySchema = Type.Object({
  application_id: Type.String(),
  environment: Type.String(),
});

export type CreateApiKeyRequestDto = Type.Static<typeof createApiKeySchema>;

export const apiKeyResponseSchema = Type.Object({
  ...resource.properties,
  account_id: Type.Integer(),
  application_id: Type.Integer(),
  key_id: Type.String(),
  key_hash: Type.String(),
  encrypted_key: Type.String(),
  environment: Type.String(),
});

export type AccountResponseDto = Type.Static<typeof apiKeyResponseSchema>;
