import EmptyState from '@/components/EmptyState';
import Screen from '@/components/Screen';
import { type ProgramsStatus } from '@/data/types';

const LINES: Record<Exclude<ProgramsStatus, 'ready'>, string[]> = {
  loading: ['LOADING PROGRAMS'],
  // Generic copy: 'error' covers both a fetch failure and an empty catalog.
  error: ['COULD NOT LOAD PROGRAMS', '—', 'REOPEN THE APP TO RETRY'],
};

/**
 * The render-gate's placeholder while the catalog is not `ready`. Shown by `(tabs)/_layout.tsx` and
 * the standalone `program/[id]` / `workout` routes so no program screen renders (on the client or
 * during SSR) before `state.programs` is hydrated.
 */
export default function CatalogStatus({ status }: { status: Exclude<ProgramsStatus, 'ready'> }) {
  return (
    <Screen>
      <EmptyState lines={LINES[status]} />
    </Screen>
  );
}
