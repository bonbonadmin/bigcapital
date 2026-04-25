import { registerAs } from '@nestjs/config';

const optionalEnv = (value?: string) => {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
};

export default registerAs('s3', () => ({
  region: process.env.S3_REGION || 'US',
  accessKeyId: optionalEnv(process.env.S3_ACCESS_KEY_ID),
  secretAccessKey: optionalEnv(process.env.S3_SECRET_ACCESS_KEY),
  endpoint: optionalEnv(process.env.S3_ENDPOINT),
  bucket: optionalEnv(process.env.S3_BUCKET),
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
}));
