// @ts-nocheck
import React from 'react';
import { useFormikContext } from 'formik';
import {
  AccountsSelect,
  FFormGroup,
  FSelect,
  FormattedMessage as T,
  Col,
  Row,
} from '@/components';

import { accountsFieldShouldUpdate } from './utils';
import { ACCOUNT_TYPE } from '@/constants/accountTypes';
import { useItemFormContext } from './ItemFormProvider';
import { DialogsName } from '@/constants/dialogs';
import { AccountDialogAction } from '@/containers/Dialogs/AccountDialog/utils';
import { useDialogActions } from '@/hooks/state/dashboard';
import { isInventoryTrackedType } from './utils';
import { itemUnitOfMeasureOptions } from './utils';

/**
 * Item form inventory sections.
 */
function ItemFormInventorySection() {
  const { accounts } = useItemFormContext();
  const { openDialog } = useDialogActions();
  const { values } = useFormikContext();

  const handleCreateInventoryAccount = React.useCallback(
    (account) => {
      openDialog(DialogsName.AccountForm, {
        action: AccountDialogAction.NewDefinedType,
        accountType: ACCOUNT_TYPE.INVENTORY,
        name: account?.name || '',
      });
    },
    [openDialog],
  );

  if (!isInventoryTrackedType(values.type)) {
    return null;
  }

  return (
    <div class="page-form__section page-form__section--inventory">
      <h3>
        <T id={'inventory_information'} />
      </h3>

      <Row>
        <Col xs={6}>
          <FFormGroup
            label={<T id={'unit_of_measure'} />}
            name={'unit_of_measure'}
            inline={true}
            fastField={true}
          >
            <FSelect
              name={'unit_of_measure'}
              items={itemUnitOfMeasureOptions}
              valueAccessor={'key'}
              textAccessor={'label'}
              placeholder={<T id={'unit_of_measure'} />}
              fastField={true}
            />
          </FFormGroup>

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
              allowCreate={true}
              onCreateItemSelect={handleCreateInventoryAccount}
            />
          </FFormGroup>
        </Col>
      </Row>
    </div>
  );
}

export default ItemFormInventorySection;
