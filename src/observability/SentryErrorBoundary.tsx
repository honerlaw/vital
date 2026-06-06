import * as Sentry from '@sentry/react-native';
import { Component, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Render-error boundary: reports the throw to Sentry and renders a VISIBLE fallback
 * instead of React unmounting the tree to a blank screen (the production failure mode
 * this unit exists to kill — in a release build an uncaught render error is otherwise
 * a silent white screen). Mounted under the providers around RootNavigator; errors
 * thrown ABOVE it (provider construction) still reach Sentry via the global handler,
 * they just don't get the fallback UI.
 *
 * The fallback deliberately uses bare RN primitives, not the app's UI components —
 * the broken subtree may BE the UI library, and the boundary must still render.
 */
export default class SentryErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    Sentry.captureException(error);
  }

  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.detail}>
            The error has been reported. Close and reopen the app to try again.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 20, fontWeight: '600', color: '#111111' },
  detail: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#444444' },
});
