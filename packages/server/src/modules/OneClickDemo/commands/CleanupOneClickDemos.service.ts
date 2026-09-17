import * as moment from 'moment';
import { Knex } from 'knex';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3_CLIENT } from '@/modules/S3/S3.module';
import { OneClickDemo } from '@/modules/System/models/OneClickDemo.model';
import { SystemUser } from '@/modules/System/models/SystemUser';
import { TenantModel } from '@/modules/System/models/TenantModel';
import { TenantMetadata } from '@/modules/System/models/TenantMetadataModel';
import { PlanSubscription } from '@/modules/Subscription/models/PlanSubscription';
import { SystemKnexConnection } from '@/modules/System/SystemDB/SystemDB.constants';
import { sanitizeDatabaseName } from '@/utils/sanitize-database-name';

@Injectable()
export class CleanupOneClickDemosService {
  constructor(
    private readonly configService: ConfigService,

    @Inject(SystemKnexConnection)
    private readonly systemKnex: Knex,

    @Inject(OneClickDemo.name)
    private readonly oneClickDemoModel: typeof OneClickDemo,

    @Inject(TenantModel.name)
    private readonly tenantModel: typeof TenantModel,

    @Inject(TenantMetadata.name)
    private readonly tenantMetadataModel: typeof TenantMetadata,

    @Inject(SystemUser.name)
    private readonly systemUserModel: typeof SystemUser,

    @Inject(PlanSubscription.name)
    private readonly planSubscriptionModel: typeof PlanSubscription,

    @Inject(S3_CLIENT)
    private readonly s3: S3Client,
  ) {}

  /**
   * Убирает демо-организации старше срока жизни (Д2 карты v18).
   *
   * Каждое демо — отдельная база данных и отдельный пользователь. Без
   * уборки они копятся вечно: сотня «посмотревших» — сотня баз.
   *
   * @returns {Promise<number>} Сколько демо убрано.
   */
  public async cleanupExpiredDemos(): Promise<number> {
    const ttlHours = Number(
      this.configService.get('oneClickDemo.ttlHours') ?? 24,
    );
    const expiredBefore = moment()
      .subtract(ttlHours, 'hours')
      .format('YYYY-MM-DD HH:mm:ss');

    const expired = await this.oneClickDemoModel
      .query()
      .where('createdAt', '<', expiredBefore);

    let removed = 0;

    for (const demo of expired) {
      try {
        await this.removeDemo(demo);
        removed += 1;
      } catch (error) {
        // Одно застрявшее демо не должно останавливать уборку остальных.
        console.error(
          `Failed to cleanup the one-click demo #${demo.id}:`,
          error,
        );
      }
    }
    return removed;
  }

  /**
   * Убирает одно демо: базу организации, её строки в системной базе и
   * самого демо-пользователя.
   */
  private async removeDemo(demo: OneClickDemo): Promise<void> {
    const tenant = await this.tenantModel.query().findById(demo.tenantId);

    if (tenant) {
      // Файлы — до базы: список вложений живёт в базе, но ключи в хранилище
      // и так начинаются с номера организации, поэтому база не нужна.
      await this.deleteTenantFiles(tenant.organizationId);
      await this.dropTenantDatabase(tenant.organizationId);

      // Порядок важен: подписка и метаданные держат тенанта по внешнему
      // ключу — тот же урок, что при удалении организации вручную (С3 v14).
      await this.planSubscriptionModel
        .query()
        .delete()
        .where({ tenantId: tenant.id });
      await this.tenantMetadataModel
        .query()
        .delete()
        .where({ tenantId: tenant.id });
    }
    // Запись демо удаляем ДО пользователя: она ссылается на него.
    await this.oneClickDemoModel.query().deleteById(demo.id);

    if (tenant) {
      await this.tenantModel.query().deleteById(tenant.id);
    }
    // Демо-пользователь заведён только ради этого демо и больше нигде не
    // нужен: он не может войти иначе как по ключу демо.
    await this.systemUserModel.query().deleteById(demo.userId);
  }

  /**
   * Удаляет файлы организации из хранилища.
   *
   * Каждое вложение лежит под ключом `<организация>/<uuid>` (см. раздачу
   * ключей в `Attachment.module.ts`), поэтому файлы демо находятся по
   * префиксу. Раньше уборка сносила базу, а файлы оставались навсегда:
   * сотня «посмотревших» — сотня папок мусора (вопрос 19 карт v14–v17,
   * закрыт для демо в Д4 карты v86).
   *
   * Сбой хранилища уборку не останавливает: базу и записи всё равно надо
   * убрать, а незачищенные файлы видны по префиксу и доберутся в другой раз.
   */
  private async deleteTenantFiles(organizationId: string): Promise<void> {
    const bucket = this.configService.get('s3.bucket');
    if (!bucket) return;

    const prefix = `${organizationId}/`;
    let continuationToken: string | undefined;

    try {
      do {
        const listed = await this.s3.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );
        const keys = (listed.Contents ?? [])
          .map((object) => object.Key)
          .filter((key): key is string => Boolean(key));

        if (keys.length > 0) {
          await this.s3.send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
            }),
          );
        }
        continuationToken = listed.IsTruncated
          ? listed.NextContinuationToken
          : undefined;
      } while (continuationToken);
    } catch (error) {
      console.error(
        `Failed to delete the files of the one-click demo ${organizationId}:`,
        error,
      );
    }
  }

  /**
   * Удаляет базу данных организации.
   *
   * Имя собираем сами, а не через `TenantDBManager`: тот работает с
   * «текущей» организацией из контекста запроса, а уборка идёт по
   * расписанию, без всякого запроса.
   */
  private async dropTenantDatabase(organizationId: string): Promise<void> {
    const prefix = this.configService.get('tenantDatabase.dbNamePrefix');
    const databaseName = sanitizeDatabaseName(`${prefix}${organizationId}`);

    await this.systemKnex.raw(`DROP DATABASE IF EXISTS ${databaseName}`);
  }
}
