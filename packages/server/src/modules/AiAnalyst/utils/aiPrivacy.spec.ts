// © 2026 Bigfin
import {
  ALLOWED_AGGREGATE_FIELDS,
  BLACKLISTED_FIELDS,
  assertNoPrivateData,
  findPrivacyViolations,
} from './aiPrivacy';

/**
 * Этап 13 ТЗ, §13.4 — ТРЕБУЕМЫЙ ТЕСТ: «в промпт не попадает ни одно поле из
 * чёрного списка (назначение платежа, ИНН, ФИО, названия контрагентов)».
 *
 * Отправка в модель — это отправка НАРУЖУ, на чужой сервер, и отозвать
 * отправленное нельзя.
 */
describe('чёрный список ТЗ', () => {
  it('назначение платежа не проходит', () => {
    const violations = findPrivacyViolations({
      label: 'Реклама',
      description: 'Оплата Иванову И.И. по договору №14',
    });

    expect(violations).toHaveLength(1);
    expect(violations[0].field).toBe('description');
    expect(violations[0].blacklisted).toBe(true);
  });

  it('ИНН не проходит', () => {
    expect(findPrivacyViolations({ label: 'ООО', inn: '7707083893' })).toEqual([
      { path: '$.inn', field: 'inn', blacklisted: true },
    ]);
  });

  it('ФИО не проходит', () => {
    const violations = findPrivacyViolations({
      firstName: 'Иван',
      lastName: 'Иванов',
      fullName: 'Иванов Иван Иванович',
    });

    expect(violations.map((v) => v.field).sort()).toEqual([
      'firstName',
      'fullName',
      'lastName',
    ]);
  });

  it('название контрагента не проходит', () => {
    const violations = findPrivacyViolations({
      contactName: 'ООО «Ромашка»',
      customerName: 'ИП Петров',
      vendorName: 'ООО «Поставщик»',
    });

    expect(violations).toHaveLength(3);
    expect(violations.every((v) => v.blacklisted)).toBe(true);
  });

  it('все поля чёрного списка ТЗ перечислены', () => {
    // Сторож самого списка: если кто-то вычистит из него назначение платежа
    // или реквизиты, проверка выше станет зелёной и бессмысленной.
    ['description', 'inn', 'fullName', 'contactName'].forEach((field) => {
      expect(BLACKLISTED_FIELDS as readonly string[]).toContain(field);
    });
  });
});

describe('разрешено только перечисленное', () => {
  it('настоящий агрегат проходит', () => {
    expect(
      findPrivacyViolations({
        rows: [
          {
            label: 'Закупки',
            amount: 2_800_000,
            previousAmount: 1_000_000,
            changePercent: 180,
            share: 0.31,
            reportKey: 'profit_loss',
            link: '/financial-reports/profit-loss-sheet',
          },
        ],
      }),
    ).toEqual([]);
  });

  it('НЕИЗВЕСТНОЕ поле тоже не проходит', () => {
    // Главное свойство списка: он разрешительный. Обратный подход
    // («запрещаем известные плохие поля») пропустил бы первое же новое
    // поле, которое кто-нибудь добавит в агрегат, — и пропустил бы молча.
    const violations = findPrivacyViolations({ counterpartyComment: 'что-то' });

    expect(violations).toHaveLength(1);
    expect(violations[0].blacklisted).toBe(false);
  });

  it('запрещённое поле находится и в глубине', () => {
    // Утечка обычно не на верхнем уровне, а внутри вложенной строки отчёта.
    const violations = findPrivacyViolations({
      rows: [{ label: 'ок' }, { label: 'плохо', inn: '7707083893' }],
    });

    expect(violations).toHaveLength(1);
    expect(violations[0].path).toBe('$.rows[1].inn');
  });

  it('внутрь запрещённого поля не заходим', () => {
    // Оно не поедет целиком, и перечислять его содержимое незачем.
    const violations = findPrivacyViolations({
      bankDetails: { accountNumber: '40702810', inn: '7707083893' },
    });

    expect(violations).toHaveLength(1);
    expect(violations[0].field).toBe('bankDetails');
  });

  it('в разрешённых полях есть то, ради чего всё затевалось', () => {
    // ТЗ: «Только агрегаты: суммы по статьям, по месяцам, по проектам,
    // доли, отклонения».
    ['label', 'amount', 'share', 'changePercent', 'month'].forEach((field) => {
      expect(ALLOWED_AGGREGATE_FIELDS as readonly string[]).toContain(field);
    });
  });
});

describe('assertNoPrivateData', () => {
  it('чистые данные проходят молча', () => {
    expect(() =>
      assertNoPrivateData({ rows: [{ label: 'Реклама', amount: 100 }] }),
    ).not.toThrow();
  });

  it('грязные данные ЛОМАЮТ сборку, а не вычищаются тихо', () => {
    // Тихая вычистка означала бы, что настоящую утечку мы бы «починили»
    // незаметно для себя и никогда о ней не узнали.
    expect(() =>
      assertNoPrivateData({ rows: [{ label: 'x', description: 'секрет' }] }),
    ).toThrow(/нельзя отправлять наружу/);
  });

  it('в тексте ошибки видно, какое именно поле', () => {
    // «Поле не разрешено» не подсказывает, что чинить.
    expect(() => assertNoPrivateData({ inn: '7707083893' })).toThrow(/\$\.inn/);
  });
});
