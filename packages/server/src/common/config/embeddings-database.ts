import { registerAs } from '@nestjs/config';
import { parseBoolean } from '@/utils/parse-boolean';

export default registerAs('embeddingsDatabase', () => ({
  client: process.env.PGVECTOR_DB_CLIENT || 'pg',
  host: process.env.PGVECTOR_DB_HOST,
  port: parseInt(process.env.PGVECTOR_DB_PORT || '5432', 10),
  user: process.env.PGVECTOR_DB_USER,
  password: process.env.PGVECTOR_DB_PASSWORD,
  databaseName: process.env.PGVECTOR_DB_NAME || undefined,
  dbNamePrefix:
    process.env.PGVECTOR_DB_NAME_PREFIX ||
    process.env.TENANT_DB_NAME_PERFIX ||
    'bigcapital_tenant_',
  schema: process.env.PGVECTOR_DB_SCHEMA || 'public',
  ssl: parseBoolean<boolean>(process.env.PGVECTOR_DB_SSL, false)
    ? {
        rejectUnauthorized: parseBoolean<boolean>(
          process.env.PGVECTOR_DB_SSL_REJECT_UNAUTHORIZED,
          false,
        ),
      }
    : false,
}));
