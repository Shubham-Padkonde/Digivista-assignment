import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { seedIfEmpty } from "./seed.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS profiles (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  age        INTEGER NOT NULL,
  photo_url  TEXT NOT NULL,
  bio        TEXT NOT NULL,
  place      TEXT NOT NULL,
  interests  TEXT NOT NULL,            -- JSON array of strings
  feed_rank  INTEGER NOT NULL          -- fixed shuffle position; unrelated to likes
);

-- Likes that other people have already sent to the logged-in user.
-- This table is private to the service layer: no query that feeds an API
-- response may select from it except the match check inside swipe().
CREATE TABLE IF NOT EXISTS incoming_likes (
  profile_id INTEGER PRIMARY KEY REFERENCES profiles(id)
);

-- One row per profile the user has acted on. The primary key is what makes
-- a swipe idempotent: a profile can only ever be swiped once.
CREATE TABLE IF NOT EXISTS swipes (
  profile_id INTEGER PRIMARY KEY REFERENCES profiles(id),
  action     TEXT NOT NULL CHECK (action IN ('like', 'pass')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  profile_id INTEGER PRIMARY KEY REFERENCES profiles(id),
  created_at TEXT NOT NULL
);
`;

/** Open a database and make sure the schema exists. Pass ":memory:" in tests. */
export function openDb(file) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");
  db.exec(SCHEMA);
  return db;
}

export function defaultDbPath() {
  return process.env.COY_DB || path.join(process.cwd(), "data", "coy.db");
}

/**
 * Shared connection for the Next.js server. Cached on globalThis so that
 * dev-mode hot reloads do not open a new connection every time.
 */
export function getDb() {
  if (!globalThis.__coyDb) {
    const db = openDb(defaultDbPath());
    seedIfEmpty(db);
    globalThis.__coyDb = db;
  }
  return globalThis.__coyDb;
}
