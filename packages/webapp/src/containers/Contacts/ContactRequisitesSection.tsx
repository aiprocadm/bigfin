// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { css } from '@emotion/css';
import { getIn, useFormikContext } from 'formik';
import { FFormGroup, FInputGroup, FHTMLSelect, Box } from '@/components';

import { contactLegalFormOptions } from './contactRequisitesOptions';

const sectionTitleClass = css`
  font-size: 14px;
  color: #8f99a8;
  margin-bottom: 18px;
  margin-top: 10px;
`;

/**
 * Реквизиты в форме клиента и поставщика. Банковская четвёрка идёт с
 * подсказкой: реквизиты контрагента печатаются в его документах, и до этого
 * среза ИНН попадал в систему только из выписки или импорта 1С.
 */
const REQUISITE_TEXT_FIELDS = [
  { name: 'inn', labelKey: 'requisites.inn', hintKey: 'requisites.inn.hint' },
  { name: 'kpp', labelKey: 'requisites.kpp', hintKey: 'requisites.kpp.hint' },
  { name: 'ogrn', labelKey: 'requisites.ogrn', hintKey: 'requisites.ogrn.hint' },
  { name: 'bank_name', labelKey: 'requisites.bank_name', hintKey: null },
  { name: 'bank_bik', labelKey: 'requisites.bank_bik', hintKey: null },
  { name: 'bank_account', labelKey: 'requisites.bank_account', hintKey: null },
  {
    name: 'bank_correspondent_account',
    labelKey: 'requisites.bank_correspondent_account',
    hintKey: 'requisites.contact_bank.hint',
  },
] as const;

export function ContactRequisitesSection() {
  const { errors, touched } = useFormikContext();

  // Явный helperText ПЕРЕКРЫВАЕТ сообщение об ошибке: FFormGroup подставляет
  // meta.error в то же место, но props кладутся поверх через Object.assign —
  // даже `helperText: undefined` затирает текст. Поэтому при ошибке (или без
  // подсказки) ключ не передаётся ВОВСЕ — иначе человек видит красную рамку
  // без объяснения причины.
  const hintProps = (name: string, hintKey: string | null) => {
    const hasError = getIn(errors, name) && getIn(touched, name);

    return hasError || !hintKey ? {} : { helperText: intl.get(hintKey) };
  };

  return (
    <Box data-section-id="requisites">
      <h4 className={sectionTitleClass}>
        {intl.get('preferences.general.section.requisites')}
      </h4>

      <FFormGroup
        name={'legal_form'}
        label={intl.get('requisites.legal_form')}
        inline
        fill
      >
        <FHTMLSelect
          name={'legal_form'}
          options={contactLegalFormOptions()}
          fill
        />
      </FFormGroup>

      {REQUISITE_TEXT_FIELDS.map(({ name, labelKey, hintKey }) => (
        <FFormGroup
          key={name}
          name={name}
          label={intl.get(labelKey)}
          {...hintProps(name, hintKey)}
          inline
          fill
        >
          <FInputGroup name={name} fill />
        </FFormGroup>
      ))}
    </Box>
  );
}
