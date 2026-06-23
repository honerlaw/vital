/**
 * `GET` + `POST /api/me/food-log` (032) — the per-user food diary, auth-enforced (contrast the
 * public `programs+api.ts`). Implementations live one-function-per-file in `src/server/routes/`;
 * re-exports are exempt from the single-declaration rule, which is how a multi-method Expo API
 * route stays rule-conformant.
 */
export { GET } from '@/server/routes/me-food-log-get';
export { POST } from '@/server/routes/me-food-log-post';
