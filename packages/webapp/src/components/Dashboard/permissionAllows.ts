/**
 * Пускает ли пометка права пункта меню. Список прав — «хватит любого из»:
 * так же сервер открывает разделы, нужные людям с разными ролями
 * (FT-084 ТЗ-3), и меню обязано отвечать тем же.
 */
export function permissionAllows(
  ability: { can: (action: string, subject: string) => boolean },
  permission?: { ability: string; subject: string } | { ability: string; subject: string }[],
): boolean {
  const permissions = ([] as { ability: string; subject: string }[]).concat(
    permission || [],
  );
  return (
    permissions.length === 0 ||
    permissions.some((p) => ability.can(p.ability, p.subject))
  );
}
