import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RegisterTenancyModel } from '@/modules/Tenancy/TenancyModels/Tenancy.module';
import { S3Module } from '@/modules/S3/S3.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';
import { BillImagesApplication } from './BillImagesApplication.service';
import { BillImagesController } from './BillImages.controller';
import { UploadBillImage } from './UploadBillImage.service';
import { BillImage } from './models/BillImage.model';
import { BILL_IMAGES_QUEUE } from './BillImages.constants';
import { BillImagesQueueService } from './BillImagesQueue.service';
import { BillImagesProcessService } from './BillImagesProcess.service';
import { BillImagesProcessor } from './jobs/BillImages.processor';

const models = [RegisterTenancyModel(BillImage)];

@Module({
  imports: [
    S3Module,
    TenancyModule,
    BullModule.registerQueue({ name: BILL_IMAGES_QUEUE }),
    ...models,
  ],
  controllers: [BillImagesController],
  providers: [
    BillImagesApplication,
    UploadBillImage,
    BillImagesQueueService,
    BillImagesProcessService,
    BillImagesProcessor,
  ],
})
export class BillImagesModule {}
