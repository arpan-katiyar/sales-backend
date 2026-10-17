import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './common/logger.js';
import { closePool } from './db/client.js';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'sales-backend listening');
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down');
  server.close(() => {
    void closePool().finally(() => {
      process.exit(0);
    });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
