// © 2026 Bigfin
import {
  matchesAnyState,
  resolveTransactionState,
} from './resolveTransactionState';

/**
 * Состояние денежной операции (FIN-003 ТЗ-2).
 *
 * Шесть комбинаций, которые ТЗ требует закрыть: черновик, частичная оплата,
 * полная оплата, просрочка, план и материализованный план. Ошибка здесь
 * тихая: бейдж «нам должны» на оплаченном счёте заставит человека звонить
 * покупателю, которому он ничего не должен.
 */
const TODAY = '2026-09-20';

describe('состояние операции', () => {
  describe('счёт покупателю', () => {
    it('неоплаченный со сроком в будущем — «нам должны», и только', () => {
      const states = resolveTransactionState(
        {
          documentType: 'SaleInvoice',
          documentId: 7,
          documentStatus: 'published',
          balance: 50_000,
          dueDate: '2026-10-01',
        },
        TODAY,
      );

      expect(states.map((s) => s.kind)).toEqual(['receivable']);
      expect(states[0].dueDate).toBe('2026-10-01');
      expect(states[0].documentId).toBe(7);
    });

    it('неоплаченный с прошедшим сроком — ДВА состояния', () => {
      // Долг и просрочка — разные факты: первый ждёт, второй требует
      // действия. Заменить один другим значит потерять половину смысла.
      const states = resolveTransactionState(
        {
          documentType: 'SaleInvoice',
          documentStatus: 'published',
          balance: 50_000,
          dueDate: '2026-09-01',
        },
        TODAY,
      );

      expect(states.map((s) => s.kind)).toEqual(['receivable', 'overdue']);
    });

    it('частично оплаченный всё ещё «нам должны»', () => {
      const states = resolveTransactionState(
        {
          documentType: 'SaleInvoice',
          documentStatus: 'published',
          balance: 1,
          dueDate: '2026-10-01',
        },
        TODAY,
      );

      expect(states.map((s) => s.kind)).toEqual(['receivable']);
    });

    it('ПОЛНОСТЬЮ ОПЛАЧЕННЫЙ не даёт ни одного бейджа', () => {
      // Это и есть «всё хорошо». Бейдж здесь кричал бы без повода, и на
      // третий день человек перестал бы читать бейджи вообще.
      const states = resolveTransactionState(
        {
          documentType: 'SaleInvoice',
          documentStatus: 'published',
          balance: 0,
          dueDate: '2026-09-01',
        },
        TODAY,
      );

      expect(states).toEqual([]);
    });

    it('ЧЕРНОВИК состояний не порождает', () => {
      // Черновик ещё ничего не обещает: ни долга, ни срока.
      const states = resolveTransactionState(
        {
          documentType: 'SaleInvoice',
          documentStatus: 'draft',
          balance: 50_000,
          dueDate: '2026-09-01',
        },
        TODAY,
      );

      expect(states).toEqual([]);
    });
  });

  describe('счёт поставщика', () => {
    it('неоплаченный — «мы должны»', () => {
      const states = resolveTransactionState(
        {
          documentType: 'Bill',
          documentStatus: 'published',
          balance: 30_000,
          dueDate: '2026-10-05',
        },
        TODAY,
      );

      expect(states.map((s) => s.kind)).toEqual(['payable']);
    });

    it('просроченный — «мы должны» и «просрочено»', () => {
      const states = resolveTransactionState(
        {
          documentType: 'Bill',
          documentStatus: 'published',
          balance: 30_000,
          dueDate: '2026-08-31',
        },
        TODAY,
      );

      expect(states.map((s) => s.kind)).toEqual(['payable', 'overdue']);
    });
  });

  describe('плановая операция', () => {
    it('запланированная — «план»', () => {
      const states = resolveTransactionState(
        { source: 'planned', plannedStatus: 'planned', plannedDate: '2026-10-01' },
        TODAY,
      );

      expect(states.map((s) => s.kind)).toEqual(['planned']);
    });

    it('план с прошедшей датой ещё и просрочен', () => {
      const states = resolveTransactionState(
        { source: 'planned', plannedStatus: 'planned', plannedDate: '2026-09-01' },
        TODAY,
      );

      expect(states.map((s) => s.kind)).toEqual(['planned', 'overdue']);
    });

    it('МАТЕРИАЛИЗОВАННЫЙ план состояний не даёт', () => {
      // Он уже стал фактом, и факт показывается отдельной строкой. Оставь
      // мы бейдж «план» — одна операция выглядела бы как две.
      const states = resolveTransactionState(
        {
          source: 'planned',
          plannedStatus: 'materialized',
          plannedDate: '2026-09-01',
        },
        TODAY,
      );

      expect(states).toEqual([]);
    });
  });

  describe('вырожденные случаи', () => {
    it('строка без документа состояний не даёт', () => {
      expect(resolveTransactionState({}, TODAY)).toEqual([]);
    });

    it('пустая строка не роняет расчёт', () => {
      expect(resolveTransactionState(null as any, TODAY)).toEqual([]);
    });

    it('незнакомый вид документа с остатком не выдумывает состояние', () => {
      // Лучше не сказать ничего, чем назвать перевод долгом.
      const states = resolveTransactionState(
        {
          documentType: 'TransferToAccount',
          documentStatus: 'published',
          balance: 1_000,
          dueDate: '2026-01-01',
        },
        TODAY,
      );

      expect(states).toEqual([]);
    });
  });

  describe('отбор по состоянию (FIN-009)', () => {
    const overdueInvoice = resolveTransactionState(
      {
        documentType: 'SaleInvoice',
        documentStatus: 'published',
        balance: 10,
        dueDate: '2026-01-01',
      },
      TODAY,
    );

    it('без отбора проходят все строки', () => {
      expect(matchesAnyState(overdueInvoice, [])).toBe(true);
      expect(matchesAnyState([], [])).toBe(true);
    });

    it('несколько состояний объединяются по ИЛИ', () => {
      // Человек, отметивший «просрочено» и «план», хочет видеть и то, и
      // другое, а не их пересечение — которого не бывает вовсе.
      expect(matchesAnyState(overdueInvoice, ['overdue', 'planned'])).toBe(
        true,
      );
    });

    it('строка без нужного состояния не проходит', () => {
      expect(matchesAnyState(overdueInvoice, ['payable'])).toBe(false);
      expect(matchesAnyState([], ['overdue'])).toBe(false);
    });
  });
});
