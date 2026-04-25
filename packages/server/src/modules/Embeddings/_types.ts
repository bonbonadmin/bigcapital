export const EmbeddingsQueue = 'EMBEDDINGS_QUEUE';

export enum EmbeddingsJobName {
  EmbedTransactions = 'EMBED_TRANSACTIONS',
  EmbedVendors = 'EMBED_VENDORS',
}

export interface EmbeddingsJobPayload {
  organizationId: string;
  userId: number;
}
