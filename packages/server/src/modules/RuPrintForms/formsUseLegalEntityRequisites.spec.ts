// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { activeCode } from '../../testing/activeCode';

/**
 * Сторож: печатная форма документа берёт реквизиты ЮРЛИЦА (этап 8 ТЗ, §8.3,
 * остаток К7).
 *
 * ЗАЧЕМ. Счёт от ООО «Ромашка» обязан содержать реквизиты «Ромашки», а не
 * общие настройки аккаунта. Контрагент платит по тем реквизитам, что видит:
 * ошибка здесь означает деньги, ушедшие не туда, при совершенно нормальном
 * виде документа.
 *
 * ЧТО БЫЛО НЕ ТАК. Правило подбора реквизитов было написано и проверено, но
 * НЕ РАБОТАЛО НИ В ОДНОЙ ФОРМЕ: код спрашивал `invoice.legalEntity`, а такой
 * связи у счёта не существовало — ответ всегда `undefined`, и формы молча
 * печатали настройки аккаунта. Четыре формы из пяти не спрашивали и этого.
 */
const ROOT = __dirname;

const read = (file: string) =>
  activeCode(fs.readFileSync(path.resolve(ROOT, file), 'utf-8'));

/** Формы документа: у каждой есть счёт, а у счёта — юрлицо. */
const DOCUMENT_FORMS = [
  { name: 'Счёт на оплату', file: 'queries/GetRuPaymentInvoicePdf.service.ts' },
  { name: 'Счёт-фактура', file: 'queries/GetRuInvoiceFacturaPdf.service.ts' },
  { name: 'УПД', file: 'queries/GetRuUpdPdf.service.ts' },
  { name: 'Акт', file: 'queries/GetRuActPdf.service.ts' },
  { name: 'ТОРГ-12', file: 'queries/GetRuTorg12Pdf.service.ts' },
];

describe('печатные формы печатают реквизиты юрлица', () => {
  DOCUMENT_FORMS.forEach((form) => {
    it(`${form.name}: спрашивает юрлицо документа`, () => {
      expect(read(form.file)).toContain('legalEntity');
    });

    it(`${form.name}: берёт реквизиты общим правилом`, () => {
      // Своё правило подбора в каждой форме однажды разойдётся с остальными,
      // и один документ напечатается с чужим расчётным счётом.
      const source = read(form.file);

      expect(
        source.includes('sellerMetadataFor') ||
          source.includes('resolveSellerRequisites'),
      ).toBe(true);
    });
  });

  it('связь счёта с юрлицом объявлена', () => {
    // Без неё `invoice.legalEntity` всегда `undefined`, и правило подбора
    // работает вхолостую — ровно это и происходило.
    const model = activeCode(
      fs.readFileSync(
        path.resolve(ROOT, '../SaleInvoices/models/SaleInvoice.ts'),
        'utf-8',
      ),
    );

    expect(model).toContain('legalEntity: {');
    expect(model).toContain('sales_invoices.legalEntityId');
  });

  it('связь и правда загружается вместе со счётом', () => {
    // Объявленная, но не загруженная связь — то же самое, что её отсутствие.
    const query = activeCode(
      fs.readFileSync(
        path.resolve(ROOT, '../SaleInvoices/queries/GetSaleInvoice.service.ts'),
        'utf-8',
      ),
    );

    expect(query).toContain("withGraphFetched('legalEntity')");
  });

  it('правило «всё или ничего» не размыто', () => {
    // Реквизиты юрлица берутся ЦЕЛИКОМ, включая пустые. ИНН одного юрлица
    // рядом с расчётным счётом другого — документ, по которому деньги уйдут
    // не туда.
    // Проверяем КОД, а не пояснение к нему: `activeCode` комментарии
    // выбрасывает, и проверка на слова из комментария всегда красная.
    // Заодно это честнее: комментарий можно оставить, а правило убрать.
    const helper = read('utils/resolveSellerRequisites.ts');

    // Нет юрлица — всё по организации, как раньше.
    expect(helper).toContain('if (!legalEntity) return organizationMetadata;');

    // Есть юрлицо — реквизиты берутся у него, БЕЗ отката к организации
    // по каждому полю в отдельности: смешивать нельзя.
    expect(helper).toMatch(/name: seller\.name/);
    expect(helper).toMatch(/bankAccount: seller\.bankAccount/);
    expect(helper).not.toMatch(/seller\.inn \|\|/);
  });

  it('проверка и правда читает файлы форм', () => {
    DOCUMENT_FORMS.forEach((form) => {
      expect(read(form.file).length).toBeGreaterThan(1000);
    });
  });
});
