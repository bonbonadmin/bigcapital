// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  Button,
  Callout,
  FormGroup,
  HTMLTable,
  InputGroup,
  Intent,
} from '@blueprintjs/core';
import { useHistory } from 'react-router-dom';
import { AppToaster, DashboardCard, DashboardPageContent } from '@/components';
import { ItemsSuggestField } from '@/components/Items';
import { useCreateInventoryAssembly, useItem, useItems } from '@/hooks/query';
import { toSafeNumber } from '@/utils';

const ASSEMBLY_ITEMS_FILTER_ROLES = JSON.stringify([
  {
    index: 1,
    fieldKey: 'type',
    value: 'inventory-assembly',
    condition: '&&',
    comparator: 'equals',
  },
]);

const tableCellStyle = {
  verticalAlign: 'middle',
};

export default function BuildAssembliesPage() {
  const history = useHistory();
  const [selectedAssemblyItemId, setSelectedAssemblyItemId] = useState(null);
  const [quantity, setQuantity] = useState('1');

  const {
    data: { items: assemblyItems },
    isLoading: isAssemblyItemsLoading,
  } = useItems({
    page_size: 10000,
    stringified_filter_roles: ASSEMBLY_ITEMS_FILTER_ROLES,
  });

  const {
    data: assemblyItem,
    isLoading: isAssemblyItemLoading,
  } = useItem(selectedAssemblyItemId, {
    enabled: !!selectedAssemblyItemId,
  });

  const { mutateAsync: createInventoryAssemblyMutate, isLoading: isSaving } =
    useCreateInventoryAssembly();

  const buildQuantity = toSafeNumber(quantity);
  const assemblyComponents = assemblyItem?.assembly_components || [];

  const componentRows = useMemo(
    () =>
      assemblyComponents.map((component) => {
        const componentItem = component.component_item || {};
        const quantityPerAssembly = toSafeNumber(component.quantity);
        const quantityRequired = quantityPerAssembly * buildQuantity;

        return {
          id: component.id || component.component_item_id,
          componentItem,
          quantityPerAssembly,
          quantityRequired,
          quantityOnHand: toSafeNumber(componentItem.quantity_on_hand),
          unitOfMeasure: componentItem.unit_of_measure || 'each',
        };
      }),
    [assemblyComponents, buildQuantity],
  );

  const canSave =
    !!selectedAssemblyItemId &&
    buildQuantity > 0 &&
    componentRows.length > 0 &&
    !isSaving;

  const handleBuildSave = async () => {
    if (!selectedAssemblyItemId) {
      AppToaster.show({
        intent: Intent.DANGER,
        message: 'Select an inventory assembly item first.',
      });
      return;
    }
    if (buildQuantity <= 0) {
      AppToaster.show({
        intent: Intent.DANGER,
        message: 'Build quantity must be greater than zero.',
      });
      return;
    }
    if (componentRows.length === 0) {
      AppToaster.show({
        intent: Intent.DANGER,
        message: 'This assembly item does not have any components to build.',
      });
      return;
    }

    await createInventoryAssemblyMutate(
      {
        item_id: selectedAssemblyItemId,
        quantity: buildQuantity,
      },
      {
        onSuccess: () => {
          AppToaster.show({
            intent: Intent.SUCCESS,
            message: 'Assembly build saved successfully.',
          });
          setQuantity('1');
        },
        onError: (error) => {
          AppToaster.show({
            intent: Intent.DANGER,
            message:
              error?.response?.data?.message || 'Failed to build the assembly.',
          });
        },
      },
    );
  };

  return (
    <DashboardPageContent>
      <DashboardCard page>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              Build Assemblies
            </h3>
            <p className={'bp4-text-muted'} style={{ marginBottom: 0 }}>
              Choose an inventory assembly item, set the quantity to build, and
              review the required component quantities before saving.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'minmax(0, 2fr) minmax(180px, 1fr)',
              marginBottom: '1.5rem',
            }}
          >
            <FormGroup
              label="Inventory assembly item"
              helperText="Only inventory assembly items are listed here."
              style={{ marginBottom: 0 }}
            >
              <ItemsSuggestField
                items={assemblyItems}
                selectedItemId={selectedAssemblyItemId}
                allowCreate={false}
                defautlSelectText="Select an assembly item"
                onItemSelected={(item) => setSelectedAssemblyItemId(item.id)}
              />
            </FormGroup>

            <FormGroup
              label="Quantity to build"
              helperText="This controls the total component quantities below."
              style={{ marginBottom: 0 }}
            >
              <InputGroup
                type="number"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(event) => setQuantity(event.currentTarget.value)}
                placeholder="1"
              />
            </FormGroup>
          </div>

          {isAssemblyItemsLoading ? (
            <Callout intent={Intent.PRIMARY}>Loading assembly items...</Callout>
          ) : null}

          {!isAssemblyItemsLoading && assemblyItems.length === 0 ? (
            <Callout intent={Intent.WARNING}>
              No inventory assembly items are available yet. Create one from the
              items screen first.
            </Callout>
          ) : null}

          {selectedAssemblyItemId && isAssemblyItemLoading ? (
            <Callout intent={Intent.PRIMARY} style={{ marginBottom: '1rem' }}>
              Loading assembly components...
            </Callout>
          ) : null}

          {assemblyItem ? (
            <div style={{ marginBottom: '1rem' }}>
              <Callout intent={Intent.PRIMARY}>
                <strong>{assemblyItem.name}</strong>
                <div style={{ marginTop: '0.5rem' }}>
                  Quantity on hand: {toSafeNumber(assemblyItem.quantity_on_hand)}{' '}
                  {assemblyItem.unit_of_measure || 'each'}
                </div>
              </Callout>
            </div>
          ) : null}

          {assemblyItem && componentRows.length === 0 ? (
            <Callout intent={Intent.WARNING} style={{ marginBottom: '1rem' }}>
              This assembly item does not have any components configured yet.
            </Callout>
          ) : null}

          <HTMLTable bordered interactive style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Component Item</th>
                <th>Qty per Assembly</th>
                <th>Build Qty</th>
                <th>Required Qty</th>
                <th>Quantity on Hand</th>
                <th>UOM</th>
              </tr>
            </thead>
            <tbody>
              {componentRows.length > 0 ? (
                componentRows.map((row) => (
                  <tr key={row.id}>
                    <td style={tableCellStyle}>
                      <div>{row.componentItem.name || '-'}</div>
                      <div className={'bp4-text-muted'}>
                        {row.componentItem.code || 'No code'}
                      </div>
                    </td>
                    <td style={tableCellStyle}>{row.quantityPerAssembly}</td>
                    <td style={tableCellStyle}>{buildQuantity}</td>
                    <td style={tableCellStyle}>{row.quantityRequired}</td>
                    <td style={tableCellStyle}>{row.quantityOnHand}</td>
                    <td style={tableCellStyle}>{row.unitOfMeasure}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className={'bp4-text-muted'}
                    style={{ textAlign: 'center' }}
                  >
                    Select an assembly item to preview its component quantities.
                  </td>
                </tr>
              )}
            </tbody>
          </HTMLTable>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              marginTop: '1.5rem',
            }}
          >
            <Button type="button" onClick={() => history.goBack()}>
              Cancel
            </Button>
            <Button
              type="button"
              intent={Intent.PRIMARY}
              loading={isSaving}
              disabled={!canSave}
              onClick={handleBuildSave}
            >
              Save Build
            </Button>
          </div>
        </div>
      </DashboardCard>
    </DashboardPageContent>
  );
}
