// Форматтеры списка клиентов переехали в общий движок (components/ui/list-view).
// Здесь — тонкий ре-экспорт для совместимости (columns.tsx, format.spec.ts).
export {
  isNegativeBalance,
  formatBalance,
  activeStatus as customerStatus,
} from '@/components/ui/list-view/list-format';
export type { ActiveStatus as CustomerStatus } from '@/components/ui/list-view/list-format';
