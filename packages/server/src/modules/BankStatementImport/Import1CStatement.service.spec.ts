/**
 * Unit-тест Import1CStatementService.
 *
 * Живая БД НЕ требуется: CreateUncategorizedTransactionService и модель
 * замокированы. Тесты покрывают:
 *  (a) пропуск документов с direction = 'unknown'
 *  (b) дедупликацию по (accountId, externalId)
 *  (c) правильные поля DTO и знак суммы (приход → positive, расход → negative)
 *  (d) корректный { imported, skipped }
 */
import { Test, TestingModule } from '@nestjs/testing';
import { Import1CStatementService } from './commands/Import1CStatement.service';
import { CreateUncategorizedTransactionService } from '@/modules/BankingCategorize/commands/CreateUncategorizedTransaction.service';
import { UncategorizedBankTransaction } from '@/modules/BankingTransactions/models/UncategorizedBankTransaction';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';

// ---------------------------------------------------------------------------
// FIXTURE — идентична parse1CStatement.spec.ts
// doc 101: приход 15000.50, плательщик ИНН 7701234567
// doc 102: расход 3000.00, получатель ИНН 7709999999
// ---------------------------------------------------------------------------
const FIXTURE_TEXT = [
  '1CClientBankExchange',
  'ВерсияФормата=1.03',
  'Кодировка=Windows',
  'РасчСчет=40702810400000012345',
  'СекцияДокумент=Платежное поручение',
  'Номер=101',
  'Дата=15.06.2026',
  'Сумма=15000.50',
  'ПлательщикСчет=40702810400000099999',
  'Плательщик=ООО "Клиент"',
  'ПлательщикИНН=7701234567',
  'ПлательщикРасчСчет=40702810400000099999',
  'ПолучательСчет=40702810400000012345',
  'Получатель=ООО "Наша Компания"',
  'ПолучательИНН=7707654321',
  'ПолучательРасчСчет=40702810400000012345',
  'НазначениеПлатежа=Оплата по счету 5 от 01.06.2026',
  'КонецДокумента',
  'СекцияДокумент=Платежное поручение',
  'Номер=102',
  'Дата=16.06.2026',
  'Сумма=3000.00',
  'ПлательщикРасчСчет=40702810400000012345',
  'Плательщик=ООО "Наша Компания"',
  'ПлательщикИНН=7707654321',
  'ПолучательРасчСчет=40817810400000055555',
  'Получатель=ООО "Поставщик"',
  'ПолучательИНН=7709999999',
  'НазначениеПлатежа=Оплата за материалы',
  'КонецДокумента',
  'КонецФайла',
].join('\r\n');

// Fixture with one unknown-direction doc (account mismatch) + one valid in
const FIXTURE_WITH_UNKNOWN = [
  '1CClientBankExchange',
  'ВерсияФормата=1.03',
  'Кодировка=Windows',
  'РасчСчет=40702810400000012345',
  'СекцияДокумент=Платежное поручение',
  'Номер=200',
  'Дата=15.06.2026',
  'Сумма=500.00',
  // neither payer nor payee matches our account → unknown
  'ПлательщикРасчСчет=40702810400000099999',
  'ПолучательРасчСчет=40817810400000055555',
  'НазначениеПлатежа=Неизвестная транзакция',
  'КонецДокумента',
  'СекцияДокумент=Платежное поручение',
  'Номер=201',
  'Дата=15.06.2026',
  'Сумма=100.00',
  'ПлательщикРасчСчет=40702810400000099999',
  'ПлательщикИНН=7701111111',
  'ПолучательРасчСчет=40702810400000012345',
  'ПолучательИНН=7707654321',
  'НазначениеПлатежа=Поступление',
  'КонецДокумента',
  'КонецФайла',
].join('\r\n');

// ---------------------------------------------------------------------------
// Helpers to build mocks
// ---------------------------------------------------------------------------
function buildMocks() {
  // Track existing externalIds per accountId for dedup simulation
  const existingExternalIds = new Set<string>();

  const queryMock = {
    findOne: jest.fn().mockImplementation(({ accountId, externalId }) => {
      const key = `${accountId}:${externalId}`;
      return Promise.resolve(existingExternalIds.has(key) ? { id: 1 } : null);
    }),
  };

  const uncategorizedModelFn = jest.fn().mockReturnValue({
    query: jest.fn().mockReturnValue(queryMock),
  });

  const createService = {
    create: jest.fn().mockImplementation((dto) => {
      // After create, register as existing for dedup
      const key = `${dto.accountId}:${dto.externalId}`;
      existingExternalIds.add(key);
      return Promise.resolve({ id: Math.random(), ...dto });
    }),
  } as unknown as CreateUncategorizedTransactionService;

  return { uncategorizedModelFn, createService, existingExternalIds };
}

// Minimal UnitOfWork mock: just runs the callback with a fake trx
const uowMock = {
  withTransaction: jest.fn().mockImplementation((work) => work({})),
};

