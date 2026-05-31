import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from '@/auth/RootNavigator';
import { getPublishableKey } from '@/auth/clerk-config';
import StateProvider from '@/state/StateProvider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  // Keep the splash up until fonts are ready; RootNavigator then holds it until Clerk loads, so
  // the user never sees a flash of the sign-in screen before the session state is known.
  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={getPublishableKey()} tokenCache={tokenCache}>
        <StateProvider>
          <RootNavigator />
        </StateProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
