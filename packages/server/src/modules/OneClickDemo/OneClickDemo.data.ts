// © 2026 Bigfin
import { SERVICES_DATASET } from './data';

/**
 * Содержимое демо-организации (Д2 карты v18, расширено FIN-027 ТЗ-2).
 *
 * ЭТОТ ФАЙЛ БОЛЬШЕ НЕ ХРАНИТ ДАННЫЕ. С появлением отраслевых наборов они
 * переехали в `data/`, а здесь остались прежние имена — ими пользуются
 * спеки и внешние ссылки. Второй копии данных нет НАМЕРЕННО: две копии
 * одного набора однажды разойдутся, и никто не заметит, какая из них
 * попала в демо.
 *
 * Прежние имена смотрят в набор «услуги» — тот самый, что был здесь
 * раньше и остаётся выбором по умолчанию.
 */
export const DEMO_CUSTOMERS = SERVICES_DATASET.customers;
export const DEMO_VENDORS = SERVICES_DATASET.vendors;
export const DEMO_ITEMS = SERVICES_DATASET.items;
export const DEMO_INVOICES = SERVICES_DATASET.invoices;
export const DEMO_PAYMENTS = SERVICES_DATASET.payments;
export const DEMO_EXPENSES = SERVICES_DATASET.expenses;
export const DEMO_BILLS = SERVICES_DATASET.bills;
