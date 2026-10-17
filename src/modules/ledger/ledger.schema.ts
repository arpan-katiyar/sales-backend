import { z } from 'zod';

export const LEDGER_VIEWS = ['CUSTOMER', 'SUPPLIER'] as const;
export type LedgerView = (typeof LEDGER_VIEWS)[number];

export const ledgerQuerySchema = z.object({
  supplierId: z.coerce.number({ invalid_type_error: 'supplierId is required' }).int(),
  customerId: z.coerce.number({ invalid_type_error: 'customerId is required' }).int(),
  viewType: z.enum(LEDGER_VIEWS, { message: 'Invalid ledger view' }),
});
