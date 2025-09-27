// Env mínimas para que src/lib/config.ts pase la validación de Zod en tests
process.env.UPSTASH_REDIS_REST_URL ||= 'http://localhost:9999';
process.env.UPSTASH_REDIS_REST_TOKEN ||= 'test-token';

// Ventana y límites por defecto para tests
process.env.CORN_LIMIT ||= '1';
process.env.CORN_WINDOW_SECONDS ||= '60';
process.env.CORN_TTL_MARGIN_SECONDS ||= '2';