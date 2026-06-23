-- Up Migration
--
-- Food / calorie tracking foundation (032). One additive table: the per-user food diary.
--
-- food_log_entries — one logged food per row, keyed by clerk_user_id (soft reference, no FK —
-- same 012 rationale as user_state / workout_sessions). `logged_on` is the diary DAY, computed
-- in the user's LOCAL timezone client-side and sent as a date string, so an entry logged near
-- local midnight lands on the correct local day rather than the UTC day. The four macros
-- (calories / protein_g / carbs_g / fat_g) are stored ABSOLUTE for the logged quantity and
-- SNAPSHOTTED at log time — re-fetching USDA later can never retroactively rewrite a past total
-- (the same self-containment 028 gives workout history). `quantity` + `serving_label` retain the
-- provenance for display ("1.5 × 100 g"); `source` is 'usda' | 'manual' and `source_ref` holds
-- the USDA fdcId when source = 'usda' (null for manual entries). `id` is a uuid (pgcrypto
-- gen_random_uuid, enabled in the init migration). The diary is fetched per-day (date-scoped),
-- never boot-hydrated, so the index is on (clerk_user_id, logged_on).

CREATE TABLE food_log_entries (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text        NOT NULL,
  logged_on     date        NOT NULL,
  name          text        NOT NULL,
  quantity      numeric     NOT NULL,
  serving_label text        NOT NULL,
  calories      numeric     NOT NULL,
  protein_g     numeric     NOT NULL,
  carbs_g       numeric     NOT NULL,
  fat_g         numeric     NOT NULL,
  source        text        NOT NULL,
  source_ref    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX food_log_entries_user_day_idx
  ON food_log_entries (clerk_user_id, logged_on);

-- Down Migration

DROP TABLE food_log_entries;
