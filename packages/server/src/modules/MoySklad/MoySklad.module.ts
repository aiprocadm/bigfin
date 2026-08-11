// © 2026 Bigfin
import { Module } from '@nestjs/common';
import { MoySkladController } from './MoySklad.controller';
import { MoySkladApplication } from './MoySklad.application';
import { MoyskladSettingsService } from './MoyskladSettings.service';
import { MoyskladApiService } from './MoyskladApi.service';
import { FeaturesModule } from '@/modules/Features/Features.module';
import { ItemsModule } from '@/modules/Items/Items.module';
import { ImportMoyskladProductsService } from './commands/ImportMoyskladProducts.service';
import { RolesModule } from '../Roles/Roles.module';

/**
 * ㉛ Интеграция МойСклад: pull-превью товаров и продаж плюс импорт справочника
 * товаров с себестоимостью в карточки Bigfin. За флагом `moysklad`.
 * Идемпотентность импорта — таблица `moysklad_import_links`.
 */
@Module({
  imports: [
    // Ради стражей прав на контроллере.
    RolesModule,FeaturesModule, ItemsModule],
  controllers: [MoySkladController],
  providers: [
    MoySkladApplication,
    MoyskladSettingsService,
    MoyskladApiService,
    ImportMoyskladProductsService,
  ],
})
export class MoySkladModule {}