// ---------------------------------------------------------------------------
describe('Import1CStatementService', () => {
  let service: Import1CStatementService;
  let createService: jest.Mocked<{ create: jest.Mock }>;
  let uncategorizedModelFn: jest.Mock;

  beforeEach(async () => {
    const mocks = buildMocks();
    createService = mocks.createService as any;
    uncategorizedModelFn = mocks.uncategorizedModelFn;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Import1CStatementService,
        { provide: UnitOfWork, useValue: uowMock },
        { provide: CreateUncategorizedTransactionService, useValue: createService },
        {
          provide: UncategorizedBankTransaction.name,
          useValue: uncategorizedModelFn,
        },
      ],
    }).compile();

    service = module.get<Import1CStatementService>(Import1CStatementService);
    jest.clearAllMocks();
    // Re-wire mocks after clearAllMocks
    uowMock.withTransaction.mockImplementation((work) => work({}));
    uncategorizedModelFn.mockReturnValue({
      query: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      }),
    });
    createService.create = jest.fn().mockResolvedValue({ id: 1 });
  });

  // -------------------------------------------------------------------------
  // (a) unknown-direction пропускается
  // -------------------------------------------------------------------------
  it('(a) пропускает документ с direction=unknown', async () => {
    // UTF-8 BOM → decodeStatementBuffer берёт UTF-8 путь (без BOM = cp1251).
    const buf = Buffer.from('﻿' + FIXTURE_WITH_UNKNOWN, 'utf8');
    const result = await service.import(42, '40702810400000012345', 'RUB', buf);

    // doc 200 → unknown → noDirection; doc 201 → in → imported
    expect(result).toEqual({
      imported: 1,
      skipped: 1,
      duplicates: 0,
      noDirection: 1,
      unparsed: 0,
    });
    expect(createService.create).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // (b) дедупликация по (accountId, externalId)
  // -------------------------------------------------------------------------
  it('(b) пропускает документ, externalId которого уже существует', async () => {
    // Simulate that externalId for doc 101 already exists
    uncategorizedModelFn.mockReturnValue({
      query: jest.fn().mockReturnValue({
        findOne: jest.fn().mockImplementation(({ externalId }) => {
          // doc 101 externalId: 1c:101:2026-06-15:15000.50
          if (externalId === '1c:101:2026-06-15:15000.50') {
            return Promise.resolve({ id: 999 }); // already exists
          }
          return Promise.resolve(null);
        }),
      }),
    });

    const buf = Buffer.from('﻿' + FIXTURE_TEXT, 'utf8');
    const result = await service.import(42, '40702810400000012345', 'RUB', buf);

    // doc 101 → duplicate (exists); doc 102 → imported
    expect(result).toEqual({
      imported: 1,
      skipped: 1,
      duplicates: 1,
      noDirection: 0,
      unparsed: 0,
    });
    expect(createService.create).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // (c) правильные поля DTO и знак суммы
  //     приход (doc 101) → amount POSITIVE (15000.50)
  //     расход (doc 102) → amount NEGATIVE (-3000.00)
  // -------------------------------------------------------------------------
  it('(c) приход → положительная сумма, расход → отрицательная', async () => {
    const buf = Buffer.from('﻿' + FIXTURE_TEXT, 'utf8');
    await service.import(42, '40702810400000012345', 'RUB', buf);

    expect(createService.create).toHaveBeenCalledTimes(2);

    // First call: doc 101, money-in
    const callIn = (createService.create as jest.Mock).mock.calls[0][0];
    expect(callIn.amount).toBe(15000.5);
    expect(callIn.date).toBe('2026-06-15');
    expect(callIn.accountId).toBe(42);
    expect(callIn.currencyCode).toBe('RUB');
    expect(callIn.payee).toBe('ООО "Клиент"');
    expect(callIn.payeeInn).toBe('7701234567');
    expect(callIn.description).toBe('Оплата по счету 5 от 01.06.2026');
    expect(callIn.referenceNo).toBe('101');
    expect(callIn.externalId).toBe('1c:101:2026-06-15:15000.50');

    // Second call: doc 102, money-out
    const callOut = (createService.create as jest.Mock).mock.calls[1][0];
    expect(callOut.amount).toBe(-3000.0);
    expect(callOut.date).toBe('2026-06-16');
    expect(callOut.payee).toBe('ООО "Поставщик"');
    expect(callOut.payeeInn).toBe('7709999999');
    expect(callOut.description).toBe('Оплата за материалы');
    expect(callOut.referenceNo).toBe('102');
    expect(callOut.externalId).toBe('1c:102:2026-06-16:3000.00');
  });

  // -------------------------------------------------------------------------
  // (d) корректный { imported, skipped } — оба импортируются
  // -------------------------------------------------------------------------
  it('(d) возвращает { imported: 2, skipped: 0 } для двух новых документов', async () => {
    const buf = Buffer.from('﻿' + FIXTURE_TEXT, 'utf8');
    const result = await service.import(42, '40702810400000012345', 'RUB', buf);
    expect(result).toEqual({
      imported: 2,
      skipped: 0,
      duplicates: 0,
      noDirection: 0,
      unparsed: 0,
    });
  });

  // -------------------------------------------------------------------------
  // повторный импорт → всё дедуплицируется
  // -------------------------------------------------------------------------
  it('повторный импорт того же буфера → { imported: 0, skipped: 2 }', async () => {
    // Both externalIds already exist
    uncategorizedModelFn.mockReturnValue({
      query: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue({ id: 999 }),
      }),
    });
    const buf = Buffer.from('﻿' + FIXTURE_TEXT, 'utf8');
    const result = await service.import(42, '40702810400000012345', 'RUB', buf);
    expect(result).toEqual({
      imported: 0,
      skipped: 2,
      duplicates: 2,
      noDirection: 0,
      unparsed: 0,
    });
    expect(createService.create).not.toHaveBeenCalled();
  });
});
