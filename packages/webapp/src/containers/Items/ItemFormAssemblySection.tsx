// @ts-nocheck
import React from 'react';
import { getIn, useFormikContext } from 'formik';
import { Button, HTMLTable, InputGroup } from '@blueprintjs/core';
import { FormattedMessage as T } from '@/components';
import { ItemsSuggestField } from '@/components/Items';
import { useItemFormContext } from './ItemFormProvider';

const defaultComponent = {
  item_id: '',
  quantity: 1,
};

export default function ItemFormAssemblySection() {
  const { values, setFieldValue, errors } = useFormikContext();
  const { inventoryItems, item } = useItemFormContext();

  if (values.type !== 'inventory-assembly') {
    return null;
  }

  const assemblyComponents = values.assembly_components || [];
  const selectableItems = (inventoryItems || []).filter(
    (inventoryItem) => inventoryItem.id !== item?.id,
  );

  const updateComponents = (components) => {
    setFieldValue('assembly_components', components);
  };

  const updateComponent = (index, patch) => {
    updateComponents(
      assemblyComponents.map((component, componentIndex) =>
        componentIndex === index ? { ...component, ...patch } : component,
      ),
    );
  };

  const assemblyComponentsError = getIn(errors, 'assembly_components');
  const assemblyComponentsErrorMessage =
    typeof assemblyComponentsError === 'string' ? assemblyComponentsError : null;

  return (
    <div className={'page-form__section page-form__section--assembly'}>
      <h3>
        <T id={'assembly_components'} />
      </h3>

      <p className={'bp4-text-muted'}>
        <T id={'assembly_components_hint'} />
      </p>

      <HTMLTable bordered interactive style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '55%' }}>
              <T id={'item'} />
            </th>
            <th style={{ width: '20%' }}>
              <T id={'qty'} />
            </th>
            <th style={{ width: '20%' }}>
              <T id={'quantity_on_hand'} />
            </th>
            <th style={{ width: '5%' }} />
          </tr>
        </thead>
        <tbody>
          {assemblyComponents.map((component, index) => {
            const selectedItem = selectableItems.find(
              (inventoryItem) => inventoryItem.id === component.item_id,
            );

            return (
              <tr key={index}>
                <td>
                  <ItemsSuggestField
                    items={selectableItems}
                    selectedItemId={component.item_id}
                    allowCreate={false}
                    onItemSelected={(selectedItem) =>
                      updateComponent(index, { item_id: selectedItem.id })
                    }
                    defautlSelectText="Select item"
                  />
                </td>
                <td>
                  <InputGroup
                    value={component.quantity}
                    onChange={(event) =>
                      updateComponent(index, {
                        quantity: event.currentTarget.value,
                      })
                    }
                    placeholder="1"
                  />
                </td>
                <td>
                  {selectedItem
                    ? `${selectedItem.quantity_on_hand || 0} ${selectedItem.unit_of_measure || ''}`.trim()
                    : '-'}
                </td>
                <td>
                  <Button
                    type="button"
                    minimal
                    icon="trash"
                    intent="danger"
                    onClick={() =>
                      updateComponents(
                        assemblyComponents.filter(
                          (_, componentIndex) => componentIndex !== index,
                        ),
                      )
                    }
                  />
                </td>
              </tr>
            );
          })}

          {assemblyComponents.length === 0 ? (
            <tr>
              <td colSpan={4} className={'bp4-text-muted'}>
                <T id={'assembly_components_empty'} />
              </td>
            </tr>
          ) : null}
        </tbody>
      </HTMLTable>

      <div style={{ marginTop: '1rem' }}>
        <Button
          type="button"
          icon="add"
          onClick={() =>
            updateComponents([...assemblyComponents, { ...defaultComponent }])
          }
        >
          <T id={'add_component'} />
        </Button>
      </div>

      {assemblyComponentsErrorMessage ? (
        <p className={'bp4-text-danger'} style={{ marginTop: '0.75rem' }}>
          {assemblyComponentsErrorMessage}
        </p>
      ) : null}
    </div>
  );
}
