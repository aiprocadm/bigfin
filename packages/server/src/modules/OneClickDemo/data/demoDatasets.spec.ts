// © 2026 Bigfin
import {
  DEMO_DATASETS,
  DEMO_INDUSTRIES,
  DemoIndustry,
  datasetForIndustry,
  parseDemoIndustry,
  projectDemoMoney,
} from './index';

/**
 * Отраслевые демо-наборы (FIN-027 ТЗ-2).
 *
 * Демо — это первое, что видит человек. Пустой или несходящийся набор
 * убивает доверие к продукту раньше, чем человек дойдёт до своих данных,
 * и второго раза не будет.
 */
const industries = DEMO_INDUSTRIES;

/** Итог счёта покупателю по его позициям. */
const invoiceTotal = (invoice: any) =>
  invoice.entries.reduce((sum: number, e: any) => sum + e.quantity * e.rate, 0);

describe('отраслевые демо-наборы', () => {
  it('их ровно три и все на месте', () => {
    expect(industries).toEqual(['services', 'trade', 'projects']);
    industries.forEach((industry) => {
      expect(DEMO_DATASETS[industry]).toBeDefined();
    });
  });

  describe.each(industries)('набор «%s»', (industry: DemoIndustry) => {
    const dataset = DEMO_DATASETS[industry];

    it('знает свою отрасль', () => {
      // Иначе набор, скопированный с соседнего, тихо выдаёт себя за него.
      expect(dataset.industry).toBe(industry);
    });

    it('в нём есть кого показать', () => {
      expect(dataset.customers.length).toBeGreaterThanOrEqual(3);
      expect(dataset.vendors.length).toBeGreaterThanOrEqual(2);
      expect(dataset.items.length).toBeGreaterThanOrEqual(3);
    });

    it('деньги ДВИЖУТСЯ: есть и поступления, и траты', () => {
      // Продукт про управление деньгами, показывающий бизнес без движения
      // денег, не объясняет ничего.
      expect(dataset.payments.length).toBeGreaterThan(0);
      expect(dataset.expenses.length).toBeGreaterThan(0);
    });

    it('есть просроченный счёт покупателю', () => {
      // Без него не видно ни пометки «просрочено», ни блока «Требует
      // внимания» — то есть половины того, ради чего продукт нужен.
      const overdue = dataset.invoices.filter(
        (invoice) => invoice.issuedDaysAgo > invoice.termDays,
      );

      expect(overdue.length).toBeGreaterThan(0);
    });

    it('есть неоплаченный счёт покупателю', () => {
      const unpaid = dataset.invoices.filter((invoice, index) => {
        const paid = dataset.payments
          .filter((payment) => payment.invoiceIndex === index)
          .reduce((sum, payment) => sum + payment.amount, 0);

        return invoiceTotal(invoice) > paid;
      });

      expect(unpaid.length).toBeGreaterThan(0);
    });

    it('оплата НЕ БОЛЬШЕ счёта, к которому привязана', () => {
      // Переплата в демо выглядела бы как ошибка продукта, а не как
      // задумка: человек увидел бы отрицательный долг и не понял бы, чей
      // это промах.
      dataset.payments.forEach((payment) => {
        const invoice = dataset.invoices[payment.invoiceIndex];

        expect(invoice).toBeDefined();
        expect(payment.amount).toBeLessThanOrEqual(invoiceTotal(invoice));
      });
    });

    it('оплата и счёт ссылаются на ОДНОГО покупателя', () => {
      dataset.payments.forEach((payment) => {
        expect(dataset.invoices[payment.invoiceIndex].customerIndex).toBe(
          payment.customerIndex,
        );
      });
    });

    it('все ссылки внутри набора ведут в существующее', () => {
      // Ссылка мимо списка не уронит постройку, но молча выкинет документ —
      // и демо окажется беднее, чем задумано, без единого признака.
      dataset.invoices.forEach((invoice) => {
        expect(dataset.customers[invoice.customerIndex]).toBeDefined();
        invoice.entries.forEach((entry) => {
          expect(dataset.items[entry.itemIndex]).toBeDefined();
        });
      });
      dataset.bills.forEach((bill) => {
        expect(dataset.vendors[bill.vendorIndex]).toBeDefined();
      });
    });

    it('НА СЕГОДНЯ ДЕНЬГИ НА СЧЕТУ ЕСТЬ', () => {
      // Демо, которое открывается с минусом на счету, читается как
      // сломанное, а не как поучительное.
      expect(projectDemoMoney(dataset).today).toBeGreaterThan(0);
    });

    it('ВПЕРЕДИ ЕСТЬ КАССОВЫЙ РАЗРЫВ', () => {
      // Приёмка 2 FIN-027. Без него виджет денег и платёжный календарь —
      // главное, что отличает продукт, — показывают ровную линию и не
      // объясняют, зачем они нужны.
      const gap = projectDemoMoney(dataset).gap;

      expect(gap).not.toBeNull();
      expect(gap!.balance).toBeLessThan(0);
      expect(gap!.dayOffset).toBeGreaterThan(0);
    });

    it('разрыв наступает НЕ ЗАВТРА и не через полгода', () => {
      // Слишком близкий не даёт времени разобраться, слишком далёкий не
      // попадает в горизонт, который человек смотрит в первый заход.
      const gap = projectDemoMoney(dataset).gap!;

      expect(gap.dayOffset).toBeGreaterThanOrEqual(3);
      expect(gap.dayOffset).toBeLessThanOrEqual(45);
    });

    it('набор остаётся МАЛЕНЬКИМ', () => {
      // Приёмка 3 FIN-027 требует постройки меньше чем за полминуты.
      // Каждый документ создаётся обычной службой продукта, то есть это
      // отдельная запись в базу с проверками; счёт документов и есть то,
      // чем здесь можно управлять.
      const documents =
        dataset.customers.length +
        dataset.vendors.length +
        dataset.items.length +
        dataset.invoices.length +
        dataset.payments.length +
        dataset.expenses.length +
        dataset.bills.length;

      expect(documents).toBeLessThanOrEqual(25);
    });

    it('всё по-русски', () => {
      // Набор целиком на русском — правило FIN-027. Латиница остаётся
      // только в служебных полях: кодах позиций и адресах почты.
      const humanText = [
        ...dataset.customers.map((c) => c.displayName),
        ...dataset.vendors.map((v) => v.displayName),
        ...dataset.items.map((i) => i.name),
        ...dataset.expenses.map((e) => e.description),
        ...dataset.bills.map((b) => b.note),
      ];

      humanText.forEach((text) => {
        expect(text).toMatch(/[А-Яа-яЁё]/);
      });
    });
  });

  describe('разбор отрасли из запроса', () => {
    it('знакомые значения проходят', () => {
      expect(parseDemoIndustry('trade')).toBe('trade');
      expect(parseDemoIndustry('projects')).toBe('projects');
    });

    it('чужое значение даёт САМЫЙ ЧАСТЫЙ случай, а не ошибку', () => {
      // Человек нажал «посмотреть продукт»: уронить его запрос из-за
      // опечатки в адресе значило бы потерять его совсем.
      expect(parseDemoIndustry('строительство')).toBe('services');
      expect(parseDemoIndustry(undefined)).toBe('services');
      expect(datasetForIndustry('').industry).toBe('services');
    });
  });

  describe('наборы не повторяют друг друга', () => {
    it('у каждого свои контрагенты', () => {
      // Три «примера отрасли» с одинаковыми ООО «Ромашка» — это один
      // пример, показанный трижды.
      const names = industries.flatMap((industry) =>
        DEMO_DATASETS[industry].customers.map((c) => c.displayName),
      );

      expect(new Set(names).size).toBe(names.length);
    });

    it('у каждого своя строка «что в наборе»', () => {
      const keys = industries.map((i) => DEMO_DATASETS[i].summaryKey);

      expect(new Set(keys).size).toBe(keys.length);
    });
  });
});
