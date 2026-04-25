import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Scope } from '@nestjs/common';
import { Job } from 'bullmq';
import { ClsService, UseCls } from 'nestjs-cls';
import { BILL_IMAGES_QUEUE, BillImagesJobName } from '../BillImages.constants';
import { BillImagesProcessService } from '../BillImagesProcess.service';

interface BillImagesJobPayload {
  organizationId: string;
  userId: number;
}

@Processor({
  name: BILL_IMAGES_QUEUE,
  scope: Scope.REQUEST,
})
export class BillImagesProcessor extends WorkerHost {
  constructor(
    private readonly billImagesProcessService: BillImagesProcessService,
    private readonly clsService: ClsService,
  ) {
    super();
  }

  @UseCls()
  async process(job: Job<BillImagesJobPayload>) {
    this.clsService.set('organizationId', job.data.organizationId);
    this.clsService.set('userId', job.data.userId);

    if (job.name === BillImagesJobName.ProcessPendingMap) {
      return this.billImagesProcessService.processPendingBillImages();
    }

    throw new Error(`Unknown bill images job: ${job.name}`);
  }
}
