import type { Request, Response } from 'express';

import { requireUserId } from '../entries/common.js';
import {
  parseDeposits,
  parseRetailCreate,
  parseRetailSupplierAdd,
  parseRetailSupplierUpdate,
  parseRetailUpdate,
} from './retail.schema.js';
import { retailService } from './retail.service.js';

export async function createRetail(req: Request, res: Response): Promise<void> {
  res.status(200).json(await retailService.create(parseRetailCreate(req.body), requireUserId(req)));
}

export async function updateRetail(req: Request, res: Response): Promise<void> {
  res.status(200).json(await retailService.update(Number(req.params.id), parseRetailUpdate(req.body), requireUserId(req)));
}

export async function getRetail(req: Request, res: Response): Promise<void> {
  res.status(200).json(await retailService.getById(Number(req.params.id)));
}

export async function searchRetail(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as {
    fromDate?: string;
    toDate?: string;
    customerId?: number;
    staffId?: number;
    supplierId?: number;
    page: number;
    size: number;
  };
  res.status(200).json(
    await retailService.search(
      query.fromDate ?? null,
      query.toDate ?? null,
      query.customerId ?? null,
      query.staffId ?? null,
      query.supplierId ?? null,
      query.page,
      query.size,
    ),
  );
}

export async function addDeposit(req: Request, res: Response): Promise<void> {
  res.status(200).json(await retailService.addDeposit(parseDeposits(req.body), requireUserId(req)));
}

export async function depositHistory(req: Request, res: Response): Promise<void> {
  res.status(200).json(await retailService.depositHistory(Number(req.params.retailId)));
}

export async function deleteRetail(req: Request, res: Response): Promise<void> {
  res.status(200).json(await retailService.remove(Number(req.params.retailId), requireUserId(req)));
}

export async function updateRetailSupplier(req: Request, res: Response): Promise<void> {
  const body = parseRetailSupplierUpdate(req.body);
  res.status(200).json(
    await retailService.updateSupplier(Number(req.params.retailSupplierId), body.totalAmount, requireUserId(req)),
  );
}

export async function deleteRetailSupplier(req: Request, res: Response): Promise<void> {
  res.status(200).json(await retailService.removeSupplier(Number(req.params.retailSupplierId), requireUserId(req)));
}

export async function addRetailSupplier(req: Request, res: Response): Promise<void> {
  res.status(200).json(await retailService.addSupplier(parseRetailSupplierAdd(req.body), requireUserId(req)));
}
