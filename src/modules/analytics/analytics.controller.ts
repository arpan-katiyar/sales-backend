import type { Request, Response } from 'express';

import { analyticsService } from './analytics.service.js';

export async function monthlyAnalytics(req: Request, res: Response): Promise<void> {
  res.status(200).json(await analyticsService.monthly(req.body ?? {}));
}

export async function staffAnalytics(req: Request, res: Response): Promise<void> {
  res.status(200).json(await analyticsService.staff(req.body ?? {}));
}

export async function supplierAnalytics(req: Request, res: Response): Promise<void> {
  res.status(200).json(await analyticsService.suppliers(req.body ?? {}));
}

export async function customerAnalytics(req: Request, res: Response): Promise<void> {
  res.status(200).json(await analyticsService.customers(req.body ?? {}));
}
