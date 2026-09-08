// @ts-nocheck
import React from 'react';
import { useFormikContext, FastField, ErrorMessage } from 'formik';
import {
  FormGroup,
  Classes,
  Checkbox,
  ControlGroup,
  Button,
  Collapse,
} from '@blueprintjs/core';
import {
  AccountsSelect,
  MoneyInputGroup,
  FMoneyInputGroup,
  Col,
  Row,
  Hint,
  InputPrependText,
  FFormGroup,
  FTextArea,
} from '@/components';
import { FormattedMessage as T } from '@/components';

import { useItemFormContext } from './ItemFormProvider';
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';
import { ACCOUNT_PARENT_TYPE } from '@/constants/accountTypes';
import {
  sellDescriptionFieldShouldUpdate,
  sellAccountFieldShouldUpdate,
  sellPriceFieldShouldUpdate,
  costPriceFieldShouldUpdate,
  costAccountFieldShouldUpdate,
  purchaseDescFieldShouldUpdate,
  taxRateFieldShouldUpdate,
} from './utils';
import { compose, inputIntent } from '@/utils';
import { TaxRatesSelect } from '@/components/TaxRates/TaxRatesSelect';

/**
 * Item form body.
 */
function ItemFormBody({ organization: { base_currency } }) {
  const { accounts, taxRates } = useItemFormContext();
  const { values } = useFormikContext<any>();

  return (
    <div className="page-form__section page-form__section--selling-cost">
      <Row>
        <Col xs={6}>
          {/*------------- Purchasable checbox ------------- */}
          <FastField name={'sellable'} type="checkbox">
            {({ form, field }) => (
              <FormGroup inline={true} className={'form-group--sellable'}>
                <Checkbox
                  inline={true}
                  label={
                    <h3>
                      <T id={'i_sell_this_item'} />
                    </h3>
                  }
                  name={'sellable'}
                  {...field}
                />
              </FormGroup>
            )}
          </FastField>

          {/*------------- Selling price ------------- */}
          <FFormGroup
            name={'sell_price'}
            label={<T id={'selling_price'} />}
            inline
          >
            <ControlGroup>
              <InputPrependText text={base_currency} />
              <FMoneyInputGroup
                name={'sell_price'}
                shouldUpdate={sellPriceFieldShouldUpdate}
                sellable={values.sellable}
                inputGroupProps={{ fill: true }}
                disabled={!values.sellable}
                fastField
              />
            </ControlGroup>
          </FFormGroup>

          {/*------------- Sell Tax Rate ------------- */}
          <FFormGroup
            name={'sell_tax_rate_id'}
            label={<T id={'tax_rate'} />}
            inline={true}
          >
            <TaxRatesSelect
              name={'sell_tax_rate_id'}
              items={taxRates}
              allowCreate
            />
          </FFormGroup>

          <FFormGroup
            name={'sell_description'}
            label={<T id={'description'} />}
            inline={true}
            sellable={values.sellable}
          >
            <FTextArea
              name={'sell_description'}
              growVertically={true}
              height={280}
              disabled={!values.sellable}
              fill
              fastField
            />
          </FFormGroup>
        </Col>

        <Col xs={6}>
          {/*------------- Sellable checkbox ------------- */}
          <FastField name={'purchasable'} type={'checkbox'}>
            {({ field }) => (
              <FormGroup inline={true} className={'form-group--purchasable'}>
                <Checkbox
                  inline={true}
                  label={
                    <h3>
                      <T id={'i_purchase_this_item'} />
                    </h3>
                  }
                  {...field}
                />
              </FormGroup>
            )}
          </FastField>

          {/*------------- Cost price ------------- */}
          <FFormGroup
            name={'cost_price'}
            label={<T id={'cost_price'} />}
            inline
          >
            <ControlGroup>
              <InputPrependText text={base_currency} />

              <FMoneyInputGroup
                name={'cost_price'}
                shouldUpdate={costPriceFieldShouldUpdate}
                purchasable={values.purchasable}
                inputGroupProps={{ medium: true }}
                disabled={!values.purchasable}
                fastField
              />
            </ControlGroup>
          </FFormGroup>

          {/*------------- Purchase Tax Rate ------------- */}
          <FFormGroup
            name={'purchase_tax_rate_id'}
            label={<T id={'tax_rate'} />}
            inline={true}
          >
            <TaxRatesSelect
              name={'purchase_tax_rate_id'}
              items={taxRates}
              allowCreate={true}
              fastField={true}
              shouldUpdateDeps={{ taxRates }}
            />
          </FFormGroup>

          <FFormGroup
            name={'purchase_description'}
            label={<T id={'description'} />}
            className={'form-group--purchase-description'}
            helperText={<ErrorMessage name={'description'} />}
            inline={true}
            purchasable={values.purchasable}
          >
            <FTextArea
              name={'purchase_description'}
              growVertically={true}
              height={280}
              disabled={!values.purchasable}
              fill
            />
          </FFormGroup>
        </Col>
      </Row>

      <ItemFormAccountingSection accounts={accounts} />
    </div>
  );
}

