import Type from 'typebox';
import { resource } from '../../../types/resource';

export const createEndpointSchema = Type.Object({
  application_id: Type.Integer(),
  method: Type.String(),
  path: Type.String(),
});

export type CreateEndpointRequestDto = Type.Static<typeof createEndpointSchema>;

export const endpointResponseSchema = Type.Object({
  ...resource.properties,
  account_id: Type.Integer(),
  application_id: Type.Integer(),
  method: Type.String(),
  path: Type.String(),
});

export type EndpointResponseDto = Type.Static<typeof endpointResponseSchema>;
