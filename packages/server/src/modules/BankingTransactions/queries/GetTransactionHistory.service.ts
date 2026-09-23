// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { Knex } from 'knex';
import { AuditLog } from '@/modules/EE/AuditLogs/models/AuditLog.model';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TENANCY_DB_CONNECTION } from '@/modules/Tenancy/TenancyDB/TenancyDB.constants';
import { buildTransactionHistory } from '../utils/transactionHistory';

/**
 * История изменений операции (FT-026 ТЗ-3): журнал действий по документу
 * плюс след автоправил денежной операции — одной лентой.
 *
 * След правил читается напрямую из таблицы: модели следа живут в модуле
 * правил, а подключить его сюда значило бы замкнуть модули в кольцо (так
 * же читает его и реестр).
 */
@Injectable()
export class GetTransactionHistoryService {
  constructor(
    @Inject(AuditLog.name)
    private readonly auditLogModel: TenantModelProxy<typeof AuditLog>,

    @Inject(TENANCY_DB_CONNECTION)
    private readonly tenantKnex: () => Knex,
  ) {}

  public async history(referenceType: string, referenceId: number) {
    // Денежные операции журнал пишет под своим субъектом.
    const subject = referenceType === 'CashflowTransaction' ? AbilitySubject.Cashflow : referenceType;
    const auditRows: any[] = await this.auditLogModel()
      .query()
      .where('subject', subject)
      .where('subjectId', referenceId)
      .withGraphFetched('tenantUser')
      .orderBy('id', 'desc')
      .limit(200);
    const ruleRows: any[] =
      referenceType === 'CashflowTransaction'
        ? await this.tenantKnex()('transaction_rule_applications as a')
            .leftJoin('bank_rules as r', 'r.id', 'a.rule_id')
            .where('a.transaction_id', referenceId)
            .select('a.id', 'a.applied_at', 'a.changes', 'r.name as rule_name')
            .orderBy('a.id', 'desc')
            .limit(200)
        : [];
    const normalized = ruleRows.map((row) => ({
      ...row,
      appliedAt: moment(row.appliedAt).format('YYYY-MM-DD HH:mm:ss'),
    }));
    // Время обоих источников — одной строкой: база отдаёт его датой, а
    // лента сортируется сравнением строк.
    const audit = auditRows.map((row) => ({
      ...row,
      createdAt: moment(row.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    }));
    return { items: buildTransactionHistory(audit, normalized) };
  }
}
