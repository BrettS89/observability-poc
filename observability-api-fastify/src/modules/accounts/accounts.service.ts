import { Pool, PoolClient } from 'pg';
import { PostgresCrud } from '../../storage/db/postgres/crud';
import { TABLES } from '../../storage/db/postgres/tables';
import { AccountRow } from './types/accounts.row';
import { CreateAccountRequestDto } from './types/accounts.api';

export class AccountService {
  constructor(private db: Pool | PoolClient) {}

  async createAccount(accountData: CreateAccountRequestDto): Promise<AccountRow> {
    const pgCrud = new PostgresCrud(this.db, TABLES.ACCOUNTS);

    const account = await pgCrud.create<AccountRow>(accountData);

    return account;
  }

  async getAccountById(id: number): Promise<AccountRow | null> {
    const pgCrud = new PostgresCrud(this.db, TABLES.ACCOUNTS);

    const account = await pgCrud.getById<AccountRow>(id);

    return account;
  }
}
