import { describe, it, expect } from '@jest/globals';
import { clientIdSchema } from './validation';

describe('clientIdSchema', () => {
  it('acepta IDs válidos y recorta espacios', () => {
    const r = clientIdSchema.safeParse('  user_01-OK  ');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe('user_01-OK');
  });

  it('rechaza vacío', () => {
    const r = clientIdSchema.safeParse('   ');
    expect(r.success).toBe(false);
  });

  it('rechaza caracteres inválidos', () => {
    const r = clientIdSchema.safeParse('user$bad');
    expect(r.success).toBe(false);
  });

  it('rechaza demasiado largo', () => {
    const long = 'a'.repeat(65);
    const r = clientIdSchema.safeParse(long);
    expect(r.success).toBe(false);
  });
});
