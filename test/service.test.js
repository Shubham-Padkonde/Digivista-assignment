import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb } from "../lib/db.js";
import { seed, buildSeed, resetAndSeed, LIKER_COUNT } from "../lib/seed.js";
import { getFeed, swipe, getMatches, ApiError, MAX_FEED_LIMIT } from "../lib/service.js";

const { profiles: SEED_PROFILES, likers } = buildSeed();
const LIKER_SET = new Set(likers);
const someLiker = likers[0];
const nonLikers = SEED_PROFILES.filter((p) => !LIKER_SET.has(p.id)).map((p) => p.id);
const someNonLiker = nonLikers[0];
const otherNonLiker = nonLikers[1];

let db;
beforeEach(() => {
  db = openDb(":memory:");
  seed(db);
});

const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
const fullFeedIds = () => getFeed(db, { limit: MAX_FEED_LIMIT }).profiles.map((p) => p.id);
const rejects = (fn, status, code) =>
  assert.throws(fn, (e) => e instanceof ApiError && e.status === status && e.code === code);

describe("seed data", () => {
  test("has at least 30 complete profiles", () => {
    const rows = db.prepare("SELECT * FROM profiles").all();
    assert.ok(rows.length >= 30);
    for (const r of rows) {
      assert.ok(r.name && r.age >= 18 && r.photo_url && r.bio && r.place);
      assert.ok(JSON.parse(r.interests).length >= 3);
    }
  });

  test("some profiles have liked the user, but not all", () => {
    assert.equal(count("incoming_likes"), LIKER_COUNT);
    assert.ok(count("incoming_likes") < count("profiles"));
  });

  test("resetAndSeed clears swipes and matches and reseeds", () => {
    swipe(db, { profileId: someLiker, action: "like" });
    resetAndSeed(db);
    assert.equal(count("swipes"), 0);
    assert.equal(count("matches"), 0);
    assert.equal(count("profiles"), SEED_PROFILES.length);
    assert.equal(count("incoming_likes"), LIKER_COUNT);
  });
});

describe("matching rules", () => {
  test("liking someone who already liked you creates a match", () => {
    const res = swipe(db, { profileId: someLiker, action: "like" });
    assert.equal(res.matched, true);
    assert.equal(res.match.id, someLiker);
    assert.deepEqual(getMatches(db).matches.map((m) => m.id), [someLiker]);
  });

  test("liking someone who has not liked you does not match", () => {
    const res = swipe(db, { profileId: someNonLiker, action: "like" });
    assert.equal(res.matched, false);
    assert.equal("match" in res, false);
    assert.equal(getMatches(db).matches.length, 0);
  });

  test("passing on someone who liked you does not match, and a later like cannot change it", () => {
    const res = swipe(db, { profileId: someLiker, action: "pass" });
    assert.equal(res.matched, false);
    const again = swipe(db, { profileId: someLiker, action: "like" });
    assert.equal(again.action, "pass");
    assert.equal(again.matched, false);
    assert.equal(getMatches(db).matches.length, 0);
  });

  test("liking every profile matches exactly the seeded likers", () => {
    for (const id of fullFeedIds()) swipe(db, { profileId: id, action: "like" });
    const matched = getMatches(db).matches.map((m) => m.id).sort((a, b) => a - b);
    assert.deepEqual(matched, [...LIKER_SET].sort((a, b) => a - b));
  });
});

describe("idempotency", () => {
  test("a double like creates one swipe row and one match", () => {
    const first = swipe(db, { profileId: someLiker, action: "like" });
    const second = swipe(db, { profileId: someLiker, action: "like" });
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(second.matched, true);
    assert.equal(count("swipes"), 1);
    assert.equal(count("matches"), 1);
    assert.equal(getMatches(db).matches.length, 1);
  });

  test("a repeated swipe with a different action keeps the first decision", () => {
    swipe(db, { profileId: someNonLiker, action: "pass" });
    const res = swipe(db, { profileId: someNonLiker, action: "like" });
    assert.equal(res.action, "pass");
    assert.equal(db.prepare("SELECT action FROM swipes WHERE profile_id = ?").get(someNonLiker).action, "pass");
  });

  test("a failed swipe leaves no partial state and the connection stays usable", () => {
    rejects(() => swipe(db, { profileId: 9999, action: "like" }), 404, "profile_not_found");
    assert.equal(count("swipes"), 0);
    assert.equal(swipe(db, { profileId: someNonLiker, action: "pass" }).duplicate, false);
  });
});

