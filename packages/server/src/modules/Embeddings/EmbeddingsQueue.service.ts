import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmbeddingsJobName, EmbeddingsJobPayload, EmbeddingsQueue } from './_types';
import { TenancyContext } from '../Tenancy/TenancyContext.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingsQueueService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tenancyContext: TenancyContext,
    @InjectQueue(EmbeddingsQueue) private readonly embeddingsQueue: Queue,
  ) {}

  async enqueue(jobName: EmbeddingsJobName) {
    this.assertConfiguration();

    const payload =
      (await this.tenancyContext.getTenantJobPayload()) as EmbeddingsJobPayload;

    const job = await this.embeddingsQueue.add(jobName, payload, {
      removeOnComplete: 25,
      removeOnFail: 50,
    });

    return {
      queued: true,
      jobId: job.id,
      type: jobName,
    };
  }

  private assertConfiguration() {
    const requiredConfigKeys = [
      ['aiEmbeddings.apiKey', 'OPENAI_API_KEY'],
      ['embeddingsDatabase.host', 'PGVECTOR_DB_HOST'],
      ['embeddingsDatabase.user', 'PGVECTOR_DB_USER'],
      ['embeddingsDatabase.password', 'PGVECTOR_DB_PASSWORD'],
    ];

    const missingKeys = requiredConfigKeys
      .filter(([configKey]) => !this.configService.get<string>(configKey))
      .map(([, envKey]) => envKey);

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing AI embedding configuration: ${missingKeys.join(', ')}`,
      );
    }
  }
}
