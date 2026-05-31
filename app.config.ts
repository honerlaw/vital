import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic config layered over app.json. It MUST spread the injected `config`: in SDK 56
 * a dynamic config replaces the static app.json unless the static base is spread, which
 * would otherwise drop scheme/plugins/experiments. The only addition is the API-routes
 * origin for native clients, read from EXPO_PUBLIC_API_URL (falsy -> relative, for web/dev).
 *
 * `config.extra` is intentionally not spread: app.json defines no `extra`, and its values
 * are typed `any`, which the strict guardrails forbid spreading (no-unsafe-assignment).
 * `...config` already preserves every top-level key; expo-router fills in `extra.router`.
 *
 * `process.env.EXPO_PUBLIC_API_URL` is typed `any` here, so it is read through `unknown`
 * and narrowed with `typeof` rather than assigned directly (no-unsafe-assignment / no casts).
 */
export default ({ config }: ConfigContext): Partial<ExpoConfig> => {
  const rawOrigin: unknown = process.env.EXPO_PUBLIC_API_URL;
  const origin = typeof rawOrigin === 'string' && rawOrigin.length > 0 ? rawOrigin : false;

  return {
    ...config,
    extra: {
      router: { origin },
    },
  };
};
