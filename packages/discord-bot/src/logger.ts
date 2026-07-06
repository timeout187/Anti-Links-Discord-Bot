import pino from 'pino';

/**
 * Structured JSON logs by design (the standard pino library pattern) - pipe
 * through `pino-pretty` for a human-readable terminal, e.g.:
 *   node dist/bot.js | npx pino-pretty
 */
export const logger = pino({
  name: 'antilink-guard',
  level: process.env.LOG_LEVEL ?? 'info',
});
