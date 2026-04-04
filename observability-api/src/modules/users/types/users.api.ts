import Type from 'typebox';
import { resource } from '../../../types/resource';

export const createUserSchema = Type.Object({
  email: Type.String(),
  role_id: Type.Integer(),
  account_id: Type.Integer(),
});

export type CreateUserRequestDto = Type.Static<typeof createUserSchema>;

export const userResponseSchema = Type.Object({
  ...resource.properties,
  email: Type.String(),
  is_active: Type.Boolean(),
  role_id: Type.Integer(),
  account_id: Type.Integer(),
});

export type UserResponseDto = Type.Static<typeof userResponseSchema>;
