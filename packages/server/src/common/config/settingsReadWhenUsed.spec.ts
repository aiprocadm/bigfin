import { Chromiumly } from '@/libs/chromiumly/Chromiumly';
import { exportRowsLimit } from '@/modules/Export/exportRowsLimit';
import { reportRowsLimit } from '@/modules/FinancialStatements/common/reportRowsLimit';

/**
 * Н1 карты v38. Настройка действует, когда её прочитали.
 *
 * Сервер не читает `.env` сам — его читает `ConfigModule` во время запуска
 * приложения. Всё, что прочитало окружение РАНЬШЕ (на загрузке модуля),
 * получает пустоту: адрес службы печати оказывался пустым, и печать
 * падала с «Invalid URL» — 500 на счёте, счёте на оплату, акте и УПД.
 *
 * Стенд печатает только потому, что его настройки подставляет systemd до
 * старта процесса. У того, кто запускает продукт по инструкции
 * (`cp .env.example .env` → `pnpm dev`), печати нет вовсе.
 *
 * Проверка ниже воспроизводит именно это: переменная появляется ПОСЛЕ
 * загрузки модуля — так же, как её приносит `ConfigModule`.
 */
describe('настройки читаются в момент обращения', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it('адрес службы печати виден, даже если .env прочитан позже', () => {
    process.env.GOTENBERG_URL = 'http://gotenberg:3000';

    expect(Chromiumly.GOTENBERG_ENDPOINT).toBe('http://gotenberg:3000');
  });

  it('адрес шаблонов печати виден так же', () => {
    process.env.GOTENBERG_DOCS_URL = 'http://server:3000/public/';

    expect(Chromiumly.GOTENBERG_DOCS_ENDPOINT).toBe(
      'http://server:3000/public/',
    );
  });

  it('без настройки адрес пустой, а не «undefined» строкой', () => {
    delete process.env.GOTENBERG_URL;

    expect(Chromiumly.GOTENBERG_ENDPOINT).toBe('');
  });

  it('потолок строк выгрузки берётся из окружения', () => {
    process.env.EXPORT_ROWS_LIMIT = '250';

    expect(exportRowsLimit()).toBe(250);
  });

  it('потолок строк выгрузки по умолчанию — сто тысяч', () => {
    delete process.env.EXPORT_ROWS_LIMIT;

    expect(exportRowsLimit()).toBe(100000);
  });

  it('потолок строк отчёта берётся из окружения', () => {
    process.env.REPORT_ROWS_LIMIT = '300';

    expect(reportRowsLimit()).toBe(300);
  });

  it('потолок строк отчёта по умолчанию — пятьдесят тысяч', () => {
    delete process.env.REPORT_ROWS_LIMIT;

    expect(reportRowsLimit()).toBe(50000);
  });
});
