import pg from 'pg';

export class Postgres {
  private _pool: pg.Pool | null = null;

  public connect(options: pg.PoolConfig) {
    this._pool = new pg.Pool({
      ...options,
      max: 10,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
    return this._pool.query('SELECT 1 + 1');
  }

  public close() {
    return this._pool?.end();
  }

  get pool(): pg.Pool {
    if (!this._pool) {
      throw new Error('No pool exists');
    }

    return this._pool;
  }
}

export const postgres = new Postgres();
