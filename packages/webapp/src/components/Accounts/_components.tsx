
import { AccountSelect } from "./AccountsMultiSelect";

// Filters accounts items.
export const accountPredicate = (
  query: string,
  account: AccountSelect,
  _index?: number,
  exactMatch?: boolean,
) => {
  // Название может отсутствовать — тогда поиск просто не совпадёт, а не
  // уронит экран (Д18 карты v75).
  const normalizedTitle = account.name?.toLowerCase() ?? '';
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return normalizedTitle === normalizedQuery;
  } else {
    return `${account.code} ${normalizedTitle}`.indexOf(normalizedQuery) >= 0;
  }
};
