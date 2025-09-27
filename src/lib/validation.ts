import { z } from 'zod';

export const clientIdSchema = z
  .string()
  .trim()
  .min(1, 'clientId required')
  .max(64, 'clientId too long')
  .regex(/^[a-zA-Z0-9:_\-]+$/, 'clientId has invalid characters');