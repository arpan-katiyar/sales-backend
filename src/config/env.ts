import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8081),
  LOG_LEVEL: z.string().default('info'),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
  JWT_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(43200),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  FRONTEND_ORIGIN: z.string().url(),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SEED_ADMIN_USERNAME: z.string().optional().default(''),
  SEED_ADMIN_PASSWORD: z.string().optional().default(''),
  S3_ENDPOINT: z.string().optional().default(''),
  S3_BUCKET: z.string().optional().default(''),
  S3_ACCESS_KEY: z.string().optional().default(''),
  S3_SECRET_KEY: z.string().optional().default(''),
  S3_REGION: z.string().optional().default('us-east-1'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }
  return parsed.data;
}

export const env = loadEnv();
