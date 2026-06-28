/**
 * Implementation of `GET /api/me/equipment` (042). Auth-enforced; returns the caller's saved
 * equipment profile. Single-row-per-user (keyed by clerk_user_id); a user with no row yet gets the
 * empty list (`{ items: [] }`) — no 404 special-case, mirroring `me-state-get`. The `items` jsonb
 * column arrives parsed and is narrowed cast-free by the mapper. One function per file; re-exported
 * by `src/app/api/me/equipment+api.ts`.
 */
import { type EquipmentProfile } from '@/data/equipment-types';
import { query } from '@/server/db';
import { rowToEquipmentProfile } from '@/server/equipment-mapper';
import { requireAuth } from '@/server/requireAuth';

const SELECT = 'SELECT items FROM user_equipment WHERE clerk_user_id = $1';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    const rows = await query(SELECT, [auth.userId]);
    const profile: EquipmentProfile =
      rows.length > 0 ? rowToEquipmentProfile(rows[0]) : { items: [] };
    return Response.json(profile);
  } catch (error) {
    console.error('GET /api/me/equipment failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
