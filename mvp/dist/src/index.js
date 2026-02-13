"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const app_1 = require("./app");
const environment_variables_1 = require("./config/environment-variables");
const run = async () => {
    (0, environment_variables_1.validateEnvironmentVariables)();
    app_1.app.listen(environment_variables_1.envVars.PORT, () => {
        console.log(`server started on port 4009`);
    });
};
run();
