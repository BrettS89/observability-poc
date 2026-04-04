import { config } from 'dotenv';
config();
import { postgres } from '../src/storage/db/postgres';
import { PostgresCrud } from '../src/storage/db/postgres/crud';
import { TABLES } from '../src/storage/db/postgres/tables';
import { RoleRow } from '../src/modules/roles/types/roles.row';
import { AccountRow } from '../src/modules/accounts/types/accounts.row';
import { UserRow } from '../src/modules/users/types/users.row';
import { PoolClient } from 'pg';

export const run = async () => {
  let client: PoolClient | undefined = undefined;

  try {
    await postgres.connect({
      host: 'localhost',
      port: Number(process.env.PGPORT),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PG_DATABASE,
    });

    client = await postgres.pool.connect();

    await client.query('BEGIN');

    const roleCrud = new PostgresCrud(client, TABLES.ROLES);
    const role = await roleCrud.create<RoleRow>({ name: 'admin' });
    console.log('role created');

    const accountCrud = new PostgresCrud(client, TABLES.ACCOUNTS);
    const account = await accountCrud.create<AccountRow>({ name: 'Ultima Corp' });
    console.log('account created');

    const userCrud = new PostgresCrud(client, TABLES.USERS);
    await userCrud.create<UserRow>({
      email: 'brett.sodie@protonmail.com',
      account_id: account.id,
      role_id: role.id,
      is_active: true,
    });
    console.log('user created');

    await client.query('COMMIT');

  } catch(e) {
    try {
      await client?.query('ROLLBACK');
    } catch{}
    console.error(e);
  } finally {
    client?.release();
    await postgres.pool.end();
  }
};

run();
