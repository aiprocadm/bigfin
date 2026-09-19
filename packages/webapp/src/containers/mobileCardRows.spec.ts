import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Списки на телефоне — карточки, а не простыня вбок (§5.4 ТЗ, остаток Д3).
 *
 * ЗАЧЕМ. В таблице документа шесть-семь столбцов, а на экране в 390 точек
 * помещаются два. Прокрутка вбок спасает от обрезки, но не даёт прочесть
 * строку целиком: чтобы увидеть сумму, приходится увести из вида
 * контрагента, ради которого и смотрели.
 *
 * ПОЧЕМУ СТОРОЖ. Основатель пользуется продуктом с телефона — это записано в
 * памяти проекта первой строкой. Новый список, добавленный без карточек,
 * никак себя не проявит на ноутбуке разработчика.
 */
const ROOT = __dirname;

/** Главные экраны-списки: те, куда заходят с телефона. */
const LANDING_TABLES = [
  'Sales/Invoices/InvoicesLanding/v2/InvoicesTableV2.tsx',
  'Sales/Receipts/ReceiptsLanding/v2/ReceiptsTableV2.tsx',
  'Sales/Estimates/EstimatesLanding/v2/EstimatesTableV2.tsx',
  'Sales/CreditNotes/CreditNotesLanding/v2/CreditNotesTableV2.tsx',
  'Sales/PaymentsReceived/PaymentsLanding/v2/PaymentsReceivedTableV2.tsx',
  'Purchases/Bills/BillsLanding/v2/BillsTableV2.tsx',
  'Purchases/PaymentsMade/PaymentsLanding/v2/PaymentsMadeTableV2.tsx',
  'Purchases/CreditNotes/CreditNotesLanding/v2/VendorsCreditNotesTableV2.tsx',
  'Expenses/ExpensesLanding/v2/ExpensesTableV2.tsx',
  'Accounting/JournalsLanding/v2/ManualJournalsTableV2.tsx',
  'Customers/CustomersLanding/v2/CustomersTableV2.tsx',
  'Vendors/VendorsLanding/v2/VendorsTableV2.tsx',
  'Items/v2/ItemsTableV2.tsx',
  'Accounts/v2/AccountsTableV2.tsx',
  'WarehouseTransfers/WarehouseTransfersLanding/v2/WarehouseTransfersTableV2.tsx',
  'InventoryAdjustments/v2/InventoryAdjustmentTableV2.tsx',
];

const read = (file: string) =>
  activeCode(fs.readFileSync(path.join(ROOT, file), 'utf8'));

describe('списки на телефоне выкладываются блоками', () => {
  LANDING_TABLES.forEach((file) => {
    const name = path.basename(file);

    it(`${name}: строка есть в мобильном виде`, () => {
      expect(read(file)).toContain('renderMobileRow');
    });
  });

  it('таблица прячется, когда есть мобильный вид', () => {
    // Иначе на телефоне будут ОБА вида сразу — и карточки, и таблица.
    const table = activeCode(
      fs.readFileSync(
        path.join(ROOT, '../components/ui/data-table.tsx'),
        'utf8',
      ),
    );

    expect(table).toContain("renderMobileRow && 'hidden md:table'");
    expect(table).toContain('md:hidden');
  });

  it('блок сам разбирает число и готовую строку', () => {
    // ЖИВАЯ ПРОВЕРКА НА ТЕЛЕФОНЕ: в карточке контрагента стояло «1140000» —
    // без пробелов и без рубля. Число было передано туда, где ждали готовый
    // текст. Ни один тест этого не увидел: строка есть, ошибки нет, просто
    // нечитаемо.
    ['document-mobile-row.tsx', 'entity-mobile-row.tsx'].forEach((file) => {
      const source = activeCode(
        fs.readFileSync(path.join(ROOT, '../components/ui', file), 'utf8'),
      );

      expect(source, file).toContain("typeof amount === 'number'");
      expect(source, file).toContain('currency');
    });
  });

  it('проверка и правда читает файлы', () => {
    LANDING_TABLES.forEach((file) => {
      expect(read(file).length, file).toBeGreaterThan(500);
    });
  });
});
