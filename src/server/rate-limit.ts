/**
 * Per-user daily cap for the LLM routes (030). One atomic upsert increments today's counter and
 * returns the new count; the caller rejects with 429 when it exceeds the cap. UTC `CURRENT_DATE`
 * buckets the day. Fail-OPEN on a surprise row shape — a counter bug must not lock legitimate users
 * out of the feature (the cap is an abuse/cost guard, not a security control).
 */
import { query } from '@/server/db';

const DAILY_CAP = 30;

const UPSERT =
  'INSERT INTO llm_usage (clerk_user_id, day, count) VALUES ($1, CURRENT_DATE, 1) ' +
  'ON CONFLICT (clerk_user_id, day) DO UPDATE SET count = llm_usage.count + 1 RETURNING count';

export async function withinDailyLlmCap(userId: string): Promise<boolean> {
  const rows = await query(UPSERT, [userId]);
  const first = rows[0];
  if (!first || typeof first.count !== 'number') return true;
  return first.count <= DAILY_CAP;
}
