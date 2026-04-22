import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { ItemAction } from '@/interfaces/Item';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { InventoryAssembliesService } from './InventoryAssemblies.service';
import { CreateInventoryAssemblyDto } from './dtos/InventoryAssembly.dto';

@Controller('/inventory-assemblies')
@ApiTags('Inventory Assemblies')
@ApiCommonHeaders()
@UseGuards(AuthorizationGuard, PermissionGuard)
export class InventoryAssembliesController {
  constructor(
    private readonly inventoryAssembliesService: InventoryAssembliesService,
  ) {}

  @Post()
  @RequirePermission(ItemAction.EDIT, AbilitySubject.Item)
  @ApiOperation({ summary: 'Builds inventory assembly items from components.' })
  async createInventoryAssembly(@Body() dto: CreateInventoryAssemblyDto) {
    const assembly =
      await this.inventoryAssembliesService.createInventoryAssembly(dto);

    return {
      id: assembly.id,
      message: 'The inventory assembly has been created successfully.',
    };
  }
}
