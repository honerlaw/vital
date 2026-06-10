import { StyleSheet, View } from 'react-native';
import BackButton from '@/components/BackButton';
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
  /** Set by callers rendered under a native stack header (021) so Screen skips the top inset. */
  hasHeader?: boolean;
  /**
   * Render the inline BackButton above the status content (026). Used by `program/[id]`, which
   * has no native header, so its loading/error states still offer a discoverable back affordance.
   */
  back?: boolean;
}

/**
 * The render-gate's placeholder while the catalog is not `ready`. Shown by `(tabs)/_layout.tsx` and
 * the standalone `program/[id]` / `workout` routes so no program screen renders (on the client or
 * during SSR) before `state.programs` is hydrated.
 */
export default function CatalogStatus({ status, onRetry, hasHeader = false, back = false }: Props) {
  return (
    <Screen hasHeader={hasHeader}>
      {back ? <BackButton /> : null}
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
