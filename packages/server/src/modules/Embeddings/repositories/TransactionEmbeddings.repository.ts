import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { ConfigService } from '@nestjs/config';
import { EmbeddingsKnexConnection } from '../Embeddings.constants';
import {
  EmbeddingVector,
  TransactionEmbedding,
  TransactionEmbeddingUpsertInput,
  VectorSimilarityMatch,
} from '../types/Embeddings.types';
import { parsePgVector, serializePgVector } from '../utils/pgvector';

@Injectable()
export class TransactionEmbeddingsRepository {
  private readonly tableName = 'TRANSACTIONS_EMBED';
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
        "TRANSACTION_ID" bigint PRIMARY KEY,
        "NOTE_EMBEDDING" vector(${this.dimensions})
      )`,
    );

    // if (this.dimensions <= 2000) {
    //   await db.raw(
    //     `CREATE INDEX IF NOT EXISTS transactions_embed_note_hnsw_idx
    //      ON "${this.schemaName}"."${this.tableName}"
    //      USING hnsw ("NOTE_EMBEDDING" vector_cosine_ops)`,
    //   );
    // }
  }

  async findByTransactionId(
    transactionId: number,
  ): Promise<TransactionEmbedding | undefined> {
    const row = await this.baseQuery()
      .select({
        transactionId: 'TRANSACTION_ID',
        noteEmbedding: 'NOTE_EMBEDDING',
      })
      .where('TRANSACTION_ID', transactionId)
      .first();

    return row ? this.mapRow(row) : undefined;
  }

  async findPendingTransactionIds(
    transactionIds: number[],
  ): Promise<Set<number>> {
    if (!transactionIds.length) {
      return new Set();
    }

    const rows = await this.baseQuery()
      .select('TRANSACTION_ID')
      .whereIn('TRANSACTION_ID', transactionIds)
      .whereNull('NOTE_EMBEDDING');

    const pendingIds = new Set(rows.map((row) => Number(row.TRANSACTION_ID)));
    const existingIds = new Set(
      (
        await this.baseQuery()
          .select('TRANSACTION_ID')
          .whereIn('TRANSACTION_ID', transactionIds)
      ).map((row) => Number(row.TRANSACTION_ID)),
    );

    for (const transactionId of transactionIds) {
      if (!existingIds.has(transactionId)) {
        pendingIds.add(transactionId);
      }
    }

    return pendingIds;
  }

  async upsert(input: TransactionEmbeddingUpsertInput): Promise<void> {
    await this.upsertMany([input]);
  }

  async upsertMany(inputs: TransactionEmbeddingUpsertInput[]): Promise<void> {
    if (!inputs.length) {
      return;
    }

    const payload = inputs.map((input) => {
      const row: Record<string, unknown> = {
        TRANSACTION_ID: input.transactionId,
      };

      if (input.noteEmbedding !== undefined) {
        row.NOTE_EMBEDDING =
          input.noteEmbedding === null
            ? null
            : serializePgVector(input.noteEmbedding);
      }

      return row;
    });

    await this.baseQuery().insert(payload).onConflict('TRANSACTION_ID').merge();
  }

  private getDb() {
    return this.knex();
  }

  private baseQuery() {
    return this.getDb().withSchema(this.schemaName).table(this.tableName);
  }

  async searchByNoteEmbedding(
    vector: EmbeddingVector,
    limit = 10,
  ): Promise<VectorSimilarityMatch<TransactionEmbedding>[]> {
    const serializedVector = serializePgVector(vector);
    const rows = await this.baseQuery()
      .select({
        transactionId: 'TRANSACTION_ID',
        noteEmbedding: 'NOTE_EMBEDDING',
      })
      .select(
        this.getDb().raw('?? <=> ?::vector as distance', [
          'NOTE_EMBEDDING',
          serializedVector,
        ]),
      )
      .whereNotNull('NOTE_EMBEDDING')
      .orderByRaw('?? <=> ?::vector asc', [
        'NOTE_EMBEDDING',
        serializedVector,
      ])
      .limit(limit);

    return rows.map(({ distance, ...record }) => ({
      record: this.mapRow(record),
      distance: Number(distance),
    }));
  }

  private mapRow(row: Record<string, unknown>): TransactionEmbedding {
    return {
      transactionId: Number(row.transactionId),
      noteEmbedding: parsePgVector(
        row.noteEmbedding as string | EmbeddingVector | null,
      ),
    };
  }
}
