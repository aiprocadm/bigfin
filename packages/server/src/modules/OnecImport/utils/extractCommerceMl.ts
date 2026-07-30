import { child, childText, children, XmlNode } from './parseXml';

/**
 * Извлечение справочников из дерева CommerceML 2.x (⑩).
 *
 * Пути стандарта:
 *   КоммерческаяИнформация → Каталог → Товары → Товар
 *   КоммерческаяИнформация → [Классификатор →] Контрагенты → Контрагент
 */

export interface CommerceMlItem {
  externalId: string;
  name: string;
  sku: string | null;
  unit: string | null;
  description: string | null;
}

export interface CommerceMlContact {
  externalId: string;
  name: string;
  fullName: string | null;
  inn: string | null;
  kpp: string | null;
}

const text = (node: XmlNode, name: string): string | null => {
  const value = childText(node, name);
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const isDeleted = (node: XmlNode): boolean =>
  (childText(node, 'ПометкаУдаления') || '').trim().toLowerCase() === 'true';

export function extractItems(root: XmlNode): CommerceMlItem[] {
  const catalogs = children(root, 'Каталог');
  const items: CommerceMlItem[] = [];

  for (const catalog of catalogs) {
    const container = child(catalog, 'Товары');
    if (!container) continue;

    for (const node of children(container, 'Товар')) {
      if (isDeleted(node)) continue;

      const externalId = text(node, 'Ид');
      const name = text(node, 'Наименование');
      // Без идентификатора нечего сопоставлять, без имени — нечего показывать.
      if (!externalId || !name) continue;

      items.push({
        externalId,
        name,
        sku: text(node, 'Артикул'),
        unit: text(node, 'БазоваяЕдиница'),
        description: text(node, 'Описание'),
      });
    }
  }
  return items;
}

export function extractContacts(root: XmlNode): CommerceMlContact[] {
  // Контрагенты лежат либо в корне, либо внутри Классификатора —
  // зависит от того, чем и как сделана выгрузка.
  const containers = [
    ...children(root, 'Контрагенты'),
    ...children(root, 'Классификатор').flatMap((c) =>
      children(c, 'Контрагенты'),
    ),
  ];
  const contacts: CommerceMlContact[] = [];

  for (const container of containers) {
    for (const node of children(container, 'Контрагент')) {
      if (isDeleted(node)) continue;

      const externalId = text(node, 'Ид');
      const name = text(node, 'Наименование');
      if (!externalId || !name) continue;

      contacts.push({
        externalId,
        name,
        fullName:
          text(node, 'ОфициальноеНаименование') ??
          text(node, 'ПолноеНаименование'),
        inn: text(node, 'ИНН'),
        kpp: text(node, 'КПП'),
      });
    }
  }
  return contacts;
}
