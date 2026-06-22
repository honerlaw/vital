/**
 * Resolve the active program id against the MERGED program set (catalog + generated, 030),
 * generalizing the 014/015 re-point rule. Rules:
 *  - null stays null (the "never chose" signal — the Today chooser must show, 014).
 *  - The re-point only fires once ALL THREE hydrations are ready (catalog, per-user state, and
 *    generated programs). Before that the raw id is preserved — otherwise a saved generated
 *    program that is the active program would be wrongly re-pointed during the load window, since
 *    it isn't in `programs` until its own fetch lands.
 *  - When all ready: a present id is kept; a stale id (absent from the merged set — e.g. a removed
 *    catalog program or a generated program deleted on another device) re-points to the first
 *    program. Never mutates the cursor map (015).
 */
import { type AppState } from '@/data/types';

export function normalizeActiveId(state: AppState): string | null {
  if (state.activeProgramId === null) return null;
  const allReady =
    state.programsStatus === 'ready' &&
    state.userStateStatus === 'ready' &&
    state.userProgramsStatus === 'ready';
  if (!allReady) return state.activeProgramId;
  if (state.programs.some((p) => p.id === state.activeProgramId)) return state.activeProgramId;
  return state.programs.length > 0 ? state.programs[0].id : state.activeProgramId;
}
