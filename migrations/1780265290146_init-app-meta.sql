-- Up Migration
--
-- Initial, domain-neutral migration that proves the migration pipeline end-to-end without
-- coupling to any feature schema (auth/data schema lands in its own unit). It enables the
-- pgcrypto extension (commonly needed for UUID/crypto helpers later) and creates a trivial
-- key/value table the app can use for lightweight metadata.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_meta (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Down Migration

DROP TABLE IF EXISTS app_meta;
-- pgcrypto is left in place on down: it is a shared, idempotent extension that other
-- migrations may depend on, so dropping it here could break them.
