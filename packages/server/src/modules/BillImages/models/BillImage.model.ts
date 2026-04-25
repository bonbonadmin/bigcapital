import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class BillImage extends TenantBaseModel {
  public s3Link!: string;
  public bankAccountId!: number | null;
  public apId!: number | null;
  public ocrText!: string | null;
  public billData!: string | null;
  public ocrStatus!: string;
  public mappingStatus!: string;
  public publishStatus!: string;
  public ocrProcessedAt!: string | null;
  public mappingProcessedAt!: string | null;
  public publishAt!: string | null;
  public lastError!: string | null;
  public createdAt!: string;
  public updatedAt!: string;

  static get tableName() {
    return 'billImage';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }
}
