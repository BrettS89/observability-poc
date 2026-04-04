import Type from 'typebox';
import { resource } from '../../../types/resource';

export const createRoleSchema = Type.Object({
  name: Type.String(),
});

export type CreateRoleRequestDto = Type.Static<typeof createRoleSchema>;

export const roleResponseSchema = Type.Object({
  ...resource.properties,
  name: Type.String(),
});

export type RoleResponseDto = Type.Static<typeof roleResponseSchema>;
