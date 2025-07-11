-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Maps table
CREATE TABLE IF NOT EXISTS maps (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_private    BOOLEAN NOT NULL DEFAULT FALSE,
  access_token  TEXT UNIQUE    -- for private maps
);

-- Pins table
CREATE TABLE IF NOT EXISTS pins (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id       UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  description  TEXT,
  photo_urls   TEXT[]      NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions (for notifications, phase 2)
CREATE TABLE IF NOT EXISTS subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id       UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL CHECK (channel IN ('email','signal','telegram','sms')),
  endpoint     TEXT NOT NULL,       -- e.g. email address or Signal/Telegram username
  filters      JSONB,               -- e.g. { tags: ['water','shelter'] }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
