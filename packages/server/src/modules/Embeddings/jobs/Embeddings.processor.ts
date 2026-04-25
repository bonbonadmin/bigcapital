import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Scope } from '@nestjs/common';
import { Job } from 'bullmq';
import { ClsService, UseCls } from 'nestjs-cls';
import { EmbeddingsJobName, EmbeddingsJobPayload, EmbeddingsQueue } from '../_types';
import { EmbeddingsSyncService } from '../EmbeddingsSync.service';

@Processor({
  name: EmbeddingsQueue,
  scope: Scope.REQUEST,
})
export class EmbeddingsProcessor extends WorkerHost {
  constructor(
    private readonly embeddingsSyncService: EmbeddingsSyncService,
    private readonly clsService: ClsService,
  ) {
    super();
  }

  @UseCls()
  async process(job: Job<EmbeddingsJobPayload>) {
    this.clsService.set('organizationId', job.data.organizationId);
    this.clsService.set('userId', job.data.userId);

    if (job.name === EmbeddingsJobName.EmbedTransactions) {
      return this.embeddingsSyncService.syncTransactions();
    }
    if (job.name === EmbeddingsJobName.EmbedVendors) {
      return this.embeddingsSyncService.syncVendors();
    }

    throw new Error(`Unknown embeddings job: ${job.name}`);
  }
}
