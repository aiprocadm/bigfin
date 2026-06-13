import * as fs from 'fs';
import * as path from 'path';

const loadMail = (locale: string): Record<string, string> =>
  JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '..', '..', 'i18n', locale, 'mail.json'),
      'utf8',
    ),
  );

/**
 * Проверки серверного словаря писем (русификация, этап 3).
 *
 * Ключевой риск механизма: лейблы/темы/тела содержат плейсхолдеры
 * (`{invoiceNumber}`, `{Customer Name}`), которые подставляются ПОЗЖЕ —
 * React-шаблоном (`.replace`) или Mustache (`formatMailOptions`). Перевод
 * через nestjs-i18n вызывается БЕЗ args, поэтому форматтер (string-format)
 * не запускается и токены остаются нетронутыми. Эти тесты фиксируют контракт.
 */
describe('mail translations (en/ru)', () => {
  const en = loadMail('en');
  const ru = loadMail('ru');

  it('en и ru имеют одинаковый набор ключей (парность)', () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
  });

  it('русские значения действительно на русском', () => {
    expect(ru['label.subtotal']).toBe('Подытог');
    expect(ru['label.total']).toBe('Итого');
    expect(ru['label.due_amount']).toBe('К оплате');
    expect(ru['invoice.view_button']).toBe('Открыть счёт');
  });

  it('лейбл номера счёта подставляет значение как в React-шаблоне (.replace)', () => {
    // Зеркалит InvoicePaymentEmail.tsx: label.replace('{invoiceNumber}', invoiceNumber)
    const rendered = ru['invoice.number_label'].replace(
      '{invoiceNumber}',
      'INV-001',
    );
    expect(rendered).toBe('Счёт № INV-001');
  });

  it('тема и тело сохраняют Mustache-плейсхолдеры для formatMailOptions', () => {
    // Перевод вызывается без args → токены не затёрты string-format.
    expect(ru['invoice.subject']).toContain('{Customer Name}');
    expect(ru['invoice.subject']).toContain('{Company Name}');
    expect(ru['invoice.subject']).toContain('{Invoice Number}');
    expect(ru['invoice.body']).toContain('{Invoice Number}');
    expect(ru['invoice.body']).toContain('{Invoice Due Amount}');
    expect(ru['invoice.subject']).toContain('Счёт');
  });

  it('смета/квитанция/оплата: русские значения и сохранённые токены', () => {
    expect(ru['estimate.view_button']).toBe('Открыть смету');
    expect(ru['estimate.number_label'].replace('{estimateNumber}', 'EST-7')).toBe(
      'Смета № EST-7',
    );
    expect(ru['estimate.subject']).toContain('{Estimate Number}');

    expect(ru['receipt.number_label'].replace('{receiptNumber}', 'RC-3')).toBe(
      'Чек № RC-3',
    );
    expect(ru['receipt.subject']).toContain('{Company Name}');

    expect(ru['payment.number_label'].replace('{paymentNumber}', 'PMT-9')).toBe(
      'Платёж № PMT-9',
    );
    expect(ru['payment.body']).toContain('{Payment Amount}');
  });
});
