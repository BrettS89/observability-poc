import { Pool, PoolClient } from 'pg';
// import { BaseQueryObject } from '../../../utils/query/schema';
// import { generateSqlAndParams } from '../../../utils/query';

type GeneratedKeys = 'id' | 'created_at' | 'updated_at';

type InsertData<T> = Omit<T, GeneratedKeys>;

export class PostgresCrud {
  readonly name: string;
  private db: Pool | PoolClient;

  constructor(db: Pool | PoolClient, table: string) {
    this.name = table;
    this.db = db;
  }

  async getById<T>(id: number | string | bigint): Promise<T | null> {
    const sql = `SELECT * FROM ${this.name} WHERE id = $1`;

    const res = await this.db.query(sql, [id]);

    return res.rows[0] as T ?? null;
  }

  // async find<T>(query?: BaseQueryObject & Record<string, any>): Promise<T[]> {
  //   const { sql, values } = generateSqlAndParams({
  //     sqlString: `SELECT * FROM ${this.name}`,
  //     filter: query ?? {},
  //   });

  //   const res = await this.db.query(sql, values);

  //   return res.rows as T[];
  // }

  async create<T>(data: InsertData<T>): Promise<T> {
    const keys: string[] = [];
    const nums: string[] = []
    const values: any[] = [];

    Object.entries(data).forEach(([k, v], i) => {
      keys.push(k);
      nums.push(`$${i + 1}`);
      values.push(v);
    });

    const sql = `INSERT INTO ${this.name} (${keys.join(', ')}) VALUES(${nums.join(', ')}) RETURNING *`;

    const res = await this.db.query(sql, values);

    return res.rows[0] as T;
  }

  async findByIdAndUpdate<T>(id: number | string | bigint, data: Record<string, any>): Promise<T | null> {
    const keys: string[] = [];
    const values: any[] = []; 

    Object.entries(data).forEach(([k, v], i) => {
      keys.push(`${k} = $${i + 1}`);
      values.push(v);
    });

    values.push(id);

    const sql = `UPDATE ${this.name} SET ${keys.join(', ')} WHERE id = $${keys.length + 1} RETURNING *`;

    const res = await this.db.query(sql, values);

    return res.rows[0] as T ?? null;
  }

  async remove<T>(id: number | string | bigint): Promise<T | null> {
    const sql = `DELETE FROM ${this.name} WHERE id = $1 RETURNING *`;

    const res = await this.db.query(sql, [id]);

    return res.rows[0] as T ?? null;
  }
}
