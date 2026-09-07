// @ts-nocheck
import React from 'react';
import { FMultiSelect } from '@/components/Forms';

/**
 * Items multi-select.
 *
 * Создания товара прямо из списка тут нет и не было: ветка `allowCreate`
 * открывала диалог СЧЁТА (`DialogsName.AccountForm`) — диалога создания
 * товара в продукте не существует вовсе. Ветка убрана как неработающая
 * (Д2 карты v60); её никто и не включал — ни один вызывающий не передаёт
 * `allowCreate`.
 */
export function ItemsMultiSelect(multiSelectProps) {
  return (
    <FMultiSelect
      valueAccessor={'id'}
      textAccessor={'name'}
      labelAccessor={'code'}
      tagAccessor={'name'}
      fill={true}
      popoverProps={{ minimal: true }}
      resetOnSelect={true}
      {...multiSelectProps}
    />
  );
}
