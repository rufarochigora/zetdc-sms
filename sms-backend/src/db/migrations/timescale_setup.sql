-- Run this once against the database AFTER the initial Prisma migration
-- (i.e. after the "Reading" table exists), to turn it into a TimescaleDB
-- hypertable for efficient time-series storage/queries.
--
-- Usage:
--   docker compose exec postgres psql -U sms -d sms -f /path/to/timescale_setup.sql
-- or, from the host if psql is installed:
--   psql "$DATABASE_URL" -f sms-backend/src/db/migrations/timescale_setup.sql

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert the Reading table into a hypertable partitioned on "timestamp".
-- migrate_data => true lets this run safely even if rows already exist.
SELECT create_hypertable('"Reading"', 'timestamp', if_not_exists => TRUE, migrate_data => TRUE);

-- Optional but recommended on a self-hosted Postgres+Timescale instance:
-- compress older chunks to save space on a pilot deployment that will
-- accumulate readings every 5-10s per site indefinitely.
--
-- SKIP THIS BLOCK on managed Postgres providers that only expose the
-- Apache-2 (community) edition of TimescaleDB - e.g. Render Postgres.
-- Compression policies are a licensed Timescale feature and this ALTER
-- TABLE will fail with a permissions/feature error on those hosts.
--
-- ALTER TABLE "Reading" SET (
--   timescaledb.compress,
--   timescaledb.compress_segmentby = '"siteId", metric'
-- );
-- SELECT add_compression_policy('"Reading"', INTERVAL '7 days', if_not_exists => TRUE);
