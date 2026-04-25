import { registerAs } from '@nestjs/config';

export default registerAs('aiEmbeddings', () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
  dimensions: parseInt(process.env.OPENAI_EMBEDDING_DIMENSIONS || '3072', 10),
  fetchBatchSize: parseInt(
    process.env.OPENAI_EMBEDDING_SYNC_FETCH_BATCH_SIZE || '200',
    10,
  ),
  embedBatchSize: parseInt(process.env.OPENAI_EMBEDDING_BATCH_SIZE || '64', 10),
}));
