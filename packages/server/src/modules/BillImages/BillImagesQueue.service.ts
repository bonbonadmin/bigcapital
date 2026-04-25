import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { TenancyContext } from '../Tenancy/TenancyContext.service';
import { BILL_IMAGES_QUEUE, BillImagesJobName } from './BillImages.constants';

interface BillImagesJobPayload {
  organizationId: string;
  userId: number;
}

@Injectable()
export class BillImagesQueueService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tenancyContext: TenancyContext,
    @InjectQueue(BILL_IMAGES_QUEUE) private readonly billImagesQueue: Queue,
  ) {}

  async enqueuePendingMapProcessing() {
    this.assertConfiguration();

    const payload =
      (await this.tenancyContext.getTenantJobPayload()) as BillImagesJobPayload;

    const job = await this.billImagesQueue.add(
      BillImagesJobName.ProcessPendingMap,
      payload,
      {
        removeOnComplete: 25,
        removeOnFail: 50,
      },
    );

    return {
      queued: true,
      jobId: job.id,
      type: BillImagesJobName.ProcessPendingMap,
    };
  }

  private assertConfiguration() {
    const requiredConfigKeys = [
      ['aiEmbeddings.apiKey', 'OPENAI_API_KEY'],
      ['billImageAi.runpodApiKey', 'BILL_IMAGE_RUNPOD_API_KEY'],
      ['billImageAi.runpodEndpointId', 'BILL_IMAGE_RUNPOD_ENDPOINT_ID'],
      ['embeddingsDatabase.host', 'PGVECTOR_DB_HOST'],
      ['embeddingsDatabase.user', 'PGVECTOR_DB_USER'],
      ['embeddingsDatabase.password', 'PGVECTOR_DB_PASSWORD'],
    ];

    const missingKeys = requiredConfigKeys
      .filter(([configKey]) => !this.configService.get<string>(configKey))
      .map(([, envKey]) => envKey);

    if (missingKeys.length > 0) {
      throw new Error(
        `Missing bill image mapping configuration: ${missingKeys.join(', ')}`,
      );
    }
  }
}
