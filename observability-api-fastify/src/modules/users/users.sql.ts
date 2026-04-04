import { TABLES } from '../../storage/db/postgres/tables';

export const getUsersByEmailSql = `
  SELECT *
  FROM ${TABLES.USERS}
  WHERE email = $1
`;
