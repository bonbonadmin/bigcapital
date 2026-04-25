import { EmbeddingVector } from '../types/Embeddings.types';

export const serializePgVector = (vector: EmbeddingVector): string => {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('Vector must be a non-empty array.');
  }

  for (const value of vector) {
    if (!Number.isFinite(value)) {
      throw new Error('Vector values must be finite numbers.');
    }
  }

  return `[${vector.join(',')}]`;
};

export const parsePgVector = (
  value: EmbeddingVector | string | null,
): EmbeddingVector | null => {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue.startsWith('[') || !normalizedValue.endsWith(']')) {
    throw new Error('Invalid pgvector value received from PostgreSQL.');
  }

  const content = normalizedValue.slice(1, -1).trim();

  if (!content) {
    return [];
  }

  return content.split(',').map((item) => Number(item.trim()));
};
