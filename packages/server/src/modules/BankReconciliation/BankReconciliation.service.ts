// © 2026 Bigfin
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as moment from 'moment';
import { ClsService } from 'nestjs-cls';

import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { BankConnectorsRegistry } from '@/modules/BankApiSync/connectors/BankConnectors.registry';
import { BankProviderId } from '@/modules/BankApiSync/connectors/BankProvider.types';
import { BankApiSyncSettingsService } from '@/modules/BankApiSync/BankApiSyncSettings.service';
import { CreateUncategorizedTransactionService } from '@/modules/BankingCategorize/commands/CreateUncategorizedTransaction.service';
import { TransactionsTrashService } from '@/modules/BankingTransactions/commands/TransactionsTrash.service';
import { BankTransaction } from '@/modules/BankingTransactions/models/BankTransaction';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { decodeStatementBuffer } from '@/modules/BankStatementImport/utils/decodeStatement';
import { parse1CStatement } from '@/modules/BankStatementImport/utils/parse1CStatement';
import { parseTableStatement } from '@/modules/BankStatementImport/utils/parseTableStatement';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { TenantUser } from '@/modules/Tenancy/TenancyModels/models/TenantUser.model';
import { Reconciliation } from './models/Reconciliation';
import { ReconciliationItem } from './models/ReconciliationItem';
import {
  DeletedLine,
  opsFrom1C,
  opsFromTable,
  OurLine,
  reconcile,
  reconciliationDiff,
  StatementOp,
} from './utils/reconcile';

export const RECONCILIATION_QUEUE = 'bank-reconciliation-queue';
export const RECONCILIATION_RUN_JOB = 'bank-reconciliation-run';
export const BANK_HOUSEKEEPING_JOB = 'bank-housekeeping';
/** История сверок хранится столько дней (FT-040). */
export const RECONCILIATION_RETENTION_DAYS = 180;

export const RECONCILIATION_ERRORS = {
  NOT_FOUND: 'RECONCILIATION_NOT_FOUND',
  NOT_CONNECTED: 'RECONCILIATION_BANK_NOT_CONNECTED',
  EMPTY_FILE: 'RECONCILIATION_FILE_EMPTY',
  WRONG_SIDE: 'RECONCILIATION_WRONG_SIDE',
  DOCUMENT_NOT_TRASHABLE: 'RECONCILIATION_DOCUMENT_NOT_TRASHABLE',
};

/** Денежные операции, где деньги ПРИХОДЯТ на свой счёт. */
const IN_TYPES = ['OwnerContribution', 'OtherIncome', 'TransferFromAccount'];

const now = () => moment().format('YYYY-MM-DD HH:mm:ss');
const day = (value: any) => moment(value).format('YYYY-MM-DD');
const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Сверка счёта с банком (FT-040, FT-041 ТЗ-3).
 *
 * «У НАС» — ВСЁ, ЧТО ЕСТЬ ПО СЧЁТУ: разнесённые операции (проводки) плюс
 * строки выписки, которые ещё ждут разноски. Иначе «Добавить» строку банка
 * не уменьшало бы расхождение: новая строка выписки проводок не создаёт,
 * пока её не разнесли.
 *
 * Сверка сама ничего не меняет: списки — только предложение. Добавить или
 * удалить решает человек (галочки и кнопка), и каждое решение записано в
 * строке расхождения.
 */
