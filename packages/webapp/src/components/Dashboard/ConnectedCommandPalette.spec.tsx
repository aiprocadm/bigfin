import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

/**
 * DoD этапа 45 ТЗ-4: ⌘K находит контрагента, счёт покупателю, операцию по
 * сумме и действие «Добавить приход».
 *
 * Сервер подменён: ответы — в той же форме, что отдают настоящие ручки
 * (`/customers` → `customers`, `/sale-invoices` → `sales_invoices`,
 * `/banking/transactions` → `transactions`).
 */
const dispatch = vi.fn();
const push = vi.fn();
const runMoneyIn = vi.fn();
const http = vi.fn();

vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string, vars?: Record<string, unknown>) =>
      key === 'command_palette.operations_all'
        ? `Все операции на сумму ${vars?.amount}`
        : (
            {
              'command_palette.group.actions': 'Действия',
              'command_palette.group.go': 'Перейти',
              'command_palette.group.operations': 'Операции',
              'command_palette.title': 'Поиск и команды',
            } as Record<string, string>
          )[key] ?? key,
  },
}));
vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (select: (state: any) => unknown) => select({ globalSearch: { isOpen: true } }),
}));
vi.mock('react-router-dom', () => ({ useHistory: () => ({ push }) }));
vi.mock('@/hooks/useRequest', () => ({ default: () => ({ http }) }));
vi.mock('@/hooks/utils/useAbilityContext', () => ({
  useAbilityContext: () => ({ can: () => true }),
  useAbilitiesFilter: () => (items: any[]) => items,
}));
vi.mock('@/containers/UniversalSearch/utils', () => ({
  getUniversalSearchBinds: () => [
    {
      resourceType: 'customer',
      optionItemLabel: 'Клиенты',
      itemSelect: (c: any) => ({ id: c.id, text: c.display_name, label: c.formatted_balance }),
    },
    {
      resourceType: 'invoice',
      optionItemLabel: 'Счета покупателям',
      itemSelect: (i: any) => ({ id: i.id, text: i.invoice_no, label: i.customer_name }),
    },
  ],
}));
vi.mock('./addActions', () => ({
  useAddActions: () => [
    {
      id: 'money-in',
      kind: 'money',
      label: 'Добавить приход',
      keywords: ['приход', 'поступление'],
      icon: () => null,
      run: runMoneyIn,
    },
  ],
}));
vi.mock('./ConnectedSidebar', () => ({
  useNavGroups: () => [
    { titleText: 'Отчёты', items: [{ href: '/financial-reports/balance-sheet', label: 'Баланс', labelText: 'Баланс' }] },
  ],
  menuTextString: (text: unknown) => String(text ?? ''),
}));

import { ConnectedCommandPalette } from './ConnectedCommandPalette';

beforeEach(() => {
  vi.useFakeTimers();
  dispatch.mockClear();
  push.mockClear();
  http.mockReset();
  http.mockImplementation(({ url, params }: any) => {
    if (url === '/api/customers') {
      return Promise.resolve({
        data: {
          customers: String(params.search_keyword).startsWith('Ромаш')
            ? [{ id: 5, display_name: 'ООО «Ромашка»', formatted_balance: '12 000,00 ₽' }]
            : [],
        },
      });
    }
    if (url === '/api/sale-invoices') {
      return Promise.resolve({
        data: {
          sales_invoices: String(params.search_keyword).startsWith('INV')
            ? [{ id: 9, invoice_no: 'INV-00042', customer_name: 'ООО «Ромашка»' }]
            : [],
        },
      });
    }
    if (url === '/api/banking/transactions') {
      return Promise.resolve({
        data: {
          transactions:
            params.minAmount === 500000
              ? [
                  {
                    reference_type: 'CashflowTransaction',
                    reference_id: 3,
                    date: '2026-09-19',
                    formatted_date: '19 сент. 2026',
                    contact_name: 'ООО «Ромашка»',
                    deposit: 500000,
                    formatted_deposit: '500 000,00 ₽',
                  },
                ]
              : [],
        },
      });
    }
    return Promise.resolve({ data: {} });
  });
});

async function type(value: string) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

describe('командная строка в продукте', () => {
  it('«Добавить приход» — среди действий и выполняется Enter', async () => {
    render(<ConnectedCommandPalette />);
    await type('прих');

    expect(screen.getByRole('option', { name: /Добавить приход/ })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(runMoneyIn).toHaveBeenCalledTimes(1);
  });

  it('находит контрагента и открывает его прежним путём', async () => {
    render(<ConnectedCommandPalette />);
    await type('Ромаш');

    const option = screen.getByRole('option', { name: /ООО «Ромашка»/ });
    fireEvent.click(option);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { resourceType: 'customer', resourceId: 5 } }),
    );
  });

  it('находит счёт покупателю по номеру', async () => {
    render(<ConnectedCommandPalette />);
    await type('INV-42');

    expect(screen.getByRole('group', { name: 'Счета покупателям' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /INV-00042/ })).toBeInTheDocument();
  });

  it('находит операцию по сумме и ведёт в реестр на неё', async () => {
    render(<ConnectedCommandPalette />);
    await type('500 000');

    // Находок может быть больше пяти — последним пунктом весь реестр.
    expect(screen.getByRole('option', { name: 'Все операции на сумму 500 000' })).toBeInTheDocument();
    const option = screen.getByRole('option', { name: /\+500 000,00 ₽ · ООО «Ромашка»/ });
    fireEvent.click(option);
    expect(push).toHaveBeenCalledWith(
      '/cashflow-accounts/transactions?fromDate=2026-09-19&toDate=2026-09-19&minAmount=500000&maxAmount=500000',
    );
  });

  it('пункты меню — в «Перейти»', async () => {
    render(<ConnectedCommandPalette />);
    await type('балан');

    fireEvent.click(screen.getByRole('option', { name: /Баланс/ }));
    expect(push).toHaveBeenCalledWith('/financial-reports/balance-sheet');
  });
});
