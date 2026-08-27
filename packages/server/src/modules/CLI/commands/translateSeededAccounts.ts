// © 2026 Bigfin

/**
 * Д3 карты v30 (решение 39, принято 27.08).
 *
 * Организации, созданные до перевода плана счетов, живут с английскими
 * названиями счетов («Bank Account», «Petty Cash», «Tax Payable»). Новые
 * получают русские: сид переводит названия по языку организации.
 *
 * Здесь — правило отбора, вынесенное отдельной функцией: его можно
 * проверить без базы и без Nest.
 *
 * Безопасность: переименовываем ТОЛЬКО нетронутые счета — те, чьё
 * название до сих пор совпадает с английским эталоном сида. Стоит
 * человеку назвать счёт по-своему — его выбор не трогаем никогда.
 */
export interface SeededAccountRow {
  id: number;
  slug: string | null | undefined;
  name: string;
}

export interface AccountRename {
  id: number;
  from: string;
  to: string;
}

export function accountsToRename(
  accounts: SeededAccountRow[],
  englishBySlug: Record<string, string>,
  targetBySlug: Record<string, string>,
): AccountRename[] {
  return accounts.reduce<AccountRename[]>((plan, account) => {
    const slug = account.slug;
    if (!slug) return plan;

    const english = englishBySlug[slug];
    const target = targetBySlug[slug];
    if (!english || !target) return plan;

    // Пробелы по краям — след старых выгрузок, а не правка человека.
    const current = (account.name ?? '').trim();
    if (current !== english.trim()) return plan;
    if (current === target.trim()) return plan;

    plan.push({ id: account.id, from: account.name, to: target });
    return plan;
  }, []);
}
