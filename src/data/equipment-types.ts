/**
 * VITAL — equipment profile wire contract (042). The per-user list of canonical equipment ids
 * (see `@/data/equipment-catalog`) that pre-fills routine generation and is editable from Settings.
 * One shape serves the GET response, the PUT body, and the photo-scan result — every id is
 * validated against the canon at each trust boundary via `@/data/guards`. Type-only, so it runs on
 * both client and server with no runtime dependency.
 */

/** A user's saved equipment, as canonical ids. */
export interface EquipmentProfile {
  items: string[];
}

/** The photo-scan body — base64 data-URL images, passed through to the LLM (never stored). */
export interface EquipmentScanRequest {
  images: string[];
}
