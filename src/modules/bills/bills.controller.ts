import type { Request, Response } from 'express';

import { filesForField, readJsonPart, requireUserId } from '../entries/common.js';
import { parseBillAdd, parseBillUpdate } from './bills.schema.js';
import { billService } from './bills.service.js';

export async function addBill(req: Request, res: Response): Promise<void> {
  const body = parseBillAdd(readJsonPart(req, 'payload'));
  res.status(200).json(await billService.add(body, filesForField(req, 'images'), requireUserId(req)));
}

export async function updateBill(req: Request, res: Response): Promise<void> {
  const body = parseBillUpdate(readJsonPart(req, 'data'));
  res.status(200).json(
    await billService.update(Number(req.params.id), body, filesForField(req, 'images'), requireUserId(req)),
  );
}

export async function searchBills(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as {
    fromDate?: string;
    toDate?: string;
    supplierId?: number;
    customerId?: number;
    page: number;
    size: number;
  };
  const fromDate = query.fromDate ?? null;
  const toDate = query.toDate ?? null;
  const supplierId = query.supplierId ?? null;
  const customerId = query.customerId ?? null;
  if (fromDate == null && toDate == null && supplierId == null && customerId == null) {
    res.status(400).end();
    return;
  }
  res.status(200).json(await billService.search(fromDate, toDate, supplierId, customerId, query.page, query.size));
}

export async function deleteBill(req: Request, res: Response): Promise<void> {
  res.status(200).json(await billService.remove(String(req.params.billNumber)));
}

export async function getBill(req: Request, res: Response): Promise<void> {
  res.status(200).json(await billService.getByBillNumber(String(req.params.billNumber)));
}
