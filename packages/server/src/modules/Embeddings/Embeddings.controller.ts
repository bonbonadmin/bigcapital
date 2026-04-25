import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorizationGuard } from '../Roles/Authorization.guard';
import { PermissionGuard } from '../Roles/Permission.guard';
import { RequirePermission } from '../Roles/RequirePermission.decorator';
import { AbilitySubject } from '../Roles/Roles.types';
import { PreferencesAction } from '../Settings/Settings.types';
import { EmbeddingsQueueService } from './EmbeddingsQueue.service';
import { EmbeddingsJobName } from './_types';

@Controller('settings/ai')
@ApiTags('Settings AI')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class EmbeddingsController {
  constructor(
    private readonly embeddingsQueueService: EmbeddingsQueueService,
  ) {}

  @Post('embed-transactions')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Queue a full transaction embeddings sync.' })
  async embedTransactions() {
    return this.embeddingsQueueService.enqueue(
      EmbeddingsJobName.EmbedTransactions,
    );
  }

  @Post('embed-vendors')
  @RequirePermission(PreferencesAction.Mutate, AbilitySubject.Preferences)
  @ApiOperation({ summary: 'Queue a full vendor embeddings sync.' })
  async embedVendors() {
    return this.embeddingsQueueService.enqueue(EmbeddingsJobName.EmbedVendors);
  }
}
