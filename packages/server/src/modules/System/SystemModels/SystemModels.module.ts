import { Knex } from 'knex';
import { Model } from 'objection';
import { Global, Module } from '@nestjs/common';
import { PlanSubscription } from '@/modules/Subscription/models/PlanSubscription';
import { TenantModel } from '@/modules/System/models/TenantModel';
import { SystemKnexConnection } from '../SystemDB/SystemDB.constants';
import { SystemModelsConnection } from './SystemModels.constants';
import { SystemUser } from '../models/SystemUser';
import { TenantMetadata } from '../models/TenantMetadataModel';
import { UserTenant } from '../models/UserTenant.model';
import { OneClickDemo } from '../models/OneClickDemo.model';
import { ApiToken } from '../models/ApiToken.model';
import { TenantRepository } from '../repositories/Tenant.repository';

const models = [
  SystemUser,
  PlanSubscription,
  TenantModel,
  TenantMetadata,
  UserTenant,
  OneClickDemo,
  // Токены публичного API (этап 15): по токену ещё только предстоит
  // узнать организацию, поэтому таблица общая, а не тенантная.
  ApiToken,
];

const modelProviders = models.map((model) => {
  return {
    provide: model.name,
    useValue: model,
  };
});

export const InjectSystemModel = (model: typeof Model) => ({
  useValue: model,
  provide: model.name,
});

const providers = [
  ...modelProviders,
  {
    provide: SystemModelsConnection,
    inject: [SystemKnexConnection],
    useFactory: async (systemKnex: Knex) => {
      Model.knex(systemKnex);
    },
  },
];

@Global()
@Module({
  providers: [...providers, TenantRepository],
  exports: [...providers, TenantRepository],
})
export class SystemModelsModule {}
