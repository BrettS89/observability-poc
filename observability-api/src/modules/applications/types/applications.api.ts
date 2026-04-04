import Type from 'typebox';
import { resource } from '../../../types/resource';
import { apiKeyResponseSchema } from '../../api-keys/types/api-keys.api'; 

export const createApplicationSchema = Type.Object({
  name: Type.String(),
  type: Type.String(),
});

export type CreateApplicationRequestDto = Type.Static<typeof createApplicationSchema>;

export const applicationResponseSchema = Type.Object({
  ...resource.properties,
  name: Type.String(),
  type: Type.String(),
  account_id: Type.Integer(),
});

export const createApplicationResponseSchema = Type.Object({
  ...applicationResponseSchema.properties,
  api_keys: Type.Array(apiKeyResponseSchema),
});

export type ApplicationResponseDto = Type.Static<typeof applicationResponseSchema>;
export type CreateApplicationResponseDto = Type.Static<typeof createApplicationResponseSchema>;
