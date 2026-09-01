// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../../testing/activeCode';

/**
 * Сверка «подписчик пишет проводки ↔ его ошибки доходят до пользователя».
 *
 * Nest по умолчанию проглатывает исключения обработчиков событий, а журнал
 * пишется именно в них. Живая проба показала, чем это кончается: документ
 * сохранён, проводок нет, пользователь видит «готово». Молчаливая потеря —
 * худший вид ошибки, потому что прячет все остальные.
 *
 * Тест держит список тех, кому глушить разрешено, — он может только
 * сокращаться, а новый подписчик проводок обязан либо не глушить ошибки, либо
 * осознанно попасть в список с причиной.
 */
const MODULES_DIR = path.resolve(__dirname, '..');

/** Кому глушить разрешено — с причиной. */
const MAY_SUPPRESS: Record<string, string> = {
  // Пересчёт себестоимости идёт фоновыми задачами и может тронуть документы
  // прошлых периодов. Его сбой не должен отменять сохранение текущего
  // документа пользователем — это отдельная беда и отдельный разбор.
  'InventoryCost/subscribers/InventoryCost.subscriber.ts':
    'фоновый пересчёт себестоимости',
  'InventoryCost/subscribers/InventoryCostGLBeforeWriteSubscriber.ts':
    'фоновый пересчёт себестоимости',
  'SaleInvoices/subscribers/InvoiceCostGLEntriesSubscriber.ts':
    'фоновый пересчёт себестоимости',
  'SaleReceipts/subscribers/SaleReceiptCostGLEntriesSubscriber.ts':
    'фоновый пересчёт себестоимости',
};

/** Признак работы с журналом. */
const LEDGER = /GLEntries|LedgerStorage|writeJournalEntries|GLStorage/;

const tsFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsFiles(full);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
      ? [full]
      : [];
  });

const ledgerSubscribers = () =>
  tsFiles(MODULES_DIR)
    .map((file) => ({ file, src: activeCode(fs.readFileSync(file, 'utf8')) }))
    .filter(({ src }) => src.includes('@OnEvent') && LEDGER.test(src))
    .map(({ file, src }) => ({
      rel: path.relative(MODULES_DIR, file),
      suppresses: !src.includes('suppressErrors: false'),
    }));

describe('ошибки записи проводок доходят до пользователя', () => {
  it('подписчики проводок найдены', () => {
    // Если поиск сломается, проверка ниже позеленеет «бесплатно».
    expect(ledgerSubscribers().length).toBeGreaterThan(15);
  });

  it('никто, кроме разрешённых, не глушит свои ошибки', () => {
    const offenders = ledgerSubscribers()
      .filter((s) => s.suppresses && !(s.rel in MAY_SUPPRESS))
      .map((s) => s.rel);

    expect(offenders).toEqual([]);
  });

  it('список разрешений не содержит выдуманных файлов', () => {
    const stale = Object.keys(MAY_SUPPRESS).filter(
      (rel) => !fs.existsSync(path.join(MODULES_DIR, rel)),
    );

    expect(stale).toEqual([]);
  });

  it('в разрешениях нет тех, кто уже не глушит', () => {
    const known = new Map(ledgerSubscribers().map((s) => [s.rel, s.suppresses]));
    const redundant = Object.keys(MAY_SUPPRESS).filter(
      (rel) => known.get(rel) === false,
    );

    expect(redundant).toEqual([]);
  });
});
