import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic config layered over app.json. It MUST spread the injected `config`: in SDK 56
 * a dynamic config replaces the static app.json unless the static base is spread, which
 * would otherwise drop scheme/plugins/experiments. The only addition is the API-routes
 * origin for native clients, read from EXPO_PUBLIC_API_URL (falsy -> relative, for web/dev).
 *
 * `config.extra` IS spread (guarded with `?? {}`): app.json now defines `extra.eas.projectId`
 * (the EAS project linkage), and returning a bare `extra: { router }` here would clobber it.
 * The `?? {}` guard keeps the spread within the strict guardrails (no-unsafe-assignment).
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
      ...(config.extra ?? {}),
      router: { origin },
    },
  };
};
