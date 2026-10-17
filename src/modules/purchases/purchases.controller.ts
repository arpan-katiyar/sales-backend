import type { Request, Response } from 'express';

import { filesByPrefix, readJsonPart, requireUserId } from '../entries/common.js';
import { parseCopySuppliers, parsePurchaseAdd, parsePurchaseUpdate } from './purchases.schema.js';
import { purchaseService } from './purchases.service.js';

function supplierFiles(req: Request) {
  return filesByPrefix(req, 'supplier_');
}

export async function addPurchase(req: Request, res: Response): Promise<void> {
  res.status(200).json(
    await purchaseService.add(parsePurchaseAdd(readJsonPart(req, 'payload')), supplierFiles(req), requireUserId(req)),
  );
}

export async function searchPurchases(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as {
    fromDate?: string;
    toDate?: string;
    supplierId?: number;
    customerId?: number;
    staffId?: number;
    page: number;
    size: number;
  };
  res.status(200).json(
    await purchaseService.search(
      {
        fromDate: query.fromDate ?? null,
        toDate: query.toDate ?? null,
        supplierId: query.supplierId ?? null,
        customerId: query.customerId ?? null,
        staffId: query.staffId ?? null,
      },
      query.page,
      query.size,
    ),
  );
}

export async function updatePurchase(req: Request, res: Response): Promise<void> {
  res.status(200).json(
    await purchaseService.update(
      Number(req.params.id),
      parsePurchaseUpdate(readJsonPart(req, 'data')),
      supplierFiles(req),
      requireUserId(req),
    ),
  );
}

export async function deletePurchase(req: Request, res: Response): Promise<void> {
  res.status(200).json(await purchaseService.remove(Number(req.params.id)));
}

export async function getPurchase(req: Request, res: Response): Promise<void> {
  res.status(200).json(await purchaseService.getById(Number(req.params.id)));
}

export async function copySuppliers(req: Request, res: Response): Promise<void> {
  res.status(200).json(await purchaseService.copySuppliers(parseCopySuppliers(req.body)));
}

export async function downloadPurchases(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as {
    fromDate?: string;
    toDate?: string;
    supplierId?: number;
    customerId?: number;
    staffId?: number;
  };
  const result = await purchaseService.download({
    fromDate: query.fromDate ?? null,
    toDate: query.toDate ?? null,
    supplierId: query.supplierId ?? null,
    customerId: query.customerId ?? null,
    staffId: query.staffId ?? null,
  });
  res.status(200);
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(result.file);
}
