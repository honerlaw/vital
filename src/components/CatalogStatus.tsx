import { StyleSheet, View } from 'react-native';
import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import Screen from '@/components/Screen';
import { type ProgramsStatus } from '@/data/types';
import { space } from '@/theme';

const LINES: Record<Exclude<ProgramsStatus, 'ready'>, string[]> = {
  loading: ['LOADING PROGRAMS'],
  // Generic copy: 'error' covers both a fetch failure and an empty catalog.
  error: ['COULD NOT LOAD PROGRAMS', '—', 'CHECK YOUR CONNECTION'],
};

interface Props {
  status: Exclude<ProgramsStatus, 'ready'>;
  /** Shown as a Retry button on the error view; dispatches RETRY_HYDRATE at the call sites. */
  onRetry?: () => void;
}

/**
 * The render-gate's placeholder while the catalog is not `ready`. Shown by `(tabs)/_layout.tsx` and
 * the standalone `program/[id]` / `workout` routes so no program screen renders (on the client or
 * during SSR) before `state.programs` is hydrated.
 */
export default function CatalogStatus({ status, onRetry }: Props) {
  return (
    <Screen>
      <EmptyState lines={LINES[status]} />
      {status === 'error' && onRetry !== undefined ? (
        <View style={styles.retry}>
          <Button label="Retry" onPress={onRetry} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  retry: { marginTop: space['2xl'] },
});
