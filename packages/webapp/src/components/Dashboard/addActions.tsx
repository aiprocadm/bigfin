import * as React from 'react';
import intl from 'react-intl-universal';
import { useHistory } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  type LucideIcon,
  Receipt,
  UserPlus,
} from 'lucide-react';

import { DialogsName } from '@/constants/dialogs';
import { useDialogActions } from '@/hooks/state';

/** Одно действие «Добавить». */
export interface AddAction {
  id: string;
  /** «money» — движение денег, «documents» — документы и справочники. */
  kind: 'money' | 'documents';
  label: string;
  /** Слова, по которым действие находит командная строка. */
  keywords: string[];
  icon: LucideIcon;
  /** Приход — зелёным (деньги пришли); остальное без цвета. */
  positive?: boolean;
  run: () => void;
}

/**
 * Что можно добавить — ОДИН список на три места (UI-045-4, §7 ТЗ-4): меню
 * «＋ Добавить» в шапке, шторка «Добавить» на телефоне и раздел «Действия»
 * командной строки. Раньше список жил в одной шапке, а нижняя панель знала
 * только приход — на телефоне расход записать было нечем, кроме как через
 * меню разделов.
 *
 * ЕЖЕДНЕВНОЕ — СВЕРХУ. Владелец заходит в продукт учёта денег чаще всего
 * затем, чтобы записать движение денег, а не чтобы выставить счёт: счета
 * выставляют раз в неделю, деньги ходят каждый день.
 */
export function useAddActions(): AddAction[] {
  const history = useHistory();
  const { openDialog } = useDialogActions();

  return React.useMemo(
    () => [
      {
        id: 'money-in',
        kind: 'money',
        label: intl.get('banking.label.add_money_in'),
        keywords: intl.get('command_palette.keywords.money_in').split(' '),
        icon: ArrowDownLeft,
        positive: true,
        run: () => openDialog(DialogsName.MoneyInForm),
      },
      {
        id: 'money-out',
        kind: 'money',
        label: intl.get('banking.label.add_money_out'),
        keywords: intl.get('command_palette.keywords.money_out').split(' '),
        icon: ArrowUpRight,
        run: () => openDialog(DialogsName.MoneyOutForm),
      },
      {
        id: 'invoice',
        kind: 'documents',
        label: intl.get('topbar.add.invoice'),
        keywords: intl.get('command_palette.keywords.invoice').split(' '),
        icon: FileText,
        run: () => history.push('/invoices/new'),
      },
      {
        id: 'bill',
        kind: 'documents',
        label: intl.get('topbar.add.bill'),
        keywords: intl.get('command_palette.keywords.bill').split(' '),
        icon: Receipt,
        run: () => history.push('/bills/new'),
      },
      {
        id: 'contact',
        kind: 'documents',
        label: intl.get('topbar.add.contact'),
        keywords: intl.get('command_palette.keywords.contact').split(' '),
        icon: UserPlus,
        run: () => history.push('/customers/new'),
      },
    ],
    [history, openDialog],
  );
}
