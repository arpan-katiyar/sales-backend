import type { Request, Response } from 'express';

import { apiSuccess, requireUserId } from '../entries/common.js';
import { parseCreditAdd, parseCreditUpdate } from './credits.schema.js';
import { creditService } from './credits.service.js';

export async function addCredit(req: Request, res: Response): Promise<void> {
  res.status(200).json(await creditService.add(parseCreditAdd(req.body), requireUserId(req)));
}

export async function listCredits(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await creditService.list());
}

export async function searchCredits(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as {
    fromDate?: string;
    toDate?: string;
    supplierId?: number;
    customerId?: number;
    page: number;
    size: number;
  };
  res.status(200).json(
    await creditService.search(
      query.fromDate ?? null,
      query.toDate ?? null,
      query.supplierId ?? null,
      query.customerId ?? null,
      query.page,
      query.size,
    ),
  );
}

export async function updateCredit(req: Request, res: Response): Promise<void> {
  res.status(200).json(
    await creditService.update(Number(req.params.id), parseCreditUpdate(req.body), requireUserId(req)),
  );
}

export async function deleteCredit(req: Request, res: Response): Promise<void> {
  res.status(200).json(await creditService.remove(Number(req.params.id)));
}

export async function getCredit(req: Request, res: Response): Promise<void> {
  const data = await creditService.getById(Number(req.params.id));
  res.status(200).json(apiSuccess('Credit details fetched successfully', data));
}
