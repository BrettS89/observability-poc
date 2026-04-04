export type ApiKeyRow = {
  id: number;
  account_id: number;
  application_id: number;
  key_id: string;
  key_hash: string;
  encrypted_key: string;
  environment: 'dev' | 'prod';
  created_at: string;
  updated_at: string;
};
