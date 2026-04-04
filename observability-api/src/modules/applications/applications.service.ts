import { Pool, PoolClient } from 'pg';
import { PostgresCrud } from '../../storage/db/postgres/crud';
import { TABLES } from '../../storage/db/postgres/tables';
import { ApplicationRow } from './types/applications.row';
import { CreateApplicationRequestDto, CreateApplicationResponseDto } from './types/applications.api';
import { ApiKeysService } from '../api-keys/api-keys.service';

export class ApplicationService {
  constructor(private db: Pool | PoolClient) {}

  async createApplication(applicationData: CreateApplicationRequestDto & { account_id: number }): Promise<CreateApplicationResponseDto> {
    const pgCrud = new PostgresCrud(this.db, TABLES.APPLICATIONS);

    const application = await pgCrud.create<ApplicationRow>(applicationData);

    const apiKeyService = new ApiKeysService(this.db);

    const devKey = await apiKeyService.createApiKey({
      account_id: application.account_id,
      application_id: application.id,
      environment: 'dev',
    });

    const prodKey = await apiKeyService.createApiKey({
      account_id: application.account_id,
      application_id: application.id,
      environment: 'prod',
    });

    return {
      ...application,
      api_keys: [devKey, prodKey],
    };
  }

}
