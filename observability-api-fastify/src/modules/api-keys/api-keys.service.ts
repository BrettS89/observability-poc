import { Pool, PoolClient } from 'pg';
import { PostgresCrud } from '../../storage/db/postgres/crud';
import { TABLES } from '../../storage/db/postgres/tables';
import { ApiKeysRepository } from './api-keys-repo';
import { ApiKeyRow } from './types/api-keys.row';

type CreateApiKeyData = {
  account_id: number;
  application_id: number;
  environment: 'dev' | 'prod';
};

export class ApiKeysService {
  constructor(private db: Pool | PoolClient) {}

  async createApiKey(apiKeyData: CreateApiKeyData): Promise<ApiKeyRow> {
    const apiKeyRepo = new ApiKeysRepository(this.db);

    const apiKeys = apiKeyRepo.generateApiKey(apiKeyData.environment);

    const pgCrud = new PostgresCrud(this.db, TABLES.API_KEYS);

    const apiKey = await pgCrud.create<ApiKeyRow>({
      ...apiKeyData,
      key_id: apiKeys.keyId,
      key_hash: apiKeys.keyHash,
      encrypted_key: apiKeys.encryptedKey,
    });

    return apiKey;
  }

}
