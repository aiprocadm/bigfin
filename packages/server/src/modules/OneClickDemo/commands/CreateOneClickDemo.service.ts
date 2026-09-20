import * as crypto from 'crypto';
import * as moment from 'moment';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Knex } from 'knex';
import { SystemUser } from '@/modules/System/models/SystemUser';
import { UserTenant } from '@/modules/System/models/UserTenant.model';
import { OneClickDemo } from '@/modules/System/models/OneClickDemo.model';
import { TenantRepository } from '@/modules/System/repositories/Tenant.repository';
import { SystemKnexConnection } from '@/modules/System/SystemDB/SystemDB.constants';
import { transformBuildDto } from '@/modules/Organization/Organization.utils';
import {
  OrganizationBuildQueue,
  OrganizationBuildQueueJob,
  OrganizationBuildQueueJobPayload,
} from '@/modules/Organization/Organization.types';
import { hashPassword } from '@/modules/Auth/Auth.utils';
import { CreateOneClickDemoResult } from '../OneClickDemo.types';
import { OneClickDemoDisabledException } from '../exceptions/OneClickDemo.exceptions';
import { parseDemoIndustry } from '../data';

@Injectable()
export class CreateOneClickDemoService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tenantRepository: TenantRepository,

    @Inject(SystemKnexConnection)
    private readonly systemKnex: Knex,

    @Inject(SystemUser.name)
    private readonly systemUserModel: typeof SystemUser,

    @Inject(UserTenant.name)
    private readonly userTenantModel: typeof UserTenant,

    @Inject(OneClickDemo.name)
    private readonly oneClickDemoModel: typeof OneClickDemo,

    @InjectQueue(OrganizationBuildQueue)
    private readonly organizationBuildQueue: Queue,
  ) {}

  /**
   * Создаёт демо-организацию «в один щелчок»: пользователя со случайным
   * паролем, тенанта на русских настройках и джоб постройки базы.
   * @returns {Promise<CreateOneClickDemoResult>}
   */
  public async createOneClickDemo(
    industry?: string,
  ): Promise<CreateOneClickDemoResult> {
    // Ручка публичная и создаёт тенанта — работает только при явно
    // включённом флаге (Д1 карты v18).
    if (!this.configService.get('oneClickDemo.enable')) {
      throw new OneClickDemoDisabledException();
    }
    // Отрасль сводится к известной ЗДЕСЬ, а не при наполнении: в базе
    // должно лежать то, что человек увидит, а не то, что он написал.
    const demoIndustry = parseDemoIndustry(industry);

    const demoKey = crypto.randomBytes(24).toString('hex');
    const email = `demo-${crypto.randomBytes(6).toString('hex')}@demo.bigfin.app`;
    // Пароль никому не показывается: вход в демо идёт по ключу. Он всё равно
    // случайный и длинный, чтобы обычный вход по паролю был невозможен.
    const password = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await hashPassword(password);

    const buildDto = transformBuildDto({
      name: 'Демо-организация',
      location: 'RU',
      baseCurrency: 'RUB',
      timezone: 'Europe/Moscow',
      fiscalYear: 'January',
      language: 'ru',
    } as any);

    const { tenant, user } = await this.systemKnex.transaction(async (trx) => {
      const tenant = await this.tenantRepository.createWithUniqueOrgId(
        undefined,
        trx,
      );
      const user = await this.systemUserModel.query(trx).insert({
        firstName: 'Демо',
        lastName: 'Пользователь',
        email,
        password: hashedPassword,
        active: true,
        verified: true,
        verifyToken: '',
        tenantId: tenant.id,
        inviteAcceptedAt: moment().format('YYYY-MM-DD'),
      } as any);

      await this.userTenantModel.query(trx).insert({
        userId: user.id,
        tenantId: tenant.id,
        role: 'owner',
      });
      await this.tenantRepository.saveMetadata(tenant.id, buildDto, trx);

      return { tenant, user };
    });

    // Джоб ставится ПОСЛЕ транзакции: пока она не зафиксирована, обработчик
    // не увидит ни тенанта, ни пользователя.
    const jobMeta = await this.organizationBuildQueue.add(
      OrganizationBuildQueueJob,
      {
        organizationId: tenant.organizationId,
        userId: user.id,
        buildDto,
      } as OrganizationBuildQueueJobPayload,
    );

    await this.oneClickDemoModel.query().insert({
      key: demoKey,
      tenantId: tenant.id,
      userId: user.id,
      buildJobId: jobMeta.id!,
      industry: demoIndustry,
    } as any);

    return {
      demoId: demoKey,
      email,
      buildJob: { jobId: jobMeta.id! },
    };
  }
}
