/**
 * Implementation of `POST /api/me/food-log` (032). Auth-enforced; appends one diary entry. The
 * body is validated strict-writer (028) through `isNewFoodLogEntry` → 400 on any malformed field,
 * so junk never reaches the table. `clerk_user_id` is FORCED from the authenticated principal
 * (never trusted from the body); the DB mints the uuid (`gen_random_uuid`) and the inserted row is
 * mapped back and returned so the client appends the authoritative entry. The macros are stored
 * exactly as sent — snapshotted at log time (the entry is self-contained, 028). One function per
 * file; re-exported by `src/app/api/me/food-log+api.ts`.
 */
import { isNewFoodLogEntry } from '@/data/guards';
import { query } from '@/server/db';
import { rowToFoodLogEntry } from '@/server/food-log-mapper';
import { requireAuth } from '@/server/requireAuth';

const INSERT =
  'INSERT INTO food_log_entries ' +
  '(clerk_user_id, logged_on, name, quantity, serving_label, calories, protein_g, carbs_g, ' +
  'fat_g, source, source_ref) ' +
  'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ' +
  'RETURNING id::text AS id, logged_on::text AS logged_on, name, quantity::text AS quantity, ' +
  'serving_label, calories::text AS calories, protein_g::text AS protein_g, ' +
  'carbs_g::text AS carbs_g, fat_g::text AS fat_g, source, source_ref';

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isNewFoodLogEntry(body)) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  try {
    const rows = await query(INSERT, [
      auth.userId,
      body.loggedOn,
      body.name,
      body.quantity,
      body.servingLabel,
      body.calories,
      body.proteinG,
      body.carbsG,
      body.fatG,
      body.source,
      body.sourceRef,
    ]);
    if (rows.length === 0) {
      return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    return Response.json(rowToFoodLogEntry(rows[0]));
  } catch (error) {
    console.error('POST /api/me/food-log failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
