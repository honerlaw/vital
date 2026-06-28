# Follow-ups: equipment-profile-photo-scan

Non-blocking items surfaced by the completion + promote panels (042). None block ship.

- **Purge retired canon ids on read.** `rowToEquipmentProfile` / `useEquipmentProfile` are
  read-lenient, so a future catalog revision that retires an id leaves it in a user's saved profile;
  the next Settings Save then 400s (via `isEquipmentUpdate`) with only a generic "Couldn't save"
  alert. Add a `filter(isCanonicalEquipmentId)` on the items read so stale ids converge silently.
  Day-one-safe (the canon was just created).
- **Consider degrading equipment-hydration failure to empty instead of gating boot.** Equipment is a
  4th boot-gated fetch (consistent with the established per-user-hydration pattern — a failure shows
  the Retry view, not an unlaunchable app). But unlike programs/state, equipment can safely default
  to empty; degrading its failure to "no equipment" rather than blocking boot would be more
  resilient. Intentionally deferred — current behavior matches the existing pattern.
- **Scan-specific rate-limit notice.** Scans and routine generation share the 30/day `llm_usage`
  cap and return the identical `"Daily limit reached"` 429 string, so a user who spent the budget
  scanning gets no hint why generation is blocked. A scan-specific notice string would clarify.
