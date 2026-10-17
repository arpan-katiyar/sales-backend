import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    env: {
      NODE_ENV: 'test',
      PORT: '8081',
      LOG_LEVEL: 'silent',
      DB_HOST: 'localhost',
      DB_PORT: '3306',
      DB_USER: 'root',
      DB_PASSWORD: '',
      DB_NAME: 'csmdb',
      JWT_ACCESS_SECRET: 'test-access-secret-must-be-32chars',
      JWT_REFRESH_SECRET: 'test-refresh-secret-must-be-32char',
      JWT_ACCESS_TTL_SECONDS: '900',
      JWT_REFRESH_TTL_SECONDS: '604800',
      BCRYPT_COST: '4',
      FRONTEND_ORIGIN: 'http://localhost:5173',
      COOKIE_SECURE: 'false',
    },
  },
});
