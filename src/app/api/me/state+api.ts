/**
 * Per-user persisted state (012). Both methods are auth-enforced via `requireAuth` (contrast
 * the public `programs+api.ts`). The implementations live in `src/server/routes/` one function
 * per file; re-exports are exempt from the single-declaration rule, which is how a multi-method
 * Expo API route stays rule-conformant.
 */
export { GET } from '@/server/routes/me-state-get';
export { PUT } from '@/server/routes/me-state-put';
