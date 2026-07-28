import * as path from 'path';
import knex from 'knex';
import * as LRUCache from 'lru-cache';
import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { knexSnakeCaseMappers } from 'objection';
import { ClsModule, ClsService } from 'nestjs-cls';
import { ConfigService } from '@nestjs/config';
import { ExtensionAgnosticMigrationSource } from '@/libs/migration-seed/ExtensionAgnosticMigrationSource';
import { TENANCY_DB_CONNECTION } from './TenancyDB.constants';
import { UnitOfWork } from './UnitOfWork.service';

// Без max этот кэш растёт неограниченно: пул соединений каждой организации
// (до 7 PG-подключений) живёт до конца процесса. Ограничиваем число
// одновременно закэшированных пулов и закрываем (destroy) вытесненный пул,
// иначе при онбординге многих организаций соединения утекают.
// lru-cache@6: dispose вызывается как (key, value); noDisposeOnSet не даёт
// закрыть пул, который ещё может использоваться (редкая гонка двойного set).
const MAX_CACHED_TENANT_DB_POOLS = 100;
const lruCache = new LRUCache({
  max: MAX_CACHED_TENANT_DB_POOLS,
  noDisposeOnSet: true,
  dispose: (_database: string, knexInstance: any) => {
    if (knexInstance && typeof knexInstance.destroy === 'function') {
      Promise.resolve(knexInstance.destroy()).catch(() => undefined);
    }
  },
});

export const TenancyDatabaseProxyProvider = ClsModule.forFeatureAsync({
  provide: TENANCY_DB_CONNECTION,
  global: true,
  strict: true,
  inject: [ConfigService, ClsService],
  useFactory: async (configService: ConfigService, cls: ClsService) => () => {
    const organizationId = cls.get('organizationId');
    // Префикс берём из конфига (TENANT_DB_NAME_PERFIX), а не прошиваем в код.
    // Раньше здесь была строковая константа, и настройка учитывалась наполовину:
    // база организации СОЗДАВАЛАСЬ с настроенным префиксом, а подключались к ней
    // по прошитому — миграции падали с Unknown database, организация оставалась
    // с пустой базой. Проявляется у всех, кто менял префикс.
    const dbNamePrefix = configService.get('tenantDatabase.dbNamePrefix');
    const database = `${dbNamePrefix}${organizationId}`;
    const cachedInstance = lruCache.get(database);

    if (cachedInstance) {
      return cachedInstance;
    }
    const knexInstance = knex({
      client: configService.get('tenantDatabase.client'),
      connection: {
        host: configService.get('tenantDatabase.host'),
        port: Number(configService.get('tenantDatabase.port')),
        user: configService.get('tenantDatabase.user'),
        password: configService.get('tenantDatabase.password'),
        database,
        charset: 'utf8',
      },
      migrations: {
        // .ts-исходники (dev) vs .js-записи в журнале (наследие сборки) —
        // нормализуем расширение через ExtensionAgnosticMigrationSource, иначе
        // migrate.latest() локально не видит миграции либо пытается прогнать всё.
        migrationSource: new ExtensionAgnosticMigrationSource(
          path.resolve(configService.get('tenantDatabase.migrationsDir')),
        ),
      },
      seeds: {
        directory: configService.get('tenantDatabase.seedsDir'),
      },
      pool: { min: 0, max: 7 },
      ...knexSnakeCaseMappers({ upperCase: true }),
    });
    lruCache.set(database, knexInstance);

    return knexInstance;
  },
  type: 'function',
});

@Global()
@Module({
  imports: [TenancyDatabaseProxyProvider],
  providers: [UnitOfWork],
  exports: [UnitOfWork],
})
export class TenancyDatabaseModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    // Close every cached per-tenant database connection pool on shutdown.
    const instances: any[] = [];
    lruCache.forEach((instance: any) => instances.push(instance));
    await Promise.all(
      instances.map((knexInstance) =>
        knexInstance && typeof knexInstance.destroy === 'function'
          ? knexInstance.destroy()
          : undefined,
      ),
    );
  }
}
