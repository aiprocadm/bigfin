import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string, args?: Record<string, unknown>) =>
      args ? `${key}:${Object.values(args).join(',')}` : key,
    getInitOptions: () => ({ currentLocale: 'ru' }),
  },
}));

// Форматы организации читают хранилище — здесь оно не нужно.
vi.mock('./aiCfoFormat', () => ({
  aiCfoFormatters: () => ({
    money: (value: number) => `${value} ₽`,
    percent: (value: number) => `${value} %`,
    date: (iso: string) => iso,
    none: 'нет базы',
  }),
  formatAiCfoDate: (iso: string) => iso,
  formatAiCfoDateTime: (value: string) => value,
}));

// Панель раскрытия сама ходит на сервер; проверяем только, что её открыли
// с нужной целью.
const drillPanel = vi.fn();
vi.mock('@/containers/FinancialStatements/ReportDrillDownPanel', () => ({
  default: (props: any) => {
    drillPanel(props.target);
    return props.target ? <div data-testid="drill-panel">{props.target.title}</div> : null;
  },
}));

// Кнопка действия зовёт права и запросы — её поведение проверяется отдельно.
vi.mock('./ActionButton', () => ({
  ActionButton: ({ action }: any) => <div data-testid="action">{action.label}</div>,
}));

import { AnswerCard } from './AnswerCard';
import type { AiCfoReply } from '@/hooks/query/aiCfo';

const base: AiCfoReply = {
  available: true,
  understood: true,
  intent: 'cash_decrease',
  period: { fromDate: '2026-09-01', toDate: '2026-09-24' },
  base: { fromDate: '2026-08-01', toDate: '2026-08-24' },
  empty: false,
  headline: 'Денег стало меньше на 120 000 ₽.',
  figures: [
    {
      key: 'net_change',
      label: 'Изменение остатка',
      value: -120000,
      kind: 'money',
      link: '/financial-reports/cash-flow-articles',
    },
    {
      key: 'rent',
      label: 'Аренда',
      value: 80000,
      kind: 'money',
      drill: { articleId: 7, fromDate: '2026-09-01', toDate: '2026-09-24', basis: 'cash' },
    },
  ],
  reasons: [{ text: 'Выросла аренда.', figureKey: 'rent' }],
  table: { columns: ['Статья', 'Было', 'Стало', 'Δ %'], rows: [['Аренда', 40000, 80000, 100]] },
  actions: [],
  links: [{ label: 'Деньги по статьям', href: '/financial-reports/cash-flow-articles' }],
  meta: { basis: 'по деньгам', currency: 'RUB', legalEntities: 'все юрлица (сводно)', calculatedAt: '2026-09-24 10:00:00' },
  explanation: { source: 'model', text: 'Главное — аренда.', rejectedNumbers: [] },
};

const renderCard = (reply: AiCfoReply, extra: Record<string, unknown> = {}) =>
  render(
    <MemoryRouter>
      <AnswerCard reply={reply} {...extra} />
    </MemoryRouter>,
  );

describe('карточка ответа AI CFO', () => {
  it('обычный ответ: вывод, числа и «Показать операции»', () => {
    renderCard(base);

    expect(screen.getByText('Денег стало меньше на 120 000 ₽.')).toBeTruthy();
    expect(screen.getByText('-120000 ₽')).toBeTruthy();
    // Аренда — и в числах, и в таблице «было / стало».
    expect(screen.getAllByText('80000 ₽')).toHaveLength(2);
    // У числа и у причины со ссылкой на него — по кнопке.
    expect(screen.getAllByText('ai_cfo.answer.show_operations')).toHaveLength(2);
    // Пометка источника пояснения.
    expect(screen.getByText('ai_cfo.explanation.model')).toBeTruthy();
    // Таблица: процент в столбце с %, деньги — в остальных.
    expect(screen.getByText('100 %')).toBeTruthy();
    expect(screen.getByText('40000 ₽')).toBeTruthy();
    // Подмены чисел не было — и пометки о ней нет.
    expect(screen.queryByText('ai_cfo.explanation.rejected')).toBeNull();
  });

  it('«Показать операции» открывает панель с фильтром числа', () => {
    renderCard(base);

    fireEvent.click(screen.getAllByText('ai_cfo.answer.show_operations')[0]);

    expect(screen.getByTestId('drill-panel').textContent).toBe('Аренда');
    expect(drillPanel).toHaveBeenLastCalledWith({
      articleId: 7,
      fromDate: '2026-09-01',
      toDate: '2026-09-24',
      basis: 'cash',
      title: 'Аренда',
    });
  });

  it('пустой период: только заголовок, без чисел и таблицы', () => {
    renderCard({
      ...base,
      empty: true,
      headline: 'За этот период операций нет.',
    });

    expect(screen.getByText('За этот период операций нет.')).toBeTruthy();
    expect(screen.queryByText('Изменение остатка')).toBeNull();
    expect(screen.queryByText('ai_cfo.answer.show_operations')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText('ai_cfo.explanation.model')).toBeNull();
  });

  it('модель назвала лишние числа — об их замене сказано', () => {
    renderCard({
      ...base,
      explanation: { source: 'model', text: 'см. отчёт', rejectedNumbers: [777], note: 'Пояснение сверено.' },
    });

    expect(screen.getByText('ai_cfo.explanation.rejected')).toBeTruthy();
    expect(screen.getByText('Пояснение сверено.')).toBeTruthy();
  });

  it('текст по расчёту помечен иначе, чем пересказ модели', () => {
    renderCard({ ...base, explanation: { source: 'template', text: 'По расчёту.', rejectedNumbers: [] } });

    expect(screen.getByText('ai_cfo.explanation.template')).toBeTruthy();
    expect(screen.queryByText('ai_cfo.explanation.model')).toBeNull();
  });

  it('вопрос не понят: сообщение и примеры кнопками', () => {
    const onPick = vi.fn();
    renderCard(
      { available: true, understood: false, message: 'Я отвечаю на вопросы о деньгах.' },
      { examples: ['Почему денег стало меньше?', 'Когда возможен кассовый разрыв?'], onPickExample: onPick },
    );

    expect(screen.getByText('Я отвечаю на вопросы о деньгах.')).toBeTruthy();
    fireEvent.click(screen.getByText('Когда возможен кассовый разрыв?'));
    expect(onPick).toHaveBeenCalledWith('Когда возможен кассовый разрыв?');
  });

  it('раздел выключен: только сообщение сервера, без примеров', () => {
    renderCard(
      { available: false, understood: false, message: 'Раздел ИИ выключен.' },
      { examples: ['Почему денег стало меньше?'] },
    );

    expect(screen.getByText('Раздел ИИ выключен.')).toBeTruthy();
    expect(screen.queryByText('Почему денег стало меньше?')).toBeNull();
  });

  it('предложенные действия показываются кнопками, а не выполняются', () => {
    renderCard({
      ...base,
      actions: [
        {
          kind: 'reschedule_planned_operation',
          label: 'Перенести «Аренда» с 2026-10-10 на 2026-10-25',
          plannedOperationId: 5,
          amount: 700000,
          fromDate: '2026-10-10',
          toDate: '2026-10-25',
          preview: { method: 'POST', path: '/payment-calendar/what-if', body: { moves: [] } },
          execute: { method: 'POST', path: '/payment-calendar/planned-operations/5/reschedule', body: { plannedDate: '2026-10-25' } },
          requiresConfirmation: true,
        },
      ],
    });

    expect(screen.getByTestId('action').textContent).toContain('Перенести «Аренда»');
  });
});
