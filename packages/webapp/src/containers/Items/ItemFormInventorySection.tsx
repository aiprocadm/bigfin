// @ts-nocheck
import React from 'react';
import { useFormikContext } from 'formik';
import {
  AccountsSelect,
  FFormGroup,
  FormattedMessage as T,
  Col,
  Row,
} from '@/components';

import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';
import { accountsFieldShouldUpdate } from './utils';
import { ACCOUNT_TYPE } from '@/constants/accountTypes';
import { useItemFormContext } from './ItemFormProvider';
import { compose } from '@/utils';

/**
 * Item form inventory sections.
 */
function ItemFormInventorySection({ organization: { base_currency } }) {
  const { accounts } = useItemFormContext();
  const { values } = useFormikContext();

  // Складской счёт нужен только товару со складским учётом — услуге эта
  // секция лишь мешала (линия 5 карты v17).
  if (values.type !== 'inventory') return null;

  return (
    <div className="page-form__section page-form__section--inventory">
      <h3>
        <T id={'inventory_information'} />
      </h3>

      <Row>
        <Col xs={6}>
          {/*------------- Inventory Account ------------- */}
          <FFormGroup
            label={<T id={'inventory_account'} />}
            name={'inventory_account_id'}
            items={accounts}
            fastField={true}
            shouldUpdate={accountsFieldShouldUpdate}
            inline={true}
          >
            <AccountsSelect
              name={'inventory_account_id'}
              items={accounts}
              placeholder={<T id={'select_account'} />}
              filterByTypes={[ACCOUNT_TYPE.INVENTORY]}
              fastField={true}
              shouldUpdate={accountsFieldShouldUpdate}
            />
          </FFormGroup>
        </Col>
      </Row>
    </div>
  );
}

export default compose(withCurrentOrganization())(ItemFormInventorySection);
