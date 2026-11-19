// All business rules live here, independent of Next.js, so they can be tested
// against an in-memory database.
//
// Privacy rule: the only place `incoming_likes` is read is inside swipe(), and
// only to decide whether the user's own like completes a match. No feed query
// or response shape depends on it.

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const ACTIONS = ["like", "pass"];
export const DEFAULT_FEED_LIMIT = 20;
export const MAX_FEED_LIMIT = 50;

/** The only profile fields that ever leave the server. */
function toPublicProfile(row) {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    photoUrl: row.photo_url,
    bio: row.bio,
    place: row.place,
    interests: JSON.parse(row.interests),
  };
}

function parseLimit(raw) {
  if (raw === undefined || raw === null || raw === "") return DEFAULT_FEED_LIMIT;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_FEED_LIMIT) {
    throw new ApiError(400, "invalid_limit", `limit must be an integer between 1 and ${MAX_FEED_LIMIT}`);
  }
  return n;
}

/** Profiles the user has not swiped on yet, in a fixed order unrelated to likes. */
export function getFeed(db, { limit } = {}) {
  const max = parseLimit(limit);
  const rows = db
    .prepare(
      `SELECT p.* FROM profiles p
       WHERE NOT EXISTS (SELECT 1 FROM swipes s WHERE s.profile_id = p.id)
       ORDER BY p.feed_rank
       LIMIT ?`
    )
    .all(max);
  return { profiles: rows.map(toPublicProfile) };
}

function validateSwipe(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError(400, "invalid_body", "Request body must be a JSON object");
  }
  const { profileId, action } = input;
  if (!Number.isInteger(profileId) || profileId < 1) {
    throw new ApiError(400, "invalid_profile_id", "profileId must be a positive integer");
  }
  if (!ACTIONS.includes(action)) {
    throw new ApiError(400, "invalid_action", `action must be one of: ${ACTIONS.join(", ")}`);
  }
  return { profileId, action };
}

function getProfile(db, id) {
  return db.prepare("SELECT * FROM profiles WHERE id = ?").get(id);
}

/**
 * Record a like or pass. Safe to call twice for the same profile: the first
 * swipe wins and later calls return the stored outcome without writing.
 */
export function swipe(db, input) {
  const { profileId, action } = validateSwipe(input);

  // Immediate lock so two processes cannot interleave check-then-insert.
  db.exec("BEGIN IMMEDIATE");
  try {
    const profile = getProfile(db, profileId);
    if (!profile) throw new ApiError(404, "profile_not_found", "No such profile");

    const existing = db.prepare("SELECT action FROM swipes WHERE profile_id = ?").get(profileId);
    let result;
    if (existing) {
      const matched = !!db.prepare("SELECT 1 FROM matches WHERE profile_id = ?").get(profileId);
      result = { action: existing.action, duplicate: true, matched };
    } else {
      const now = new Date().toISOString();
      db.prepare("INSERT INTO swipes (profile_id, action, created_at) VALUES (?, ?, ?)").run(profileId, action, now);
      let matched = false;
      if (action === "like" && db.prepare("SELECT 1 FROM incoming_likes WHERE profile_id = ?").get(profileId)) {
        db.prepare("INSERT INTO matches (profile_id, created_at) VALUES (?, ?)").run(profileId, now);
        matched = true;
      }
      result = { action, duplicate: false, matched };
    }
    db.exec("COMMIT");

    const response = { profileId, action: result.action, duplicate: result.duplicate, matched: result.matched };
    if (result.matched) response.match = toPublicProfile(profile);
    return response;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/** Mutual matches, newest first. */
export function getMatches(db) {
  const rows = db
    .prepare(
      `SELECT p.*, m.created_at AS matched_at FROM matches m
       JOIN profiles p ON p.id = m.profile_id
       ORDER BY m.created_at DESC, p.id DESC`
    )
    .all();
  return { matches: rows.map((r) => ({ ...toPublicProfile(r), matchedAt: r.matched_at })) };
}
