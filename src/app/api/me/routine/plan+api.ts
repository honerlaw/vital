/**
 * `POST /api/me/routine/plan` (030) — auth-enforced. Implementation lives in
 * `src/server/routes/routine-plan` (one function per file; re-exports are exempt from the
 * single-declaration rule, as with `me/state+api.ts`).
 */
export { POST } from '@/server/routes/routine-plan';