/**
 * Свёрнутый блок «Бухгалтерия»: счета продаж и себестоимости. Обычно их
 * заполняет префил из настроек организации, и новичку блок не нужен —
 * поэтому по умолчанию он свёрнут. Раскрывается сам, если счета пусты
 * или после сабмита в них ошибка (иначе ошибка была бы невидима).
 */
function ItemFormAccountingSection({ accounts }) {
  const { values, errors, submitCount } = useFormikContext<any>();

  const hasEmptyAccount =
    (values.sellable && !values.sell_account_id) ||
    (values.purchasable && !values.cost_account_id);

  const [isOpen, setIsOpen] = React.useState(hasEmptyAccount);

  React.useEffect(() => {
    if (submitCount > 0 && (errors.sell_account_id || errors.cost_account_id)) {
      setIsOpen(true);
    }
  }, [submitCount, errors.sell_account_id, errors.cost_account_id]);

  return (
    <div className="page-form__section page-form__section--accounting">
      <Button
        minimal={true}
        small={true}
        icon={isOpen ? 'chevron-down' : 'chevron-right'}
        onClick={() => setIsOpen(!isOpen)}
      >
        <T id={'item.form.accounting_section'} />
      </Button>

      <Collapse isOpen={isOpen} keepChildrenMounted={true}>
        <Row>
          <Col xs={6}>
            {/*------------- Selling account ------------- */}
            <FFormGroup
              label={<T id={'item.form.sell_account'} />}
              name={'sell_account_id'}
              labelInfo={
                <Hint content={<T id={'item.field.sell_account.hint'} />} />
              }
              inline={true}
              sellable={values.sellable}
            >
              <AccountsSelect
                name={'sell_account_id'}
                items={accounts}
                placeholder={<T id={'select_account'} />}
                disabled={!values.sellable}
                filterByParentTypes={[ACCOUNT_PARENT_TYPE.INCOME]}
                fill={true}
                allowCreate={true}
                fastField={true}
              />
            </FFormGroup>
          </Col>

          <Col xs={6}>
            {/*------------- Cost account ------------- */}
            <FFormGroup
              name={'cost_account_id'}
              purchasable={values.purchasable}
              label={<T id={'item.form.cost_account'} />}
              labelInfo={
                <Hint content={<T id={'item.field.cost_account.hint'} />} />
              }
              inline={true}
            >
              <AccountsSelect
                name={'cost_account_id'}
                items={accounts}
                placeholder={<T id={'select_account'} />}
                filterByParentTypes={[ACCOUNT_PARENT_TYPE.EXPENSE]}
                popoverFill={true}
                allowCreate={true}
                fastField={true}
                disabled={!values.purchasable}
                purchasable={values.purchasable}
                shouldUpdate={costAccountFieldShouldUpdate}
              />
            </FFormGroup>
          </Col>
        </Row>
      </Collapse>
    </div>
  );
}

export default compose(withCurrentOrganization())(ItemFormBody);
