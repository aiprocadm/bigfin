import { ModelObject } from 'objection';
import { Knex } from 'knex';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IBankRuleEventCreatedPayload,
  IBankRuleEventCreatingPayload,
} from '../types';
import { UnitOfWork } from '../../Tenancy/TenancyDB/UnitOfWork.service';
import { events } from '@/common/events/events';
import { BankRule } from '../models/BankRule';
import { CreateBankRuleDto } from '../dtos/BankRule.dto';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { transformBankRuleDTO } from '../utils/transformBankRuleDTO';
import { CommandBankRuleValidatorService } from './CommandBankRuleValidator.service';

@Injectable()
export class CreateBankRuleService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly eventPublisher: EventEmitter2,
    private readonly validator: CommandBankRuleValidatorService,

    @Inject(BankRule.name)
    private readonly bankRuleModel: TenantModelProxy<typeof BankRule>,
  ) {}

  /**
   * Transforms the DTO to model.
   * @param {ICreateBankRuleDTO} createDTO
   */
  private transformDTO(createDTO: CreateBankRuleDto): ModelObject<BankRule> {
    // Поля чужого типа обнуляются, строки разбиения — только у разбиения.
    return transformBankRuleDTO(createDTO) as unknown as ModelObject<BankRule>;
  }

  /**
   * Creates a new bank rule.
   * @param {ICreateBankRuleDTO} createRuleDTO
   * @returns {Promise<BankRule>}
   */
  public async createBankRule(
    createRuleDTO: CreateBankRuleDto,
  ): Promise<BankRule> {
    await this.validator.validate(createRuleDTO);
    const transformDTO = this.transformDTO(createRuleDTO);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      // Triggers `onBankRuleCreating` event.
      await this.eventPublisher.emitAsync(events.bankRules.onCreating, {
        createRuleDTO,
        trx,
      } as IBankRuleEventCreatingPayload);

      const bankRule = await this.bankRuleModel()
        .query(trx)
        .upsertGraphAndFetch({
          ...transformDTO,
        });
      // Triggers `onBankRuleCreated` event.
      await this.eventPublisher.emitAsync(events.bankRules.onCreated, {
        createRuleDTO,
        bankRule,
        trx,
      } as IBankRuleEventCreatedPayload);

      return bankRule;
    });
  }
}
