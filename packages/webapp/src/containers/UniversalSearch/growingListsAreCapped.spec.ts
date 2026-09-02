// © 2026 Bigfin
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import { activeCode } from '../../testing/activeCode';

/**
 * Карта v49. Растущий список не отдаёт всё, что накопилось.
 *
 * Замер: из 35 списочных запросов сервера ограничение выдачи было у шести.
 * Остальные отдавали всё, а витрина рисовала это одним куском. Пока записей
 * десятки — незаметно; на растущем реестре заявок (заявку заводят на каждый
 * платёж) это долгая загрузка и подвисший телефон, а основатель работает с
 * продуктом с телефона.
 *
 * Правило: у списка, который растёт вместе с работой, есть потолок выдачи
 * на сервере И честная подпись на экране. Одно без другого — молча
 * обрезанный список: человек ищет свою запись глазами, не находит и решает,
 * что она пропала.
 */
const ROOT = path.resolve(__dirname, '../../../../..');

const read = (relative: string): string =>
  activeCode(fs.readFileSync(path.join(ROOT, relative), 'utf8'));

/** Списки, которые растут вместе с работой предпринимателя. */
const GROWING = [
  {
    name: 'сделки',
    service: 'packages/server/src/modules/Deals/queries/GetDeals.service.ts',
    page: 'packages/webapp/src/containers/Deals/DealsPage.tsx',
  },
  {
    name: 'заявки на оплату',
    service:
      'packages/server/src/modules/PaymentRequests/queries/GetPaymentRequests.service.ts',
    page: 'packages/webapp/src/containers/PaymentRequests/PaymentRequestsPage.tsx',
  },
  {
    name: 'основные средства',
    service:
      'packages/server/src/modules/FixedAssets/queries/GetFixedAssets.service.ts',
    page: 'packages/webapp/src/containers/FixedAssets/FixedAssetsPage.tsx',
  },
  {
    name: 'плановые операции',
    service:
      'packages/server/src/modules/PaymentCalendar/queries/GetPlannedOperations.service.ts',
    page: 'packages/webapp/src/containers/PaymentCalendar/PaymentCalendarPage.tsx',
  },
];

describe('растущие списки', () => {
  it.each(GROWING)('$name: сервер ставит потолок выдачи', ({ service }) => {
    expect(read(service)).toContain('applyListCap(');
  });

  it.each(GROWING)('$name: сервер сообщает, что есть ещё', ({ service }) => {
    // Потолок без признака — молча обрезанный список.
    expect(read(service)).toContain('splitCapped(');
  });

  it.each(GROWING)('$name: экран говорит, что показал не всё', ({ page }) => {
    expect(read(page)).toContain('<ListTruncated');
  });
});
