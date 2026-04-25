import * as multer from 'multer';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor as NestFileInterceptor } from '@nestjs/platform-express';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { ExpenseAction } from '@/modules/Expenses/Expenses.types';
import { BillImagesApplication } from './BillImagesApplication.service';
import { UploadBillImageDto } from './dtos/UploadBillImage.dto';

@Controller('expenses/bill-images')
@ApiTags('Bill Images')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class BillImagesController {
  constructor(
    private readonly billImagesApplication: BillImagesApplication,
  ) {}

  @Post()
  @HttpCode(200)
  @RequirePermission(ExpenseAction.Create, AbilitySubject.Expense)
  @UseInterceptors(
    NestFileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 25 * 1024 ** 2 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a bill image to S3 and create its record.' })
  @ApiBody({ type: UploadBillImageDto })
  @ApiResponse({
    status: 200,
    description: 'Bill image uploaded successfully.',
  })
  public async uploadBillImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadBillImageDto: UploadBillImageDto,
  ) {
    if (!file) {
      throw new BadRequestException({
        errorType: 'BILL_IMAGE_FILE_REQUIRED',
        message: 'No bill image file uploaded.',
      });
    }

    const data = await this.billImagesApplication.uploadBillImage(
      file,
      uploadBillImageDto,
    );

    return {
      status: 200,
      message: 'Bill image uploaded successfully.',
      data,
    };
  }

  @Get('summary')
  @HttpCode(200)
  @RequirePermission(ExpenseAction.Create, AbilitySubject.Expense)
  @ApiOperation({ summary: 'Retrieve upload bill mapping and review counts.' })
  @ApiResponse({
    status: 200,
    description: 'Bill image summary retrieved successfully.',
  })
  public async getSummary() {
    const data = await this.billImagesApplication.getSummary();

    return {
      status: 200,
      data,
    };
  }

  @Get('review-next')
  @HttpCode(200)
  @RequirePermission(ExpenseAction.Create, AbilitySubject.Expense)
  @ApiOperation({ summary: 'Retrieve the next pending bill image review item.' })
  public async getNextReview() {
    const data = await this.billImagesApplication.getNextReview();

    return {
      status: 200,
      data,
    };
  }

  @Get(':id/review')
  @HttpCode(200)
  @RequirePermission(ExpenseAction.Create, AbilitySubject.Expense)
  @ApiOperation({ summary: 'Retrieve a mapped bill image review item by id.' })
  public async getReviewById(@Param('id') id: number) {
    const data = await this.billImagesApplication.getReviewById(id);

    return {
      status: 200,
      data,
    };
  }

  @Post(':id/mark-published')
  @HttpCode(200)
  @RequirePermission(ExpenseAction.Create, AbilitySubject.Expense)
  @ApiOperation({ summary: 'Mark a reviewed bill image as published.' })
  public async markPublished(@Param('id') id: number) {
    const data = await this.billImagesApplication.markPublished(id);

    return {
      status: 200,
      data,
    };
  }

  @Post('process-map')
  @HttpCode(200)
  @RequirePermission(ExpenseAction.Create, AbilitySubject.Expense)
  @ApiOperation({ summary: 'Queue OCR and mapping for pending bill images.' })
  @ApiResponse({
    status: 200,
    description: 'Pending bill image processing queued successfully.',
  })
  public async processPendingMap() {
    const data = await this.billImagesApplication.enqueuePendingMapProcessing();

    return {
      status: 200,
      message: 'Bill image OCR and mapping queued successfully.',
      data,
    };
  }
}
