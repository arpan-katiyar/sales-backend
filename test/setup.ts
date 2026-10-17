import { afterAll } from 'vitest';

import { closePool } from '../src/db/client.js';

afterAll(async () => {
  await closePool();
});
