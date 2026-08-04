import { describe, it, expect } from 'vitest';
import {
  mapDebtsOverview,
  mapDebtContact,
  mapDebtDocuments,
} from './mapDebts';

/** Ответ сервера как есть — snake_case. */
const overviewResponse = {
  receivable: {
    total: 160000,
    current: 60000,
    buckets: [0, 100000, 0, 0],
    overdue_total: 100000,
    contacts: [
      {
        current: 60000,
        buckets: [0, 100000, 0, 0],
        total: 160000,
        contact_id: 1,
        contact_name: 'ООО «Ромашка»',
        overdue_total: 100000,
        worst_bucket_index: 1,
      },
    ],
    top: [],
  },
  payable: {
    total: 0,
    current: 0,
    buckets: [0, 0, 0, 0],
    overdue_total: 0,
    contacts: [],
    top: [],
  },
  net: 160000,
  base_currency: 'RUB',
  as_date: '2026-08-04',
};

const documentsResponse = [
  {
    id: 1,
    side: 'receivable',
    number: 'СЧ-001',
    date: '2026-05-20',
    total: 100000,
    due_date: '2026-06-20',
    due_amount: 100000,
    overdue_days: 45,
  },
];

describe('обзор долгов', () => {
  it('читает сумму просрочки — она показывалась нулём', () => {
    const overview = mapDebtsOverview(overviewResponse);

    // На экране «Просрочено: 0 ₽» соседствовало с корзиной на 100 000.
    expect(overview.receivable.overdueTotal).toBe(100000);
  });

  it('корзины просрочки сохраняются по порядку', () => {
    const overview = mapDebtsOverview(overviewResponse);

    expect(overview.receivable.buckets).toEqual([0, 100000, 0, 0]);
  });

  it('читает имя должника — строка была без названия', () => {
    const [contact] = mapDebtsOverview(overviewResponse).receivable.contacts;

    expect(contact.contactName).toBe('ООО «Ромашка»');
  });

  it('читает идентификатор должника — без него детализация не открывалась', () => {
    const [contact] = mapDebtsOverview(overviewResponse).receivable.contacts;

    // Компонент раскрытия запрашивает документы по contactId; ноль отключал запрос.
    expect(contact.contactId).toBe(1);
  });

  it('худшая корзина контрагента переносится', () => {
    const [contact] = mapDebtsOverview(overviewResponse).receivable.contacts;

    expect(contact.worstBucketIndex).toBe(1);
  });

  it('сторона «мы должны» разбирается так же', () => {
    const overview = mapDebtsOverview({
      ...overviewResponse,
      payable: { total: 5000, overdue_total: 5000, buckets: [5000, 0, 0, 0] },
    });

    expect(overview.payable.overdueTotal).toBe(5000);
    expect(overview.payable.contacts).toEqual([]);
  });

  it('переносит сальдо, валюту и дату', () => {
    const overview = mapDebtsOverview(overviewResponse);

    expect(overview.net).toBe(160000);
    expect(overview.baseCurrency).toBe('RUB');
    expect(overview.asDate).toBe('2026-08-04');
  });

  it('понимает camelCase, если сервер отдаст его', () => {
    const contact = mapDebtContact({
      contactId: 7,
      contactName: 'ИП Петров',
      overdueTotal: 300,
    });

    expect(contact).toMatchObject({
      contactId: 7,
      contactName: 'ИП Петров',
      overdueTotal: 300,
    });
  });

  it('пустой ответ не роняет страницу', () => {
    const overview = mapDebtsOverview(undefined);

    expect(overview.receivable.total).toBe(0);
    expect(overview.receivable.buckets).toEqual([0, 0, 0, 0]);
    expect(overview.receivable.contacts).toEqual([]);
  });
});

describe('документы контрагента', () => {
  it('читает срок оплаты, сумму долга и дни просрочки', () => {
    const [doc] = mapDebtDocuments(documentsResponse);

    expect(doc).toMatchObject({
      number: 'СЧ-001',
      dueDate: '2026-06-20',
      dueAmount: 100000,
      overdueDays: 45,
    });
  });

  it('дата с временем обрезается до дня', () => {
    const [doc] = mapDebtDocuments([
      { ...documentsResponse[0], due_date: '2026-06-20T00:00:00.000Z' },
    ]);

    expect(doc.dueDate).toBe('2026-06-20');
  });

  it('не просроченный документ имеет ноль дней, а не пусто', () => {
    const [doc] = mapDebtDocuments([
      { id: 2, number: 'СЧ-002', due_amount: 60000, overdue_days: 0 },
    ]);

    expect(doc.overdueDays).toBe(0);
    expect(typeof doc.overdueDays).toBe('number');
  });

  it('пустой список остаётся пустым', () => {
    expect(mapDebtDocuments(undefined)).toEqual([]);
  });
});
