// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';

import { transformReceiptToBrandingTemplateAttributes } from './utils';
import { transformCreditNoteToPdfTemplate } from '../CreditNotes/utils';
import { transformInvoiceToPdfTemplate } from '../SaleInvoices/utils';

/**
 * Сторож: номер документа доходит до печатной формы.
 *
 * Зачем он. В чеке сервер отдавал поле `receiptNumber`, а печатная форма
 * читает `receiptNumebr` — с перестановкой букв. Имена не совпадали, номер
 * до формы НЕ ДОХОДИЛ ВООБЩЕ, и шаблон подставлял свою заглушку
 * «346D3D40-0001». Её видел покупатель на каждом чеке.
 *
 * Поймать это глазами почти невозможно: обе стороны выглядят правильно, если
 * смотреть на них по отдельности. Поэтому сторож проверяет ОБЕ стороны сразу:
 * что отдаёт сервер и что читает форма.
 *
 * Переименовать поле в шаблонах нельзя: этим же ключом лежат сохранённые
 * настройки шаблонов в базе (JSON-поле `pdf_templates.attributes`), и
 * переименование осиротило бы их молча.
 */
const TEMPLATES_DIR = path.resolve(
  __dirname,
  '../../../../../shared/pdf-templates/src/components',
);

const templateSource = (name: string): string =>
  fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf-8');

describe('номер документа доходит до печатной формы', () => {
  it('исходники шаблонов на месте', () => {
    // Иначе проверки ниже стали бы пустыми и зелёными.
    expect(templateSource('ReceiptPaperTemplate.tsx').length).toBeGreaterThan(
      500,
    );
  });

  describe('чек', () => {
    const KEY = 'receiptNumebr';

    it('сервер отдаёт номер под тем именем, что читает форма', () => {
      const attributes = transformReceiptToBrandingTemplateAttributes({
        receiptNumber: 'R-42',
        entries: [],
        customer: {},
      } as any);

      expect(attributes[KEY]).toBe('R-42');
    });

    it('форма читает именно это имя', () => {
      // Вторая половина сторожа: если шаблон однажды переименуют, проверка
      // выше останется зелёной и перестанет что-либо значить.
      expect(templateSource('ReceiptPaperTemplate.tsx')).toContain(KEY);
    });
  });

  describe('кредит-нота', () => {
    const KEY = 'creditNoteNumebr';

    it('сервер отдаёт номер под тем именем, что читает форма', () => {
      const attributes = transformCreditNoteToPdfTemplate({
        creditNoteNumber: 'CN-7',
        entries: [],
        customer: {},
      } as any);

      expect(attributes[KEY]).toBe('CN-7');
    });

    it('форма читает именно это имя', () => {
      expect(templateSource('CreditNotePaperTemplate.tsx')).toContain(KEY);
    });
  });

  describe('счёт', () => {
    const KEY = 'invoiceNumber';

    it('сервер отдаёт номер под тем именем, что читает форма', () => {
      const attributes = transformInvoiceToPdfTemplate({
        invoiceNo: 'INV-3',
        entries: [],
        taxes: [],
        customer: {},
      } as any);

      expect(attributes[KEY]).toBe('INV-3');
    });

    it('форма читает именно это имя', () => {
      expect(templateSource('InvoicePaperTemplate.tsx')).toContain(KEY);
    });
  });

  it('заглушка шаблона не совпадает с настоящим номером', () => {
    // Смысл всей проверки: пока имена расходились, в форму попадала именно
    // эта строка. Если она когда-нибудь станет пустой, расхождение снова
    // перестанет быть заметным.
    expect(templateSource('ReceiptPaperTemplate.tsx')).toContain(
      '346D3D40-0001',
    );
  });
});
