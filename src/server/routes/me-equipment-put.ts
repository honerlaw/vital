/**
 * Implementation of `PUT /api/me/equipment` (042). Auth-enforced; upserts the caller's equipment
 * profile (single row per user). The body is validated strict-writer (028) through
 * `isEquipmentUpdate` → 400 on any non-canonical id, so junk never reaches the table. Ids are
 * de-duped (order-preserving) before storage. `clerk_user_id` is FORCED from the authenticated
 * principal. Returns the stored list so the client can converge on the authoritative set. One
 * function per file; re-exported by `src/app/api/me/equipment+api.ts`.
 */
import { isEquipmentUpdate } from '@/data/guards';
import { query } from '@/server/db';
import { requireAuth } from '@/server/requireAuth';

const UPSERT =
  'INSERT INTO user_equipment (clerk_user_id, items) VALUES ($1, $2::jsonb) ' +
  'ON CONFLICT (clerk_user_id) DO UPDATE SET items = EXCLUDED.items, updated_at = now()';

export async function PUT(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isEquipmentUpdate(body)) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  const items = [...new Set(body.items)];
  try {
    await query(UPSERT, [auth.userId, JSON.stringify(items)]);
    return Response.json({ items });
  } catch (error) {
    console.error('PUT /api/me/equipment failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
