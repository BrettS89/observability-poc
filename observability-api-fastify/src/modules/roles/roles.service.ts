import { Pool, PoolClient } from 'pg';
import { PostgresCrud } from '../../storage/db/postgres/crud';
import { TABLES } from '../../storage/db/postgres/tables';
import { RoleRow } from './types/roles.row';
import { CreateRoleRequestDto } from './types/roles.api';

export class RoleService {
  constructor(private db: Pool | PoolClient) {}

  async createRole(roleData: CreateRoleRequestDto): Promise<RoleRow> {
    const pgCrud = new PostgresCrud(this.db, TABLES.ROLES);

    const role = await pgCrud.create<RoleRow>(roleData);

    return role;
  }

  async getRoleById(id: number): Promise<RoleRow | null> {
    const pgCrud = new PostgresCrud(this.db, TABLES.ROLES);

    const role = await pgCrud.getById<RoleRow>(id);

    return role;
  }

  async getRoles(): Promise<RoleRow[]> {
    const roles = await this.db.query<RoleRow>(`SELECT * FROM ${TABLES.ROLES} ORDER BY id ASC`);

    return roles.rows;
  }
}
