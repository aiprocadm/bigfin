// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../../testing/activeCode';

/**
 * Сверка «подписчик пишет складские движения ↔ его ошибки доходят до
 * пользователя».
 *
 * Та же природа, что у проводок: Nest по умолчанию проглатывает исключения
 * обработчиков событий. Для склада это значит, что документ сохранён, а
 * остатки не изменились — и никто об этом не знает. Движения пишутся в
 * транзакции самого документа, поэтому отказ откатывает документ целиком:
 * лучше отказать в продаже, чем продать и потерять списание со склада.
 */
const MODULES_DIR = path.resolve(__dirname, '..');

/** Кому глушить разрешено — с причиной. */
const MAY_SUPPRESS: Record<string, string> = {
  // Пересчёт себестоимости идёт фоновыми задачами и трогает прошлые периоды.
  'InventoryCost/subscribers/InventoryCost.subscriber.ts':
    'фоновый пересчёт себестоимости',
  // Разовые перестроения при ВКЛЮЧЕНИИ складов: они переписывают исторические
  // строки, а не пишут движение по документу. Отдельный разбор.
  'Warehouses/AccountsTransactionsWarehousesSubscribe.ts':
    'разовая миграция при включении складов',
  'Warehouses/ActivateWarehousesSubscriber.ts':
    'разовая миграция при включении складов',
  'Warehouses/Integrations/WarehousesItemsQuantitySynSubscriber.ts':
    'разовая миграция при включении складов',
  'Warehouses/subscribers/Activate/InventoryTransactionsWarehousesActivateSubscriber.ts':
    'разовая миграция при включении складов',
  'Warehouses/subscribers/Activate/ReceiptWarehousesActivateSubscriber.ts':
    'разовая миграция при включении складов',
  // Автонумерация: её сбой не теряет данные документа, а сбивает нумерацию.
  'WarehousesTransfers/susbcribers/WarehouseTransferAutoIncrementSubscriber.ts':
    'автонумерация, не движение склада',
};

/** Признак работы со складскими движениями. */
const INVENTORY =
  /InventoryTransactions|recordInventoryTranscactions|ItemsQuantity|itemWarehouseQuantity/;

const tsFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsFiles(full);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
      ? [full]
      : [];
  });

const inventorySubscribers = () =>
  tsFiles(MODULES_DIR)
    .map((file) => ({ file, src: activeCode(fs.readFileSync(file, 'utf8')) }))
    .filter(({ src }) => src.includes('@OnEvent') && INVENTORY.test(src))
    .map(({ file, src }) => ({
      rel: path.relative(MODULES_DIR, file),
      suppresses: !src.includes('suppressErrors: false'),
    }));

describe('ошибки записи складских движений доходят до пользователя', () => {
  it('складские подписчики найдены', () => {
    expect(inventorySubscribers().length).toBeGreaterThan(10);
  });

  it('никто, кроме разрешённых, не глушит свои ошибки', () => {
    const offenders = inventorySubscribers()
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
    const known = new Map(
      inventorySubscribers().map((s) => [s.rel, s.suppresses]),
    );
    const redundant = Object.keys(MAY_SUPPRESS).filter(
      (rel) => known.get(rel) === false,
    );

    expect(redundant).toEqual([]);
  });
});
