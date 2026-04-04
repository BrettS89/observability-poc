import { Pool, PoolClient } from 'pg';
import { PostgresCrud } from '../../storage/db/postgres/crud';
import { TABLES } from '../../storage/db/postgres/tables';
import { EndpointRow } from './types/endpoints.row';
import { CreateEndpointRequestDto } from './types/endpoints.api';

export class EndpointService {
  constructor(private db: Pool | PoolClient) {}

  async createEndpoint(endpointData: CreateEndpointRequestDto & { account_id: number }): Promise<EndpointRow> {
    const pgCrud = new PostgresCrud(this.db, TABLES.ENDPOINTS);

    const endpoint = await pgCrud.create<EndpointRow>(endpointData);

    return endpoint;
  }
}
