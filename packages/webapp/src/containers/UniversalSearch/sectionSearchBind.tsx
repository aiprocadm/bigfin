// © 2026 Bigfin
import React from 'react';
import { useHistory } from 'react-router-dom';

/**
 * Карта v43. Общая привязка к окну поиска для разделов, добавленных позже
 * классических.
 *
 * У этих разделов нет выдвижной карточки, как у документов: запись
 * открывается прямо на странице раздела. Поэтому выбор в поиске ведёт на
 * страницу и передаёт ей найденную запись адресом (`?open=12`) — иначе
 * человек попадал бы в общий список и искал бы глазами второй раз.
 */
export const makeSectionSelectAction = (
  resourceType: string,
  routePath: string,
) =>
  function SectionUniversalSearchSelect({
    resourceType: selectedType,
    resourceId,
    onAction,
  }: any) {
    const history = useHistory();

    React.useEffect(() => {
      if (selectedType === resourceType) {
        history.push(`${routePath}?open=${resourceId}`);
        onAction && onAction();
      }
    }, [selectedType, resourceId]);

    return null;
  };
