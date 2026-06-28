/**
 * `POST /api/me/equipment/scan` (042) — pass user photos through the multimodal LLM and return the
 * canonical equipment ids it recognizes; images are never stored. Auth-enforced. Implementation
 * lives one-function-per-file in `src/server/routes/`; the re-export keeps this route file
 * rule-conformant.
 */
export { POST } from '@/server/routes/me-equipment-scan';
