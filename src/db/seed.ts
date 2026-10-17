import { logger } from '../common/logger.js';
import { ROLES } from '../common/constants.js';
import { hashPassword } from '../common/utils/password.js';
import { env } from '../config/env.js';
import { closePool } from './client.js';
import { usersRepository } from '../modules/users/users.repository.js';

async function seed(): Promise<void> {
  const username = env.SEED_ADMIN_USERNAME.trim();
  const password = env.SEED_ADMIN_PASSWORD;
  if (!username || !password) {
    logger.info('Seed skipped. Set SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD.');
    return;
  }
  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
  }

  const existing = await usersRepository.findByUsername(username);
  if (existing) {
    logger.info({ username }, 'Seed admin already exists');
    return;
  }

  await usersRepository.create({
    username,
    passwordHash: await hashPassword(password),
    roles: [ROLES.ADMIN],
    passwordChangeRequired: true,
  });
  logger.info({ username }, 'Seed admin created');
}

seed()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(() => {
    void closePool();
  });
