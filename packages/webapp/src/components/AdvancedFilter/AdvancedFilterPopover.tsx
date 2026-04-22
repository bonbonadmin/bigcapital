// @ts-nocheck
import React from 'react';
import { PopoverInteractionKind, Position } from '@blueprintjs/core';
import { Popover2 } from '@blueprintjs/popover2';
import { AdvancedFilterDropdown } from './AdvancedFilterDropdown';

/**
 * Advanced filter popover.
 */
export function AdvancedFilterPopover({
  popoverProps,
  advancedFilterProps,
  children,
}) {
  return (
    <Popover2
      minimal={true}
      content={
        <AdvancedFilterDropdown
          {...advancedFilterProps}
        />
      }
      interactionKind={PopoverInteractionKind.CLICK}
      position={Position.BOTTOM_LEFT}
      canOutsideClickClose={true}
      modifiers={{
        offset: { offset: '0, 4' },
      }}
      {...popoverProps}
    >
      {children}
    </Popover2>
  );
}
