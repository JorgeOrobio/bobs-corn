import { z } from 'zod';

const EnvSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  CORN_LIMIT: z.coerce.number().int().positive().default(1),
  CORN_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  CORN_TTL_MARGIN_SECONDS: z.coerce.number().int().nonnegative().default(10),
});

export const env = EnvSchema.parse(process.env);