import type { Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { customerService } from './customers.service.js';
import type { CustomerAddBody, CustomerUpdateBody } from './customers.service.js';

function requireUserId(req: Request): number {
  if (!req.user) {
    throw new AppError(401, 'Missing or invalid session', 401);
  }
  return req.user.userId;
}

export async function addCustomer(req: Request, res: Response): Promise<void> {
  const body = req.body as Omit<CustomerAddBody, 'userId'>;
  res.status(200).json(await customerService.add({ ...body, userId: requireUserId(req) }));
}

export async function getCustomers(req: Request, res: Response): Promise<void> {
  const { page, size } = req.query as unknown as { page: number; size: number };
  res.status(200).json(await customerService.list(page, size));
}

export async function getAllCustomers(req: Request, res: Response): Promise<void> {
  const { filter } = req.query as unknown as { filter: 'ALL' | 'ACTIVE' | 'INACTIVE' };
  res.status(200).json(await customerService.listAll(filter));
}

export async function searchCustomers(req: Request, res: Response): Promise<void> {
  const { keyword, page, size } = req.query as unknown as {
    keyword: string;
    page: number;
    size: number;
  };
  res.status(200).json(await customerService.search(keyword, page, size));
}

export async function getCustomerById(req: Request, res: Response): Promise<void> {
  res.status(200).json(await customerService.getById(Number(req.params.id)));
}

export async function updateCustomer(req: Request, res: Response): Promise<void> {
  const body = req.body as Omit<CustomerUpdateBody, 'userId'>;
  res.status(200).json(
    await customerService.update(Number(req.params.id), { ...body, userId: requireUserId(req) }),
  );
}

export async function deleteCustomer(req: Request, res: Response): Promise<void> {
  const { customerCode } = req.body as { customerCode?: string | null };
  res.status(200).json(await customerService.remove(customerCode ?? null, requireUserId(req)));
}
