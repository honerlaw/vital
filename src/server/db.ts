/**
 * Server-only Postgres access for VITAL's API routes.
 *
 * Imported only by `+api.ts` route handlers (and server-side modules they pull in), which keeps
 * `pg` off the client bundle. The pool is a lazily-created module singleton: it is NOT
 * constructed at import, so importing a route (e.g. in an offline unit test) opens no connection
 * and reads no env. `DATABASE_URL` is read verbatim from `process.env` exactly as the migrate
 * pipeline does — whatever SSL the URL carries is honored (`sslmode=require` against DO Managed
 * Postgres in prod, absent for the local Docker Compose database); this module never injects an
 * `ssl`/`sslmode` of its own.
 */
import { Pool } from 'pg';

/** A row whose every column is `unknown`, forcing callers to narrow before use. */
export type UnknownRow = Record<string, unknown>;

// Lazily-created module singleton. Constructed on first query, never at import — so importing a
// route in an offline unit test opens no connection and reads no env.
let pool: Pool | null = null;

/**
 * Run a query and return its rows with every column typed `unknown`, forcing callers to narrow
 * each value at runtime (see `@/data/guards`) rather than trusting an unchecked row type.
 */
export async function query(text: string): Promise<UnknownRow[]> {
  if (pool === null) {
    const url: unknown = process.env.DATABASE_URL;
    if (typeof url !== 'string' || url.length === 0) {
      throw new Error('DATABASE_URL is not set');
    }
    const created = new Pool({ connectionString: url });
    // pg emits 'error' on an idle client when the backend drops the connection (DO Managed
    // Postgres idle-recycle, failover, network blip). Unhandled, that event throws and would
    // crash the long-running self-hosted server; logging it lets pg discard and recycle the client.
    created.on('error', (err) => {
      console.error('pg pool error:', err);
    });
    // Best-effort drain on shutdown. server.js's `server.close()` already finishes in-flight
    // requests (and their queries) before `process.exit`, so this only releases idle pooled
    // clients — strictly better than dropping them, and it never interrupts a live query.
    process.once('SIGTERM', () => {
      void created.end();
    });
    process.once('SIGINT', () => {
      void created.end();
    });
    pool = created;
  }
  const result = await pool.query<UnknownRow>(text);
  return result.rows;
}
