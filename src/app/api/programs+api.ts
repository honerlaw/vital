/**
 * Public read-only catalog endpoint. Returns the workout programs from Postgres as `Program[]`
 * ordered by `sort_order`. Public by design (catalog data is non-sensitive author-curated
 * content; the UI is auth-gated anyway) — it does NOT call `requireAuth`, mirroring the public
 * `health+api.ts` and contrasting the protected `me+api.ts`. A malformed/invalid row makes the
 * whole request fail with 500 rather than serving a partial list.
 */
import { query } from '@/server/db';
import { rowToProgram } from '@/server/programs-mapper';

const SELECT_PROGRAMS =
  'SELECT id, name, tag, cred, per_week, blurb, days FROM programs ORDER BY sort_order';

export async function GET(): Promise<Response> {
  try {
    const rows = await query(SELECT_PROGRAMS);
    return Response.json(rows.map(rowToProgram));
  } catch (error) {
    // Server-only log: the cause (DB unreachable, an invalid row rejected by the mapper) is the
    // only diagnostic on the self-hosted box; the client still gets an opaque 500.
    console.error('GET /api/programs failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
