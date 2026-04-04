import Type from 'typebox';
import { resource } from '../../../types/resource';

export const createAccountSchema = Type.Object({
  name: Type.String(),
});

export type CreateAccountRequestDto = Type.Static<typeof createAccountSchema>;

export const accountResponseSchema = Type.Object({
  ...resource.properties,
  name: Type.String(),
});

export type AccountResponseDto = Type.Static<typeof accountResponseSchema>;
