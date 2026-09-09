import * as z from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  WEB_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('hapcargo'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(8, 'JWT_ACCESS_SECRET must be at least 8 characters'),
  JWT_REFRESH_SECRET: z.string().min(8, 'JWT_REFRESH_SECRET must be at least 8 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  AUTH_COOKIE_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  DEFAULT_LOCALE: z.string().default('en'),
});

export type Env = z.infer<typeof envSchema>;

/** Validate process.env at startup; reports missing keys without revealing values. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const missing = result.error.issues
      .filter((i) => i.code === 'invalid_type' && i.received === 'undefined')
      .map((i) => i.path.join('.'));
    const other = result.error.issues
      .filter((i) => !(i.code === 'invalid_type' && i.received === 'undefined'))
      .map((i) => `${i.path.join('.')}: ${i.message}`);
    const lines = [
      'Invalid environment configuration. The following environment variables are missing or invalid:',
      ...missing.map((k) => `  [MISSING] ${k}`),
      ...other.map((s) => `  [INVALID] ${s}`),
      'Set them in your .env (see .env.example). No secret values are shown here.',
    ];
    throw new Error(lines.join('\n'));
  }
  return result.data;
}
