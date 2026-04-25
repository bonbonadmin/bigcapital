import { Injectable } from '@nestjs/common';
import { UploadBillImage } from './UploadBillImage.service';
import { UploadBillImageDto } from './dtos/UploadBillImage.dto';
import { BillImagesQueueService } from './BillImagesQueue.service';
import { BillImagesProcessService } from './BillImagesProcess.service';

@Injectable()
export class BillImagesApplication {
  constructor(
    private readonly uploadBillImageService: UploadBillImage,
    private readonly billImagesQueueService: BillImagesQueueService,
    private readonly billImagesProcessService: BillImagesProcessService,
  ) {}

  public uploadBillImage(
    file: Express.Multer.File,
    uploadBillImageDto: UploadBillImageDto,
  ) {
    return this.uploadBillImageService.upload(file, uploadBillImageDto);
  }

  public getSummary() {
    return this.billImagesProcessService.getSummary();
  }

  public enqueuePendingMapProcessing() {
    return this.billImagesQueueService.enqueuePendingMapProcessing();
  }

  public getNextReview() {
    return this.billImagesProcessService.getNextReview();
  }

  public getReviewById(id: number) {
    return this.billImagesProcessService.getReviewById(id);
  }

  public markPublished(id: number) {
    return this.billImagesProcessService.markPublished(id);
  }
}
