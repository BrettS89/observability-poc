import { postgres } from './storage/db/postgres';
import { app } from './app';

const run = async () => {
  try {
    await postgres.connect({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PG_DATABASE,
    });

    console.log('Connected to Postgres')

    process.on('SIGTERM', async () => {
      await postgres.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      await postgres.close();
      process.exit(0);
    });

    process.on('uncaughtException', async () => {
      await postgres.close();
      process.exit(1);
    });

    app.listen(4007, () => {
      console.log('server started on port 4007');
    });
  } catch(e) {
    console.error(e);
  }
};

run();
