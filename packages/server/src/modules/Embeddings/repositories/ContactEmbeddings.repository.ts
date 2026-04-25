import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { ConfigService } from '@nestjs/config';
import { EmbeddingsKnexConnection } from '../Embeddings.constants';
import {
  ContactEmbedding,
  ContactEmbeddingUpsertInput,
  EmbeddingVector,
  VectorSimilarityMatch,
} from '../types/Embeddings.types';
import { parsePgVector, serializePgVector } from '../utils/pgvector';

@Injectable()
export class ContactEmbeddingsRepository {
  private readonly tableName = 'CONTACTS_EMBED';
  private readonly schemaName: string;
  private readonly dimensions: number;

  constructor(
    @Inject(EmbeddingsKnexConnection)
    private readonly knex: () => Knex,
    private readonly configService: ConfigService,
  ) {
    this.schemaName = this.configService.get<string>(
      'embeddingsDatabase.schema',
      'public',
    );
    this.dimensions = this.configService.get<number>(
      'aiEmbeddings.dimensions',
      3072,
    );
  }

  async ensureTable(): Promise<void> {
    const db = this.knex();

    await db.raw('CREATE EXTENSION IF NOT EXISTS vector');
    await db.raw(
      `CREATE TABLE IF NOT EXISTS "${this.schemaName}"."${this.tableName}" (
        "CONTACT_ID" bigint PRIMARY KEY,
        "COMPANY_NAME_EMBEDDING" vector(${this.dimensions}),
        "FULL_NAME_EMBEDDING" vector(${this.dimensions})
      )`,
    );

    // if (this.dimensions <= 2000) {
    //   await db.raw(
    //     `CREATE INDEX IF NOT EXISTS contacts_embed_company_name_hnsw_idx
    //      ON "${this.schemaName}"."${this.tableName}"
    //      USING hnsw ("COMPANY_NAME_EMBEDDING" vector_cosine_ops)`,
    //   );
    //   await db.raw(
    //     `CREATE INDEX IF NOT EXISTS contacts_embed_full_name_hnsw_idx
    //      ON "${this.schemaName}"."${this.tableName}"
    //      USING hnsw ("FULL_NAME_EMBEDDING" vector_cosine_ops)`,
    //   );
    // }
  }

  async findByContactId(contactId: number): Promise<ContactEmbedding | undefined> {
    const row = await this.baseQuery()
      .select({
        contactId: 'CONTACT_ID',
        companyNameEmbedding: 'COMPANY_NAME_EMBEDDING',
        fullNameEmbedding: 'FULL_NAME_EMBEDDING',
      })
      .where('CONTACT_ID', contactId)
      .first();

    return row ? this.mapRow(row) : undefined;
  }

  async findPendingContactIds(contactIds: number[]): Promise<Set<number>> {
    if (!contactIds.length) {
      return new Set();
    }

    const rows = await this.baseQuery()
      .select('CONTACT_ID')
      .whereIn('CONTACT_ID', contactIds)
      .where((query) => {
        query
          .whereNull('COMPANY_NAME_EMBEDDING')
          .orWhereNull('FULL_NAME_EMBEDDING');
      });

    const pendingIds = new Set(rows.map((row) => Number(row.CONTACT_ID)));

    for (const contactId of contactIds) {
      if (!pendingIds.has(contactId)) {
        continue;
      }
    }

    const existingIds = new Set(
      (
        await this.baseQuery()
          .select('CONTACT_ID')
          .whereIn('CONTACT_ID', contactIds)
      ).map((row) => Number(row.CONTACT_ID)),
    );

    for (const contactId of contactIds) {
      if (!existingIds.has(contactId)) {
        pendingIds.add(contactId);
      }
    }

    return pendingIds;
  }

  async upsert(input: ContactEmbeddingUpsertInput): Promise<void> {
    await this.upsertMany([input]);
  }

  async upsertMany(inputs: ContactEmbeddingUpsertInput[]): Promise<void> {
    if (!inputs.length) {
      return;
    }

    const payload = inputs.map((input) => {
      const row: Record<string, unknown> = {
        CONTACT_ID: input.contactId,
      };

      if (input.companyNameEmbedding !== undefined) {
        row.COMPANY_NAME_EMBEDDING =
          input.companyNameEmbedding === null
            ? null
            : serializePgVector(input.companyNameEmbedding);
      }

      if (input.fullNameEmbedding !== undefined) {
        row.FULL_NAME_EMBEDDING =
          input.fullNameEmbedding === null
            ? null
            : serializePgVector(input.fullNameEmbedding);
      }

      return row;
    });

    await this.baseQuery().insert(payload).onConflict('CONTACT_ID').merge();
  }

  private getDb() {
    return this.knex();
  }

  private baseQuery() {
    return this.getDb().withSchema(this.schemaName).table(this.tableName);
  }

  searchByCompanyNameEmbedding(
    vector: EmbeddingVector,
    limit = 10,
  ): Promise<VectorSimilarityMatch<ContactEmbedding>[]> {
    return this.searchByVectorColumn('COMPANY_NAME_EMBEDDING', vector, limit);
  }

  searchByFullNameEmbedding(
    vector: EmbeddingVector,
    limit = 10,
  ): Promise<VectorSimilarityMatch<ContactEmbedding>[]> {
    return this.searchByVectorColumn('FULL_NAME_EMBEDDING', vector, limit);
  }

  private async searchByVectorColumn(
    columnName: 'COMPANY_NAME_EMBEDDING' | 'FULL_NAME_EMBEDDING',
    vector: EmbeddingVector,
    limit: number,
  ): Promise<VectorSimilarityMatch<ContactEmbedding>[]> {
    const serializedVector = serializePgVector(vector);
    const rows = await this.baseQuery()
      .select({
        contactId: 'CONTACT_ID',
        companyNameEmbedding: 'COMPANY_NAME_EMBEDDING',
        fullNameEmbedding: 'FULL_NAME_EMBEDDING',
      })
      .select(
        this.getDb().raw('?? <=> ?::vector as distance', [
          columnName,
          serializedVector,
        ]),
      )
      .whereNotNull(columnName)
      .orderByRaw('?? <=> ?::vector asc', [columnName, serializedVector])
      .limit(limit);

    return rows.map(({ distance, ...record }) => ({
      record: this.mapRow(record),
      distance: Number(distance),
    }));
  }

  private mapRow(row: Record<string, unknown>): ContactEmbedding {
    return {
      contactId: Number(row.contactId),
      companyNameEmbedding: parsePgVector(
        row.companyNameEmbedding as string | EmbeddingVector | null,
      ),
      fullNameEmbedding: parsePgVector(
        row.fullNameEmbedding as string | EmbeddingVector | null,
      ),
    };
  }
}
