/**
 * `GET` + `PUT /api/me/equipment` (042) — the per-user equipment profile, auth-enforced.
 * Implementations live one-function-per-file in `src/server/routes/`; re-exports are exempt from
 * the single-declaration rule, which is how a multi-method Expo API route stays rule-conformant.
 */
export { GET } from '@/server/routes/me-equipment-get';
export { PUT } from '@/server/routes/me-equipment-put';
