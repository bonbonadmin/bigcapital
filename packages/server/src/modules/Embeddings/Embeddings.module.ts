import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmbeddingsDatabaseModule } from './EmbeddingsDatabase.module';
import { ContactEmbeddingsRepository } from './repositories/ContactEmbeddings.repository';
import { TransactionEmbeddingsRepository } from './repositories/TransactionEmbeddings.repository';
import { EmbeddingsController } from './Embeddings.controller';
import { EmbeddingsQueue } from './_types';
import { EmbeddingsQueueService } from './EmbeddingsQueue.service';
import { EmbeddingsSyncService } from './EmbeddingsSync.service';
import { EmbeddingsProcessor } from './jobs/Embeddings.processor';
import { TenancyModule } from '../Tenancy/Tenancy.module';

@Global()
@Module({
  imports: [
    EmbeddingsDatabaseModule,
    TenancyModule,
    BullModule.registerQueue({ name: EmbeddingsQueue }),
  ],
  providers: [
    ContactEmbeddingsRepository,
    TransactionEmbeddingsRepository,
    EmbeddingsQueueService,
    EmbeddingsSyncService,
    EmbeddingsProcessor,
  ],
  exports: [
    ContactEmbeddingsRepository,
    TransactionEmbeddingsRepository,
    EmbeddingsQueueService,
    EmbeddingsSyncService,
  ],
  controllers: [EmbeddingsController],
})
export class EmbeddingsModule {}
