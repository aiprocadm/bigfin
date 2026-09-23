import { Inject, Injectable } from '@nestjs/common';
import {
  IBankRuleEventEditedPayload,
  IBankRuleEventEditingPayload,
  IEditBankRuleDTO,
} from '../types';
import { BankRule } from '../models/BankRule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { events } from '@/common/events/events';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { transformBankRuleDTO } from '../utils/transformBankRuleDTO';
import { CommandBankRuleValidatorService } from './CommandBankRuleValidator.service';
import { EditBankRuleDto } from '../dtos/BankRule.dto';
import { ModelObject } from 'objection';

@Injectable()
export class EditBankRuleService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly eventPublisher: EventEmitter2,
    private readonly validator: CommandBankRuleValidatorService,

    @Inject(BankRule.name)
    private bankRuleModel: TenantModelProxy<typeof BankRule>,
  ) {}

  /**
   * Transforms the given edit bank rule dto to model object.
   * @param editDTO
   * @returns
   */
  private transformDTO(editDTO: EditBankRuleDto): ModelObject<BankRule> {
    // Поля чужого типа обнуляются, строки разбиения — только у разбиения.
    return transformBankRuleDTO(editDTO) as unknown as ModelObject<BankRule>;
  }

  /**
   * Edits the given bank rule.
   * @param {number} ruleId -
   * @param {IEditBankRuleDTO} editBankDTO
   */
  public async editBankRule(ruleId: number, editRuleDTO: EditBankRuleDto) {
    const oldBankRule = await this.bankRuleModel()
      .query()
      .findById(ruleId)
      .withGraphFetched('conditions')
      .throwIfNotFound();

    await this.validator.validate(editRuleDTO);
    const tranformDTO = this.transformDTO(editRuleDTO);

    return this.uow.withTransaction(async (trx) => {
      // Triggers `onBankRuleEditing` event.
      await this.eventPublisher.emitAsync(events.bankRules.onEditing, {
        oldBankRule,
        ruleId,
        editRuleDTO,
        trx,
      } as IBankRuleEventEditingPayload);

      // Updates the given bank rule.
      const bankRule = await this.bankRuleModel()
        .query(trx)
        .upsertGraphAndFetch({
          ...tranformDTO,
          id: ruleId,
        });
      // Triggers `onBankRuleEdited` event.
      await this.eventPublisher.emitAsync(events.bankRules.onEdited, {
        oldBankRule,
        bankRule,
        editRuleDTO,
        trx,
      } as IBankRuleEventEditedPayload);
    });
  }
}
