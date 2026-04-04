import { Pool, PoolClient } from 'pg';
import { PostgresCrud } from '../../storage/db/postgres/crud';
import { TABLES } from '../../storage/db/postgres/tables';
import { UserRow } from './types/users.row';
import { CreateUserRequestDto } from './types/users.api';
import { getUsersByEmailSql } from './users.sql';

export class UserService {
  constructor(private db: Pool | PoolClient) {}

  async createUser(userData: CreateUserRequestDto): Promise<UserRow> {
    const pgCrud = new PostgresCrud(this.db, TABLES.ACCOUNTS);

    const user = await pgCrud.create<UserRow>({
      ...userData,
      is_active: true,
    });

    return user;
  }

  async getUserByEmail(email: string): Promise<UserRow | null> {
    const { rows } = await this.db.query(getUsersByEmailSql, [email]);

    return rows[0] ?? null;
  }

}
