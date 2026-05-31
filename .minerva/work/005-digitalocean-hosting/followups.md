# 005 — Followups

Deferred engineering work surfaced during 005 (DigitalOcean App Platform hosting). These are
deliberate deferrals, not loose ends — each is a candidate future work unit.

- **Database integration (DO Managed Postgres).** The whole point of choosing DO's full Node
  runtime was to enable an ordinary TCP database later. When the app outgrows mock data
  (`src/data/programs.ts`), provision DO Managed Postgres and wire a `pg`/ORM client with the
  connection URL as a `RUN_TIME` Doppler secret. See [[006-decision-digitalocean-app-platform-hosting]].

- **Native store delivery + origin wiring.** `app.config.ts` already reads `EXPO_PUBLIC_API_URL`
  into the router origin, but building and submitting the native iOS/Android apps (so they call
  the deployed DO origin) is a separate EAS Build / store-submission flow not covered here.

- **Optional: Dockerfile for container parity.** The buildpack is sufficient now. If other
  services later standardize on containers, a multi-stage Dockerfile (build with devDeps, slim
  runtime) is the migration path — note it would reintroduce the Doppler-CLI-in-image question
  that the buildpack + native Doppler sync currently avoids.