describe("feed", () => {
  test("a swiped profile never appears again, whatever the action", () => {
    const [a, b] = getFeed(db).profiles;
    swipe(db, { profileId: a.id, action: "like" });
    swipe(db, { profileId: b.id, action: "pass" });
    const ids = fullFeedIds();
    assert.ok(!ids.includes(a.id));
    assert.ok(!ids.includes(b.id));
  });

  test("swiping through everything leaves an empty feed", () => {
    for (const id of fullFeedIds()) swipe(db, { profileId: id, action: "pass" });
    assert.deepEqual(getFeed(db).profiles, []);
  });

  test("respects the limit and rejects bad limits", () => {
    assert.equal(getFeed(db, { limit: "5" }).profiles.length, 5);
    for (const bad of ["0", "-1", "abc", "1.5", String(MAX_FEED_LIMIT + 1)]) {
      rejects(() => getFeed(db, { limit: bad }), 400, "invalid_limit");
    }
  });

  test("returns the same order on every call", () => {
    assert.deepEqual(fullFeedIds(), fullFeedIds());
  });
});

describe("privacy: incoming likes are never revealed before a match", () => {
  const ALLOWED_KEYS = ["age", "bio", "id", "interests", "name", "photoUrl", "place"];

  test("every feed profile has exactly the same fields, likers or not", () => {
    for (const p of getFeed(db, { limit: MAX_FEED_LIMIT }).profiles) {
      assert.deepEqual(Object.keys(p).sort(), ALLOWED_KEYS);
    }
  });

  test("the serialised feed carries no hint of incoming likes", () => {
    const text = JSON.stringify(getFeed(db, { limit: MAX_FEED_LIMIT })).toLowerCase();
    for (const word of ["liked", "incoming", "crush", "rank", "interested"]) {
      assert.ok(!text.includes(word), `feed JSON should not mention "${word}"`);
    }
  });

  test("feed order is identical whether or not anyone has liked the user", () => {
    const withLikes = fullFeedIds();
    db.exec("DELETE FROM incoming_likes");
    assert.deepEqual(fullFeedIds(), withLikes);
  });

  test("likers are not clustered at the front of the feed", () => {
    // A weak guard against someone later sorting likers first.
    const front = fullFeedIds().slice(0, LIKER_COUNT).filter((id) => LIKER_SET.has(id)).length;
    assert.ok(front > 0 && front < LIKER_COUNT, `${front} of the first ${LIKER_COUNT} cards were likers`);
  });

  test("a pass has the same response shape for likers and non-likers", () => {
    const a = swipe(db, { profileId: someLiker, action: "pass" });
    const b = swipe(db, { profileId: someNonLiker, action: "pass" });
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
    assert.equal(a.matched, false);
    assert.equal(b.matched, false);
  });

  test("a like on a non-liker has the same shape as a pass on a non-liker", () => {
    const like = swipe(db, { profileId: someNonLiker, action: "like" });
    const pass = swipe(db, { profileId: otherNonLiker, action: "pass" });
    assert.deepEqual(Object.keys(like).sort(), Object.keys(pass).sort());
  });

  test("the matches list never includes someone the user passed on", () => {
    swipe(db, { profileId: someLiker, action: "pass" });
    assert.deepEqual(getMatches(db).matches, []);
  });
});

describe("validation", () => {
  const bodies = [
    [null, "invalid_body"],
    ["like", "invalid_body"],
    [[1, "like"], "invalid_body"],
    [{}, "invalid_profile_id"],
    [{ action: "like" }, "invalid_profile_id"],
    [{ profileId: "3", action: "like" }, "invalid_profile_id"],
    [{ profileId: 1.5, action: "like" }, "invalid_profile_id"],
    [{ profileId: 0, action: "like" }, "invalid_profile_id"],
    [{ profileId: -4, action: "like" }, "invalid_profile_id"],
    [{ profileId: 1 }, "invalid_action"],
    [{ profileId: 1, action: "superlike" }, "invalid_action"],
    [{ profileId: 1, action: "LIKE" }, "invalid_action"],
  ];
  for (const [body, code] of bodies) {
    test(`rejects ${JSON.stringify(body)} with ${code}`, () => {
      rejects(() => swipe(db, body), 400, code);
      assert.equal(count("swipes"), 0);
    });
  }

  test("an unknown profile id is a 404", () => {
    rejects(() => swipe(db, { profileId: 100000, action: "like" }), 404, "profile_not_found");
  });
});

describe("persistence", () => {
  test("swipes and matches survive closing and reopening the database file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coy-test-"));
    const file = path.join(dir, "t.db");
    try {
      const first = openDb(file);
      seed(first);
      swipe(first, { profileId: someLiker, action: "like" });
      swipe(first, { profileId: someNonLiker, action: "pass" });
      first.close();

      const second = openDb(file);
      assert.deepEqual(getMatches(second).matches.map((m) => m.id), [someLiker]);
      const ids = getFeed(second, { limit: MAX_FEED_LIMIT }).profiles.map((p) => p.id);
      assert.ok(!ids.includes(someLiker) && !ids.includes(someNonLiker));
      second.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
