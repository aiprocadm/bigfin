// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { activeCode } from '../../testing/activeCode';

/**
 * Ручная отметка «внутригрупповая операция» (этап 7 ТЗ, §7.2, остаток К2).
 *
 * ЗАЧЕМ ВЫКЛЮЧАТЕЛЬ ВООБЩЕ НУЖЕН. Автоматика помечает операцию сама, когда её
 * ноги принадлежат разным известным юрлицам. Но юрлицо она берёт со СЧЁТА, а
 * правило гласит: «неизвестное юрлицо не считается другим». Перевод
 * собственной компании, оформленный документом на контрагента, автоматика не
 * увидит НИКОГДА — и в сводном отчёте одна и та же выручка посчитается дважды.
 *
 * ГЛАВНОЕ ПРАВИЛО. Ручная отметка только ДОБАВЛЯЕТ признак. Снять
 * автоматический ею нельзя: если ноги и правда у разных юрлиц, операция
 * внутригрупповая по определению, и разрешить сказать «нет» значило бы
 * позволить дважды посчитать одну выручку.
 */
const ROOT = __dirname;

const read = (file: string) =>
  activeCode(fs.readFileSync(path.resolve(ROOT, file), 'utf-8'));

describe('ручная отметка внутригрупповой операции', () => {
  const storage = read('LedgerEntriesStorage.service.ts');

  it('отметка учитывается при записи проводок', () => {
    expect(storage).toContain('markedByHand');
  });

  it('она ДОБАВЛЯЕТ признак, а не заменяет автоматический', () => {
    // `||`, а не `??` и не присваивание: автоматический признак должен
    // пережить любую отметку человека.
    expect(storage).toMatch(
      /this\.detectIntercompany\([\s\S]*?\)\s*\|\|\s*markedByHand/,
    );
  });

  it('признаком считается только явное «да»', () => {
    // `undefined` у проводки, которая про этот признак ничего не знает, не
    // должен читаться как отметка.
    expect(storage).toContain('=== true');
  });

  it('решение по-прежнему принимается в одном месте на всю операцию', () => {
    // Разные ноги одной операции не могут быть «по-разному внутригрупповыми».
    expect(storage).toContain('entries.some(');
  });
});

describe('отметка доходит от документа до проводки', () => {
  it('журнал проводок передаёт её в проводки', () => {
    expect(read('../ManualJournals/commands/ManualJournalGL.ts')).toContain(
      'isIntercompany',
    );
  });

  it('приход и расход денег передают её в проводки', () => {
    expect(
      read('../BankingTransactions/commands/BankTransactionGL.ts'),
    ).toContain('isIntercompany');
  });

  it('поле есть у проводки, а не только во внутренней очереди', () => {
    // Раньше признак существовал лишь в `ISaveLedgerEntryQueuePayload`, и
    // протащить его из построителя проводок было нечем.
    expect(read('types/Ledger.types.ts')).toMatch(
      /isIntercompany\?: boolean;[\s\S]*?ISaveLedgerEntryQueuePayload/,
    );
  });

  it('белый список полей прихода/расхода её пропускает', () => {
    // Список полей там БЕЛЫЙ: забыть в нём поле — значит молча потерять
    // выбор человека, ничего при этом не сломав.
    expect(
      read('../BankingTransactions/commands/CreateBankTransaction.service.ts'),
    ).toContain("'isIntercompany'");
  });

  it('оба запроса принимают отметку', () => {
    expect(read('../ManualJournals/dtos/ManualJournal.dto.ts')).toContain(
      'isIntercompany',
    );
    expect(
      read('../BankingTransactions/dtos/CreateBankTransaction.dto.ts'),
    ).toContain('isIntercompany');
  });
});

describe('колонка документа', () => {
  const migration = read(
    '../../database/tenant/migrations/20260919200000_add_manual_intercompany_flag.ts',
  );

  it('заводится у обеих ручных операций', () => {
    // Выключатель, работающий через раз, хуже отсутствующего.
    expect(migration).toContain("'manual_journals'");
    expect(migration).toContain("'cashflow_transactions'");
  });

  it('по умолчанию выключена', () => {
    // Включённый по умолчанию признак вычел бы из отчётов настоящую выручку.
    expect(migration).toContain('defaultTo(false)');
  });

  it('умеет откатываться', () => {
    expect(migration).toContain('dropColumn');
  });

  it('не полагается на регистр имён в схеме', () => {
    // Схема тенанта живёт в ВЕРХНЕМ регистре, а код пишет строчными:
    // `hasColumn` на живой базе отвечает «нет» для существующей колонки.
    expect(migration).toContain('information_schema.columns');
    expect(migration).toContain('LOWER(column_name)');
  });
});
