// @ts-nocheck
import React from 'react';

const WithholdingTaxDeleteAlert = React.lazy(
  () => import('./WithholdingTaxDeleteAlert'),
);

export default [
  {
    name: 'withholding-tax-delete',
    component: WithholdingTaxDeleteAlert,
  },
];
