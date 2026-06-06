/**
 * Boot milestones the startup watchdog inspects. Pure data — the recorder lives in
 * record-boot-milestone.ts and the consumer in start-boot-watchdog.ts (one function
 * per file, see [[001-constraint-strict-eslint-guardrails]]).
 *
 * Semantics: presence in the set means the milestone was reached. `splash-hidden` is
 * the watchdog's alarm condition (the splash only hides once Clerk reports loaded, so
 * a stuck splash is the visible symptom of every boot hang seen so far); the rest
 * exist to make the eventual watchdog event diagnosable — they say how FAR boot got.
 */
export type BootMilestone = 'fonts-loaded' | 'clerk-loaded' | 'splash-hidden' | 'boot-ready';

export const bootMilestones = new Set<BootMilestone>();
