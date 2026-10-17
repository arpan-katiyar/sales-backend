import type { Request, Response } from 'express';

import { rethrow } from '../entries/common.js';
import { generateLedgerExcel } from './ledger-excel.js';
import { ledgerFilename, ledgerService } from './ledger.service.js';
import type { LedgerView } from './ledger.schema.js';

function queryOf(req: Request): { supplierId: number; customerId: number; viewType: LedgerView } {
  const query = req.query as unknown as { supplierId: number; customerId: number; viewType: LedgerView };
  return query;
}

export async function getLedger(req: Request, res: Response): Promise<void> {
  const query = queryOf(req);
  res.status(200).json(await ledgerService.getLedger(query.supplierId, query.customerId, query.viewType));
}

export async function downloadLedger(req: Request, res: Response): Promise<void> {
  const query = queryOf(req);
  const response = await ledgerService.getLedger(query.supplierId, query.customerId, query.viewType);
  if (!response.data) {
    throw new Error('Missing ledger');
  }
  try {
    const file = await generateLedgerExcel(response.data);
    const filename = ledgerFilename(response.data.party.name);
    res.status(200);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(file);
  } catch (error) {
    rethrow(error);
  }
}
