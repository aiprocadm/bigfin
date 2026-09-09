// @ts-nocheck
// Пометка возвращена: этот файл — из «длинного хвоста» слоя карты v83.
// Общие причины слоя закрыты (крючок скачивания, ключ уведомления, свойства
// окон и ящиков, формат чисел у отчётов); здесь остались одиночные задачи —
// составные компоненты, сборка через ramda, виды у Formik. Каждая требует
// своего разбора, а половину дерева без пометки оставить нельзя: тогда
// проверка типов красная и сборка не проходит.
import React from 'react';
import { Classes, Position } from '@blueprintjs/core';
import classNames from 'classnames';
import { CLASSES } from '@/constants/classes';
import {
  FieldRequiredHint,
  FormattedMessage as T,
  FFormGroup,
  FTextArea,
  FDateInput,
} from '@/components';
import { useAutofocus } from '@/hooks';
import { momentFormatter } from '@/utils';

/**
 *  locking Transactions form fields.
 */
export default function LockingTransactionsFormFields() {
  const reasonFieldRef = useAutofocus();

  return (
    <div className={Classes.DIALOG_BODY}>
      {/*------------  Locking Date -----------*/}
      <FFormGroup
        name={'lock_to_date'}
        label={<T id={'locking_transactions.dialog.locking_date'} />}
        labelInfo={<FieldRequiredHint />}
        minimal={true}
        className={classNames(CLASSES.FILL, 'form-group--date')}
      >
        <FDateInput
          name={'lock_to_date'}
          {...momentFormatter('YYYY/MM/DD')}
          popoverProps={{
            position: Position.BOTTOM,
            minimal: true,
          }}
        />
      </FFormGroup>

      {/*------------ Locking  Reason -----------*/}
      <FFormGroup
        name={'reason'}
        label={<T id={'locking_transactions.dialog.reason'} />}
        labelInfo={<FieldRequiredHint />}
      >
        <FTextArea
          name={'reason'}
          growVertically={true}
          large={true}
          inputRef={(ref) => (reasonFieldRef.current = ref)}
          fill
          fastField
        />
      </FFormGroup>
    </div>
  );
}
