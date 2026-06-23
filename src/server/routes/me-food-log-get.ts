/**
 * Implementation of `GET /api/me/food-log?date=YYYY-MM-DD` (032). Auth-enforced; returns the
 * caller's diary entries for one LOCAL day, oldest-first (the diary renders chronologically). The
 * `date` query param is validated by `isLocalDay` (format AND real-calendar validity) — a
 * malformed or impossible date is a 400, never a Postgres cast error (500). uuid/date/numeric
 * columns are cast to text in the SELECT so they arrive as strings for
 * the mapper (node-pg returns `numeric` as a string already; the date cast avoids a server-TZ
 * `Date`). One function per file; re-exported by `src/app/api/me/food-log+api.ts`.
 */
import { isLocalDay } from '@/data/guards';
import { query } from '@/server/db';
import { rowToFoodLogEntry } from '@/server/food-log-mapper';
import { requireAuth } from '@/server/requireAuth';

const SELECT =
  'SELECT id::text AS id, logged_on::text AS logged_on, name, quantity::text AS quantity, ' +
  'serving_label, calories::text AS calories, protein_g::text AS protein_g, ' +
  'carbs_g::text AS carbs_g, fat_g::text AS fat_g, source, source_ref ' +
  'FROM food_log_entries WHERE clerk_user_id = $1 AND logged_on = $2 ' +
  'ORDER BY created_at ASC, id ASC';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const date = new URL(request.url).searchParams.get('date') ?? '';
  if (!isLocalDay(date)) {
    return Response.json({ error: 'Bad Request' }, { status: 400 });
  }
  try {
    const rows = await query(SELECT, [auth.userId, date]);
    return Response.json(rows.map(rowToFoodLogEntry));
  } catch (error) {
    console.error('GET /api/me/food-log failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
