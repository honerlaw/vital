/**
 * `/api/me/programs` (030) — auth-enforced. GET lists the user's generated programs; POST persists
 * a generated draft. Implementations live one-function-per-file under `src/server/routes/`.
 */
export { GET } from '@/server/routes/me-programs-get';
export { POST } from '@/server/routes/me-programs-post';
