import { TenantModel } from '@/modules/System/models/TenantModel';
import { FsMigrations as FsMigrationsSource } from './FsMigrations';

/**
 * ПУСТАЯ ЗАГЛУШКА, ПРЕДЛОЖЕНА К УДАЛЕНИЮ.
 *
 * Совпадает по имени с настоящим классом `FsMigrations` из соседнего
 * файла и подменяла его в настройках: из-за этого источник миграций не
 * сходился сам с собой при проверке типов. Настройки ниже теперь
 * ссылаются на настоящий класс. Сам перечень оставлен — удаление кода
 * решает владелец.
 */
export interface FsMigrations {}

export interface ISeederConfig {
  tableName: string;
  // Настоящий источник миграций — класс из соседнего файла, а не пустая
  // заглушка с тем же именем выше.
  migrationSource: FsMigrationsSource;
  schemaName?: string;
  loadExtensions: string[];
}

export interface MigrateItem {
  file: string;
  directory: string;
}

export interface SeedMigrationContext {
  i18n: any;
  tenant: TenantModel;
}
