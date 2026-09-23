import {
  Bell,
  Blocks,
  Building2,
  Calculator,
  ClipboardList,
  Coins,
  CreditCard,
  Download,
  FileMinus,
  FileText,
  KeyRound,
  Sparkles,
  Webhook,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Palette,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  Warehouse,
} from 'lucide-react';

import { AbilitySubject, ExportAction } from '@/constants/abilityOption';

export interface PreferencesMenuItem {
  /** Ключ i18n для подписи пункта. */
  labelId: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  /**
   * Право, без которого пункт не показываем (то же правило, что у бокового
   * меню: список — «хватит любого из»). Без пометки пункт виден всем.
   */
  permission?:
    | { ability: string; subject: string }
    | { ability: string; subject: string }[];
}

export interface PreferencesMenuSection {
  /** Ключ i18n для заголовка секции. */
  titleId: string;
  items: PreferencesMenuItem[];
}

export const PreferencesMenu: PreferencesMenuSection[] = [
  {
    titleId: 'preferences.sidebar.section.organization',
    items: [
      { labelId: 'general', href: '/preferences/general', icon: Settings },
      { labelId: 'interface_mode.menu', href: '/preferences/interface-mode', icon: LayoutDashboard },
      { labelId: 'preferences.modules.menu', href: '/preferences/modules', icon: Blocks },
      { labelId: 'branding', href: '/preferences/branding', icon: Palette },
      { labelId: 'users', href: '/preferences/users', icon: Users },
      { labelId: 'preferences.security.menu', href: '/preferences/security', icon: ShieldCheck },
      { labelId: 'display_preferences.menu', href: '/preferences/display', icon: LayoutDashboard },
      { labelId: 'account_groups.menu', href: '/preferences/account-groups', icon: Blocks },
      // «Выгрузить всё» — таблица со всеми данными: без права «Выгрузка
      // данных» сервер ответит 403 (FT-082 ТЗ-3), пункт не показываем.
      {
        labelId: 'export_data.menu',
        href: '/preferences/export-data',
        icon: Download,
        permission: { ability: ExportAction.Run, subject: AbilitySubject.Export },
      },
    ],
  },
  {
    titleId: 'preferences.sidebar.section.documents',
    items: [
      { labelId: 'preferences.estimates', href: '/preferences/estimates', icon: ClipboardList },
      { labelId: 'preferences.invoices', href: '/preferences/invoices', icon: FileText },
      { labelId: 'preferences.receipts', href: '/preferences/receipts', icon: ReceiptText },
      { labelId: 'preferences.creditNotes', href: '/preferences/credit-notes', icon: FileMinus },
    ],
  },
  {
    titleId: 'preferences.sidebar.section.finance',
    items: [
      { labelId: 'payment_methods', href: '/preferences/payment-methods', icon: CreditCard },
      { labelId: 'currencies', href: '/preferences/currencies', icon: Coins },
      { labelId: 'accountant', href: '/preferences/accountant', icon: Calculator },
    ],
  },
  {
    titleId: 'preferences.sidebar.section.structure',
    items: [
      { labelId: 'branches.label', href: '/preferences/branches', icon: Building2 },
      { labelId: 'warehouses.label', href: '/preferences/warehouses', icon: Warehouse },
      { labelId: 'items', href: '/preferences/items', icon: Package },
    ],
  },
  {
    titleId: 'preferences.sidebar.section.other',
    items: [
      // Страница уведомлений живёт вне /preferences, но пункт в этом меню —
      // единственный способ найти её без прямого URL (приёмка ㉒).
      { labelId: 'notifications.settings.menu', href: '/settings/notifications', icon: Bell },
      { labelId: 'api_keys', href: '/preferences/api-keys', icon: KeyRound },
      {
        labelId: 'ai_settings.menu',
        href: '/preferences/ai-analyst',
        icon: Sparkles,
      },
      {
        labelId: 'public_api.menu',
        href: '/preferences/public-api',
        icon: Webhook,
      },
    ],
  },
];
