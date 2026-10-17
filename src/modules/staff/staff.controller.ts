import type { Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { staffService } from './staff.service.js';

function requireUserId(req: Request): number {
  if (!req.user) {
    throw new AppError(401, 'Missing or invalid session', 401);
  }
  return req.user.userId;
}

export async function addStaff(req: Request, res: Response): Promise<void> {
  const body = req.body as { staffName: string; phone?: string | null; joiningDate: string };
  const result = await staffService.add({ ...body, userId: requireUserId(req) });
  res.status(200).json(result);
}

export async function getStaff(req: Request, res: Response): Promise<void> {
  const { page, size } = req.query as unknown as { page: number; size: number };
  res.status(200).json(await staffService.list(page, size));
}

export async function getAllStaff(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await staffService.listActive());
}

export async function searchStaff(req: Request, res: Response): Promise<void> {
  const { keyword, page, size } = req.query as unknown as {
    keyword: string;
    page: number;
    size: number;
  };
  res.status(200).json(await staffService.search(keyword, page, size));
}

export async function getStaffById(req: Request, res: Response): Promise<void> {
  const staffId = Number(req.params.staffId);
  res.status(200).json(await staffService.getById(staffId));
}

export async function updateStaff(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    staffName: string;
    phone?: string | null;
    joiningDate?: string | null;
  };
  const result = await staffService.update(Number(req.params.staffId), {
    ...body,
    userId: requireUserId(req),
  });
  res.status(200).json(result);
}

export async function deleteStaff(req: Request, res: Response): Promise<void> {
  const { staffId } = req.body as { staffId: number };
  res.status(200).json(await staffService.deactivate(staffId, requireUserId(req)));
}
