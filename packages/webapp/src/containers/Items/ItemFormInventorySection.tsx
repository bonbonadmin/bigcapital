// @ts-nocheck
import React from 'react';
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
import { DialogsName } from '@/constants/dialogs';
import { AccountDialogAction } from '@/containers/Dialogs/AccountDialog/utils';
import { useDialogActions } from '@/hooks/state/dashboard';

/**
 * Item form inventory sections.
 */
function ItemFormInventorySection({ organization: { base_currency } }) {
  const { accounts } = useItemFormContext();
  const { openDialog } = useDialogActions();

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

  return (
    <div class="page-form__section page-form__section--inventory">
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
              allowCreate={true}
              onCreateItemSelect={handleCreateInventoryAccount}
            />
          </FFormGroup>
        </Col>
      </Row>
    </div>
  );
}

export default compose(withCurrentOrganization())(ItemFormInventorySection);
