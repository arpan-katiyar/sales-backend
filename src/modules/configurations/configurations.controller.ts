import type { Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { configurationService } from './configurations.service.js';

export async function getConfigurations(_req: Request, res: Response): Promise<void> {
  const data = await configurationService.list();
  res.status(200).json({
    success: true,
    message: 'Configurations fetched successfully',
    data,
  });
}

export async function updateConfiguration(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError(401, 'Missing or invalid session', 401);
  }
  const configurationId = Number(req.params.configurationId);
  const { value } = req.body as { value: string };
  await configurationService.update(configurationId, value, req.user.userId);
  res.status(200).json({
    success: true,
    message: 'Configuration updated successfully',
    data: null,
  });
}
