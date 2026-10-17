import type { Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { supplierService } from './suppliers.service.js';
import type { SupplierAddBody, SupplierUpdateBody } from './suppliers.service.js';

function requireUserId(req: Request): number {
  if (!req.user) {
    throw new AppError(401, 'Missing or invalid session', 401);
  }
  return req.user.userId;
}

export async function addSupplier(req: Request, res: Response): Promise<void> {
  const body = req.body as Omit<SupplierAddBody, 'userId'>;
  res.status(200).json(await supplierService.add({ ...body, userId: requireUserId(req) }));
}

export async function getSuppliers(req: Request, res: Response): Promise<void> {
  const { page, size } = req.query as unknown as { page: number; size: number };
  res.status(200).json(await supplierService.list(page, size));
}

export async function getAllSuppliers(req: Request, res: Response): Promise<void> {
  const { filter } = req.query as unknown as { filter: 'ALL' | 'ACTIVE' | 'INACTIVE' };
  res.status(200).json(await supplierService.listAll(filter));
}

export async function searchSuppliers(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as {
    keyword: string;
    page: number;
    size: number;
    sortBy: string;
    sortDir: string;
  };
  res.status(200).json(
    await supplierService.search(query.keyword, query.page, query.size, query.sortBy, query.sortDir),
  );
}

export async function getSupplierById(req: Request, res: Response): Promise<void> {
  res.status(200).json(await supplierService.getById(Number(req.params.id)));
}

export async function updateSupplier(req: Request, res: Response): Promise<void> {
  const body = req.body as Omit<SupplierUpdateBody, 'userId'>;
  res.status(200).json(
    await supplierService.update(Number(req.params.id), { ...body, userId: requireUserId(req) }),
  );
}

export async function deleteSupplier(req: Request, res: Response): Promise<void> {
  const { code } = req.body as { code?: string | null };
  res.status(200).json(await supplierService.remove(code ?? null, requireUserId(req)));
}
