// © 2026 Bigfin
import { buildPdfContentDisposition } from './RuPrintForms.controller';

describe('buildPdfContentDisposition', () => {
  it('латинское имя файла отдаётся как есть', () => {
    expect(buildPdfContentDisposition('TORG12-INV-000123')).toBe(
      'attachment; filename="TORG12-INV-000123.pdf"; ' +
        "filename*=UTF-8''TORG12-INV-000123.pdf",
    );
  });

  it('кириллица в номере счёта не попадает в ASCII-часть заголовка', () => {
    const header = buildPdfContentDisposition('TORG12-СЧ-000123');

    // Значение заголовка обязано быть в диапазоне 0x20–0x7E,
    // иначе Node отвергнет его с ERR_INVALID_CHAR.
    expect(header).toMatch(/^[\x20-\x7E]*$/);
    expect(header).toContain('filename="TORG12-__-000123.pdf"');
    expect(header).toContain(
      `filename*=UTF-8''${encodeURIComponent('TORG12-СЧ-000123.pdf')}`,
    );
  });

  it('кавычки в номере не ломают ASCII-часть', () => {
    const header = buildPdfContentDisposition('Schet-"5"');

    expect(header).toContain(`filename="Schet-'5'.pdf"`);
    expect(header).toMatch(/^[\x20-\x7E]*$/);
  });

  it('заголовок принимается настоящим Node-ответом', () => {
    // Прямая проверка того самого сбоя: Node бросает ERR_INVALID_CHAR
    // на символах вне 0x20–0xFF в значении заголовка.
    const { ServerResponse } = require('http');
    const response = new ServerResponse({ method: 'GET' } as any);

    expect(() =>
      response.setHeader(
        'Content-Disposition',
        buildPdfContentDisposition('Schet-Счёт №5'),
      ),
    ).not.toThrow();
  });
});
