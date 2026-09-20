// © 2026 Bigfin
import { resolveTransactionState } from './resolveTransactionState';

/**
 * Срок оплаты обязан приходить СТРОКОЙ `ГГГГ-ММ-ДД`.
 *
 * НАЙДЕНО ЖИВЫМ ПРОХОДОМ ПО СТЕНДУ. Отбор «просрочено» находил восемнадцать
 * строк, а пометка «просрочено» не появлялась НИ РАЗУ. Причина: расчёт
 * сравнивает срок с сегодняшним днём как строки, а модель отдаёт дату
 * объектом. Сравнение объекта со строкой в JavaScript не падает — оно молча
 * даёт «не просрочено».
 *
 * Спека закрепляет обе стороны: что со строкой расчёт работает, и что с
 * объектом он МОЛЧА ВРЁТ — то есть приводить дату обязан вызывающий.
 */
const TODAY = '2026-09-20';

const overdueRow = (dueDate: unknown) => ({
  documentType: 'SaleInvoice',
  documentId: 1,
  documentStatus: 'delivered',
  balance: 100_000,
  dueDate: dueDate as any,
});

describe('срок оплаты в расчёте состояний', () => {
  it('со СТРОКОЙ даты просрочка находится', () => {
    const states = resolveTransactionState(overdueRow('2026-07-31'), TODAY);

    expect(states.map((state) => state.kind)).toEqual([
      'receivable',
      'overdue',
    ]);
  });

  it('с полной меткой времени — тоже', () => {
    // `'2026-07-31T00:00:00.000Z' < '2026-09-20'` сравнивается посимвольно
    // и даёт верный ответ: формат `ГГГГ-ММ-ДД` сортируется как текст так же,
    // как как дата.
    const states = resolveTransactionState(
      overdueRow('2026-07-31T00:00:00.000Z'),
      TODAY,
    );

    expect(states.map((state) => state.kind)).toContain('overdue');
  });

  it('С ОБЪЕКТОМ ДАТЫ РАСЧЁТ МОЛЧА ВРЁТ', () => {
    // Это и была поломка. Проверка стоит здесь, чтобы следующий, кто
    // передаст сюда `Date`, увидел причину сразу, а не через месяц на
    // стенде.
    const states = resolveTransactionState(
      overdueRow(new Date('2026-07-31')),
      TODAY,
    );

    expect(states.map((state) => state.kind)).not.toContain('overdue');
  });

  it('будущий срок просрочкой не считается', () => {
    const states = resolveTransactionState(overdueRow('2026-12-31'), TODAY);

    expect(states.map((state) => state.kind)).toEqual(['receivable']);
  });

  it('срока нет — просрочки нет, но долг остаётся', () => {
    const states = resolveTransactionState(overdueRow(null), TODAY);

    expect(states.map((state) => state.kind)).toEqual(['receivable']);
  });
});
