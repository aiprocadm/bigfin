// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

/**
 * Р1 срез 2 (карта v16). Правило «валюта документа ≠ базовой ⇒ курс
 * обязателен» стояло в восьми трансформерах (С4 карты v14), но список был
 * записан руками — новые точки входа в него не попадали. Разведка нашла ещё
 * пять: сметы, оба возврата, создание банковской операции и разбор
 * банковской выписки. Через них валютный документ ложился в журнал один к
 * одному с рублём.
 *
 * Сторож ищет точки входа САМ: если курс берётся из запроса
 * (`какой-тоDTO.exchangeRate || 1`), файл обязан звать проверку.
 */
const MODULES = path.resolve(__dirname, '../../modules');

/**
 * Курс из УЖЕ СОХРАНЁННОГО документа — не точка входа: родительский документ
 * проверен при создании. Такие места читают модель (`this.bill`, `expense`),
 * а не запрос, и под правило ниже не попадают.
 *
 * Исключение только одно и с причиной: ручная проводка — отдельный срез 3,
 * там курс не просто не проверяется, но и вовсе не применяется к суммам.
 */
const EXCEPTIONS = new Map<string, string>([
  [
    'BankingTransactions/utils.ts',
    'Собранный запрос уходит в CreateBankTransaction — курс проверяется там',
  ],
  [
    'ManualJournals/commands/CreateManualJournal.service.ts',
    'Р1 срез 3: у ручной проводки курс не умножает суммы — чинится отдельно',
  ],
]);

/** Курс, взятый из запроса, с молчаливой единицей. */
const FROM_REQUEST = /\b\w*(?:DTO|Dto)\??\.exchangeRate\s*\|\|\s*1/;

const collectSources = (dir: string): string[] => {
  const out: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...collectSources(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.includes('.spec.')) {
      out.push(full);
    }
  }
  return out;
};

describe('курс обязателен во всех точках входа', () => {
  const entryPoints = collectSources(MODULES).filter((file) =>
    FROM_REQUEST.test(fs.readFileSync(file, 'utf8')),
  );

  it('точки входа вообще нашлись', () => {
    // Иначе пустой список сделал бы проверку ниже бессмысленно зелёной.
    expect(entryPoints.length).toBeGreaterThan(5);
  });

  it('каждая точка входа проверяет курс', () => {
    const unprotected = entryPoints
      .map((file) => path.relative(MODULES, file))
      .filter((rel) => !EXCEPTIONS.has(rel))
      .filter(
        (rel) =>
          !fs
            .readFileSync(path.join(MODULES, rel), 'utf8')
            .includes('assertValidExchangeRate('),
      );

    expect(unprotected).toEqual([]);
  });

  it('у каждого исключения записана причина', () => {
    const withoutReason = Array.from(EXCEPTIONS.entries())
      .filter(([, reason]) => !reason || reason.length < 20)
      .map(([file]) => file);

    expect(withoutReason).toEqual([]);
  });
});
