import { Module } from '@nestjs/common';
import { TenancyDatabaseModule } from '@/modules/Tenancy/TenancyDB/TenancyDB.module';
import { InventoryAssembliesController } from './InventoryAssemblies.controller';
import { InventoryAssembliesService } from './InventoryAssemblies.service';
import { InventoryCostModule } from '@/modules/InventoryCost/InventoryCost.module';
import { ItemsModule } from '@/modules/Items/Items.module';
import { LedgerModule } from '@/modules/Ledger/Ledger.module';
import { SettingsModule } from '@/modules/Settings/Settings.module';
import { TenancyModule } from '@/modules/Tenancy/Tenancy.module';

@Module({
  imports: [
    TenancyDatabaseModule,
    InventoryCostModule,
    ItemsModule,
    LedgerModule,
    SettingsModule,
    TenancyModule,
  ],
  controllers: [InventoryAssembliesController],
  providers: [InventoryAssembliesService],
})
export class InventoryAssembliesModule {}
