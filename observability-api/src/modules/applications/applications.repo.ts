import { Pool, PoolClient } from 'pg';

export class AccountRepository {
  constructor(private db: Pool | PoolClient) {}
}
