import { config } from 'dotenv';
config();
import { app } from './app';
import { validateEnvironmentVariables, envVars } from './config/environment-variables';

const run = async () => {
  validateEnvironmentVariables();

  app.listen(envVars.PORT, () => {
    console.log(`server started on port 4009`);
  });
};

run();
