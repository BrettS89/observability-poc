import Type from 'typebox';

export const resource = Type.Object({
  id: Type.Integer(),
  created_at: Type.String(),
  updated_at: Type.String(),
});

