import { extname } from 'path';
import { randomUUID } from 'crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as moment from 'moment';
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { Account } from '@/modules/Accounts/models/Account.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { S3_CLIENT } from '@/modules/S3/S3.module';
import { ServiceError } from '@/modules/Items/ServiceError';
import { UploadBillImageDto } from './dtos/UploadBillImage.dto';
import {
  BILL_IMAGE_STATUSES,
  ERRORS,
  SUPPORTED_AP_ACCOUNT_TYPES,
  SUPPORTED_BANK_ACCOUNT_TYPES,
} from './BillImages.constants';
import { BillImage } from './models/BillImage.model';

@Injectable()
export class UploadBillImage {
  constructor(
    @Inject(BillImage.name)
    private readonly billImageModel: TenantModelProxy<typeof BillImage>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(S3_CLIENT)
    private readonly s3Client: S3Client,

    private readonly configService: ConfigService,
  ) {}

  public async upload(
    file: Express.Multer.File,
    uploadBillImageDto: UploadBillImageDto,
  ) {
    if (!file) {
      throw new ServiceError(
        ERRORS.FILE_REQUIRED,
        'Bill image file is required.',
      );
    }
    const isSupportedImage = file.mimetype?.startsWith('image/');
    const isSupportedPdf = file.mimetype === 'application/pdf';

    if (!isSupportedImage && !isSupportedPdf) {
      throw new ServiceError(
        ERRORS.FILE_INVALID_TYPE,
        'Only image and PDF files are supported.',
      );
    }

    const { bankAccountId = null, apId = null } = uploadBillImageDto;

    if (!bankAccountId && !apId) {
      throw new ServiceError(
        ERRORS.ACCOUNT_OR_AP_REQUIRED,
        'Choose a bank account or an accounts payable account before uploading.',
      );
    }

    if (bankAccountId) {
      const bankAccount = await this.accountModel().query().findById(bankAccountId);

      if (!bankAccount) {
        throw new ServiceError(
          ERRORS.BANK_ACCOUNT_NOT_FOUND,
          'The selected bank account was not found.',
          null,
          HttpStatus.NOT_FOUND,
        );
      }
      if (!SUPPORTED_BANK_ACCOUNT_TYPES.includes(bankAccount.accountType)) {
        throw new ServiceError(
          ERRORS.BANK_ACCOUNT_INVALID_TYPE,
          `The selected account must be a ${ACCOUNT_TYPE.BANK} account.`,
        );
      }
    }

    if (apId) {
      const payableAccount = await this.accountModel().query().findById(apId);

      if (!payableAccount) {
        throw new ServiceError(
          ERRORS.AP_ACCOUNT_NOT_FOUND,
          'The selected accounts payable account was not found.',
          null,
          HttpStatus.NOT_FOUND,
        );
      }
      if (!SUPPORTED_AP_ACCOUNT_TYPES.includes(payableAccount.accountType)) {
        throw new ServiceError(
          ERRORS.AP_ACCOUNT_INVALID_TYPE,
          'The selected account payable account must be an accounts payable account.',
        );
      }
    }

    const bucket = this.configService.get<string>('s3.bucket');
    const key = `bill_image/${randomUUID()}${extname(file.originalname || '')}`;
    const s3Link = `s3://${bucket}/${key}`;
    const timestamp = moment().format('YYYY/MM/DD HH:mm:ss');

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    try {
      return await this.billImageModel().query().insertAndFetch({
        s3Link,
        bankAccountId,
        apId,
        ocrText: null,
        billData: null,
        ocrStatus: BILL_IMAGE_STATUSES.PENDING,
        mappingStatus: BILL_IMAGE_STATUSES.PENDING,
        publishStatus: BILL_IMAGE_STATUSES.PENDING,
        ocrProcessedAt: null,
        mappingProcessedAt: null,
        publishAt: null,
        lastError: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    } catch (error) {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
      throw error;
    }
  }
}
