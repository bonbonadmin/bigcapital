import knex from 'knex';
import * as LRUCache from 'lru-cache';
import { Global, Module } from '@nestjs/common';
import { ClsModule, ClsService } from 'nestjs-cls';
import { ConfigService } from '@nestjs/config';
import {
  EmbeddingsKnexConnection,
  EmbeddingsKnexConnectionConfigure,
} from './Embeddings.constants';

const lruCache = new LRUCache();

export const EmbeddingsDatabaseConfigProvider = {
  provide: EmbeddingsKnexConnectionConfigure,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    client: configService.get('embeddingsDatabase.client'),
    host: configService.get('embeddingsDatabase.host'),
    port: configService.get('embeddingsDatabase.port'),
    user: configService.get('embeddingsDatabase.user'),
    password: configService.get('embeddingsDatabase.password'),
    databaseName: configService.get('embeddingsDatabase.databaseName'),
    dbNamePrefix: configService.get('embeddingsDatabase.dbNamePrefix'),
    ssl: configService.get('embeddingsDatabase.ssl'),
  }),
};

export const EmbeddingsDatabaseProxyProvider = ClsModule.forFeatureAsync({
  provide: EmbeddingsKnexConnection,
  global: true,
  strict: true,
  inject: [EmbeddingsKnexConnectionConfigure, ClsService],
  useFactory: async (dbConfig, cls: ClsService) => () => {
    const organizationId = cls.get('organizationId');
    const database =
      dbConfig.databaseName || `${dbConfig.dbNamePrefix}${organizationId}`;
    const cacheKey = `${dbConfig.host}:${dbConfig.port}:${database}`;
    const cachedInstance = lruCache.get(cacheKey);

    if (cachedInstance) {
      return cachedInstance;
    }

    const knexInstance = knex({
      client: dbConfig.client,
      connection: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database,
        ssl: dbConfig.ssl,
      },
      pool: { min: 0, max: 7 },
    });

    lruCache.set(cacheKey, knexInstance);

    return knexInstance;
  },
  type: 'function',
});

@Global()
@Module({
  imports: [EmbeddingsDatabaseProxyProvider],
  providers: [EmbeddingsDatabaseConfigProvider],
  exports: [EmbeddingsDatabaseConfigProvider],
})
export class EmbeddingsDatabaseModule {}