@Injectable()
export class BankReconciliationService {
  constructor(
    private readonly cls: ClsService,
    private readonly trash: TransactionsTrashService,
    private readonly createUncategorized: CreateUncategorizedTransactionService,
    private readonly bankSettings: BankApiSyncSettingsService,
    private readonly connectors: BankConnectorsRegistry,

    @InjectQueue(RECONCILIATION_QUEUE)
    private readonly queue: Queue,

    @Inject(Reconciliation.name)
    private readonly reconciliationModel: TenantModelProxy<typeof Reconciliation>,

    @Inject(ReconciliationItem.name)
    private readonly itemModel: TenantModelProxy<typeof ReconciliationItem>,

    @Inject(UncategorizedBankTransaction.name)
    private readonly uncategorizedModel: TenantModelProxy<typeof UncategorizedBankTransaction>,

    @Inject(BankTransaction.name)
    private readonly bankTransactionModel: TenantModelProxy<typeof BankTransaction>,

    @Inject(AccountTransaction.name)
    private readonly ledgerModel: TenantModelProxy<typeof AccountTransaction>,

    @Inject(TenantUser.name)
    private readonly tenantUserModel: TenantModelProxy<typeof TenantUser>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  private userId(): number | null {
    const id = Number(this.cls.get('userId'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private async create(input: {
    accountId: number;
    fromDate: string;
    toDate: string;
    source: 'integration' | 'file';
    bankBalance?: number | null;
  }) {
    const created: any = await this.reconciliationModel()
      .query()
      .insert({
        accountId: input.accountId,
        fromDate: input.fromDate,
        toDate: input.toDate,
        source: input.source,
        status: 'running',
        bankBalance: input.bankBalance ?? null,
        startedAt: now(),
        createdBy: this.userId(),
      } as any);
    return Number(created.id);
  }

  private async enqueue(payload: Record<string, any>) {
    await this.queue.add(RECONCILIATION_RUN_JOB, {
      ...payload,
      organizationId: this.cls.get('organizationId'),
      userId: this.cls.get('userId'),
    });
  }

  /** По интеграции с банком (FT-040): выписку за период тянет задача. */
  public async startIntegration(input: {
    accountId: number;
    provider: BankProviderId;
    accountNumber: string;
    fromDate: string;
    toDate: string;
  }) {
    if (!(await this.bankSettings.getCredentials(input.provider))) {
      throw new ServiceError(
        RECONCILIATION_ERRORS.NOT_CONNECTED,
        'Банк не подключён — сверка по интеграции невозможна',
        null,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const id = await this.create({ ...input, source: 'integration' });
    await this.enqueue({ reconciliationId: id, mode: 'integration', provider: input.provider, accountNumber: input.accountNumber });
    return { id };
  }

  /**
   * По файлу выписки (FT-041): «сверить, не импортировать». Файл
   * разбирается сразу (ошибка формата — сразу человеку), сверка — в задаче.
   */
  public async startFile(input: {
    accountId: number;
    accountNumber?: string;
    fileName: string;
    buffer: Buffer;
  }) {
    const isOneC = /\.txt$/i.test(input.fileName);
    let ops: StatementOp[];
    let bankBalance: number | null = null;
    let from: string | null = null;
    let to: string | null = null;
    if (isOneC) {
      const parsed = parse1CStatement(decodeStatementBuffer(input.buffer));
      ops = opsFrom1C(parsed, input.accountNumber || parsed.headerAccount);
      bankBalance = parsed.balances.closing;
      from = parsed.balances.from;
      to = parsed.balances.to;
    } else {
      ops = opsFromTable(parseTableStatement(input.buffer, input.fileName));
    }
    if (ops.length === 0 && bankBalance === null) {
      throw new ServiceError(
        RECONCILIATION_ERRORS.EMPTY_FILE,
        'В файле нет ни одной операции нашего счёта',
        null,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const dates = ops.map((op) => op.date).sort();
    const id = await this.create({
      accountId: input.accountId,
      fromDate: from ?? dates[0],
      toDate: to ?? dates[dates.length - 1],
      source: 'file',
      bankBalance,
    });
    await this.enqueue({ reconciliationId: id, mode: 'file', ops });
    return { id };
  }

  /** Операции банка за период — в задаче: банк может отвечать долго. */
  public async fetchIntegrationOps(rec: any, provider: BankProviderId, accountNumber: string) {
    const credentials = await this.bankSettings.getCredentials(provider);
    const operations = await this.connectors
      .get(provider)
      .fetchOperations(credentials, accountNumber, day(rec.fromDate), day(rec.toDate));
    return operations.map((op) => ({
      date: op.date,
      amount: Number(op.amount),
      externalId: op.externalId ?? null,
      payee: op.payee ?? null,
      description: op.description ?? null,
    }));
  }

  /**
   * Что по счёту есть у нас за период.
   *
   * ВСЕ ДЕНЬГИ ПО СЧЁТУ, А НЕ ТОЛЬКО ВЫПИСКА: на банковский счёт деньги
   * приходят и оплатой счёта покупателя, и оплатой поставщику, и расходом.
   * Такой платёж есть и в банке, и у нас — просто не строкой выписки. Если
   * смотреть только на выписку, сверка кричала бы «нет у нас» про каждую
   * оплату счёта. Поэтому «у нас» = проводки по счёту (по документу — одна
   * строка) плюс строки выписки, которые ещё ждут разноски.
   */
  private async ourLines(accountId: number, from: string, to: string) {
    const legs: any[] = await this.ledgerModel()
      .query()
      .where('accountId', accountId)
      .where('date', '>=', from)
      .where('date', '<=', to)
      .select('referenceType', 'referenceId', 'date', 'debit', 'credit');
    const lines: any[] = await this.uncategorizedModel()
      .query()
      .where('accountId', accountId)
      .where('date', '>=', from)
      .where('date', '<=', to);
    const lineOfCashflow = new Map<number, any>(
      lines
        .filter((l) => l.categorized && l.categorizeRefType === 'CashflowTransaction')
        .map((l) => [Number(l.categorizeRefId), l]),
    );

    // Проводки по документу — одна строка: сумма «приход − расход» по счёту.
    const byRef = new Map<string, { referenceType: string; referenceId: number; date: string; cents: number }>();
    for (const leg of legs) {
      const key = `${leg.referenceType}:${leg.referenceId}`;
      const entry = byRef.get(key) ?? {
        referenceType: leg.referenceType,
        referenceId: Number(leg.referenceId),
        date: day(leg.date),
        cents: 0,
      };
      entry.cents += Math.round((Number(leg.debit) - Number(leg.credit)) * 100);
      byRef.set(key, entry);
    }

    const toLine = (l: any): OurLine => ({
      kind: 'bank_line',
      id: l.id,
      date: day(l.date),
      amount: Number(l.amount),
      externalId: l.externalId ?? null,
      payee: l.payee ?? null,
      description: l.description ?? null,
    });
    const live: OurLine[] = [];
    for (const ref of byRef.values()) {
      if (ref.cents === 0) continue;
      const amount = ref.cents / 100;
      const line = ref.referenceType === 'CashflowTransaction' ? lineOfCashflow.get(ref.referenceId) : null;
      if (line) {
        // Разнесённая строка выписки: сверяем её номером у банка, а
        // «Удалить» уносит строку вместе с операцией.
        live.push({ ...toLine(line), amount, date: ref.date });
      } else if (ref.referenceType === 'CashflowTransaction') {
        live.push({ kind: 'cashflow', id: ref.referenceId, date: ref.date, amount, description: null });
      } else {
        // Документ другого раздела: оплата счёта, расход, ручная проводка.
        // Вид документа — в описании, экран подписывает его словами.
        live.push({
          kind: 'document',
          id: ref.referenceId,
          date: ref.date,
          amount,
          description: ref.referenceType,
        });
      }
    }
    live.push(...lines.filter((l) => !l.categorized && !l.deletedAt).map(toLine));

    // Удалённое у нас — чтобы строка банка получила пометку «была удалена».
    const deletedOps: any[] = await this.bankTransactionModel()
      .query()
      .modify('deleted')
      .where((q) => q.where('cashflowAccountId', accountId).orWhere('creditAccountId', accountId))
      .where('date', '>=', from)
      .where('date', '<=', to);
    const opLine = (o: any): OurLine => {
      const incoming = IN_TYPES.includes(o.transactionType);
      const sign = Number(o.cashflowAccountId) === accountId ? (incoming ? 1 : -1) : incoming ? -1 : 1;
      return { kind: 'cashflow', id: o.id, date: day(o.date), amount: sign * Math.abs(Number(o.amount)) };
    };
    const deleted: DeletedLine[] = [
      ...lines.filter((l) => l.deletedAt).map((l) => ({ ...toLine(l), deletedAt: l.deletedAt, deletedBy: l.deletedBy })),
      ...deletedOps
        .filter((o) => !lineOfCashflow.has(Number(o.id)))
        .map((o) => ({ ...opLine(o), deletedAt: o.deletedAt, deletedBy: o.deletedBy })),
    ];
    return { live, deleted };
  }

  private async userNames(ids: any[]) {
    const unique = [...new Set(ids.filter(Boolean).map(Number))];
    const users: any[] = unique.length
      ? await this.tenantUserModel().query().whereIn('systemUserId', unique)
      : [];
    return new Map<number, string>(
      users.map((u) => [u.systemUserId, [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email]),
    );
  }

  /**
   * Остаток «у нас» на конец периода: проводки по счёту плюс строки
   * выписки, которые ждут разноски.
   */
  public async ourBalance(accountId: number, toDate: string) {
    const ledger: any = await this.ledgerModel()
      .query()
      .where('accountId', accountId)
      .modify('closingBalance', toDate)
      .first();
    const pending: any = await this.uncategorizedModel()
      .query()
      .where('accountId', accountId)
      .where('categorized', false)
      .modify('notDeleted')
      .modify('notExcluded')
      .modify('notPending')
      .where('date', '<=', toDate)
      .sum('amount as total')
      .first();
    return round2(
      Number(ledger?.debit ?? 0) - Number(ledger?.credit ?? 0) + Number(pending?.total ?? 0),
    );
  }

  /** Сама сверка — в фоновой задаче. */
  public async run(reconciliationId: number, ops: StatementOp[]) {
    const rec: any = await this.reconciliationModel().query().findById(reconciliationId);
    if (!rec) return;
    try {
      const from = day(rec.fromDate);
      const to = day(rec.toDate);
      const { live, deleted } = await this.ourLines(rec.accountId, from, to);
      const inPeriod = ops.filter((op) => op.date >= from && op.date <= to);
      const result = reconcile(inPeriod, live, deleted);

      await this.itemModel().query().where('reconciliationId', rec.id).delete();
      for (const item of result.missingHere) {
        await this.itemModel()
          .query()
          .insert({
            reconciliationId: rec.id,
            side: 'missing_here',
            externalId: item.op.externalId,
            date: item.op.date,
            amount: item.op.amount,
            payee: item.op.payee ?? null,
            description: item.op.description ?? null,
            transactionId: item.deleted?.id ?? null,
            transactionKind: item.deleted?.kind ?? null,
            deletedAt: item.deleted?.deletedAt ?? null,
            deletedBy: item.deleted?.deletedBy ? Number(item.deleted.deletedBy) : null,
          } as any);
      }
      for (const line of result.missingBank) {
        await this.itemModel()
          .query()
          .insert({
            reconciliationId: rec.id,
            side: 'missing_bank',
            externalId: line.externalId ?? null,
            date: line.date,
            amount: line.amount,
            payee: line.payee ?? null,
            description: line.description ?? null,
            transactionId: line.id,
            transactionKind: line.kind,
          } as any);
      }
      await this.summarize(rec.id, 'done');
    } catch (error) {
      await this.reconciliationModel()
        .query()
        .findById(rec.id)
        .patch({ status: 'failed', error: String((error as any)?.message ?? error).slice(0, 250), finishedAt: now() } as any);
      throw error;
    }
  }

  /** Итог сверки: остатки, расхождение и сколько строк ещё не решено. */
  private async summarize(reconciliationId: number, status?: 'done') {
    const rec: any = await this.reconciliationModel().query().findById(reconciliationId);
    const items: any[] = await this.itemModel().query().where('reconciliationId', reconciliationId);
    const open = items.filter((i) => !i.resolvedAs);
    const ourBalance = await this.ourBalance(rec.accountId, day(rec.toDate));
    const bankBalance = rec.bankBalance === null || rec.bankBalance === undefined ? null : Number(rec.bankBalance);
    const diff = reconciliationDiff(bankBalance, ourBalance, {
      missingHere: open.filter((i) => i.side === 'missing_here').map((i) => ({ op: { ...i, amount: Number(i.amount) } })),
      missingBank: open.filter((i) => i.side === 'missing_bank').map((i) => ({ ...i, amount: Number(i.amount) })),
    } as any);
    await this.reconciliationModel()
      .query()
      .findById(reconciliationId)
      .patch({
        ourBalance,
        diff,
        missingHere: open.filter((i) => i.side === 'missing_here').length,
        missingBank: open.filter((i) => i.side === 'missing_bank').length,
        ...(status ? { status, finishedAt: now() } : {}),
      } as any);
  }

  /**
   * Решение по отмеченным строкам (FT-040):
   * - «Добавить» строку банка — новая строка выписки (к ней применятся
   *   автоправила); удалённая у нас — возвращается из корзины;
   * - «Удалить» нашу строку — в корзину с причиной «сверка»;
   * - «Оставить» — отметка, что человек видел и согласен.
   */
  public async resolve(reconciliationId: number, itemIds: number[], action: 'add' | 'delete' | 'ignore') {
    const rec: any = await this.reconciliationModel().query().findById(reconciliationId);
    if (!rec) throw new ServiceError(RECONCILIATION_ERRORS.NOT_FOUND, 'Сверка не найдена', null, HttpStatus.NOT_FOUND);
    const items: any[] = await this.itemModel()
      .query()
      .where('reconciliationId', reconciliationId)
      .whereIn('id', itemIds)
      .whereNull('resolvedAs');
    const wrong = items.filter(
      (i) => (action === 'add' && i.side !== 'missing_here') || (action === 'delete' && i.side !== 'missing_bank'),
    );
    // Документы других разделов (оплата счёта, расход) корзина не удаляет:
    // у них своя жизнь — оплата, например, сидит на счёте покупателя.
    if (action === 'delete' && items.some((i) => i.transactionKind === 'document')) {
      throw new ServiceError(
        RECONCILIATION_ERRORS.DOCUMENT_NOT_TRASHABLE,
        'Этот документ удаляется в своём разделе — например, оплата — в карточке счёта',
        null,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (wrong.length > 0) {
      throw new ServiceError(
        RECONCILIATION_ERRORS.WRONG_SIDE,
        action === 'add'
          ? 'Добавить можно только строки «есть в банке, нет у нас»'
          : 'Удалить можно только строки «есть у нас, нет в банке»',
        null,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const account: any = await this.accountModel().query().findById(rec.accountId);
    for (const item of items) {
      if (action === 'add') {
        if (item.transactionId && item.transactionKind && item.deletedAt) {
          await this.trash.restore([{ kind: item.transactionKind, id: Number(item.transactionId) }]);
        } else {
          await this.createUncategorized.create({
            date: day(item.date),
            accountId: rec.accountId,
            amount: Number(item.amount),
            // Валюта строки — валюта счёта: сверка идёт по одному счёту.
            currencyCode: account?.currencyCode ?? 'RUB',
            payee: item.payee ?? undefined,
            description: item.description ?? undefined,
            externalId: item.externalId ?? `rec:${rec.id}:${item.id}`,
          } as any);
        }
      } else if (action === 'delete') {
        await this.trash.trash([{ kind: item.transactionKind, id: Number(item.transactionId) }], 'reconciliation');
      }
      await this.itemModel()
        .query()
        .findById(item.id)
        .patch({ resolvedAs: action === 'add' ? 'added' : action === 'delete' ? 'deleted' : 'ignored', resolvedAt: now() } as any);
    }
    await this.summarize(reconciliationId);
    return this.get(reconciliationId);
  }

  public async list(accountId?: number) {
    return this.reconciliationModel()
      .query()
      .onBuild((q) => {
        if (accountId) q.where('accountId', accountId);
      })
      .orderBy('startedAt', 'desc')
      .limit(100);
  }

  public async get(reconciliationId: number) {
    const rec: any = await this.reconciliationModel()
      .query()
      .findById(reconciliationId)
      .withGraphFetched('items');
    if (!rec) throw new ServiceError(RECONCILIATION_ERRORS.NOT_FOUND, 'Сверка не найдена', null, HttpStatus.NOT_FOUND);
    const names = await this.userNames((rec.items ?? []).map((i) => i.deletedBy));
    return {
      ...rec,
      items: (rec.items ?? []).map((i) => ({ ...i, deletedByName: i.deletedBy ? names.get(Number(i.deletedBy)) ?? null : null })),
    };
  }

  /** Старые сверки — прочь (FT-040: история хранится 180 дней). */
  public async purgeOld(days = RECONCILIATION_RETENTION_DAYS) {
    const border = moment().subtract(days, 'days').format('YYYY-MM-DD HH:mm:ss');
    const removed = await this.reconciliationModel().query().where('startedAt', '<', border).delete();
    return { removed };
  }
}
