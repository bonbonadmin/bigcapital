export type EmbeddingVector = number[];

export interface ContactEmbedding {
  contactId: number;
  companyNameEmbedding: EmbeddingVector | null;
  fullNameEmbedding: EmbeddingVector | null;
}

export interface ContactEmbeddingUpsertInput {
  contactId: number;
  companyNameEmbedding?: EmbeddingVector | null;
  fullNameEmbedding?: EmbeddingVector | null;
}

export interface TransactionEmbedding {
  transactionId: number;
  noteEmbedding: EmbeddingVector | null;
}

export interface TransactionEmbeddingUpsertInput {
  transactionId: number;
  noteEmbedding?: EmbeddingVector | null;
}

export interface VectorSimilarityMatch<TRecord> {
  record: TRecord;
  distance: number;
}
