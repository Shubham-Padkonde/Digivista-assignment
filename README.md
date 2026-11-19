# Coy Discover

A mobile-first swipe feature for Coy, built as a standalone Next.js app. It has a bottom tab bar with an empty Home tab and a Discover tab that holds everything: a card deck, an "It's a match!" screen and a Matches list.

The rule that shaped the design is Coy's own: **nobody learns that someone liked them unless the like is mutual.** The feed, the swipe response and every other API output are built so that incoming likes cannot be inferred from them. See [Privacy design](#privacy-design).

Part A of the assignment (feature suggestions) is in [PART_A_Feature_Suggestions.md](PART_A_Feature_Suggestions.md), with a PDF copy alongside it.

## Stack

- Next.js 16 (App Router) and React 19, plain JavaScript, no UI libraries
- Next.js route handlers for the API
- SQLite through Node's built-in `node:sqlite` module, so there is no native dependency to compile
- Node's built-in test runner (`node --test`)

Requires **Node.js 22.13 or newer**. It was built and tested on Node 26.

## Setup and run

```bash
npm install
npm run dev
```

Open http://localhost:3000 (use your browser's device toolbar for a phone-sized view). On first request the app creates `data/coy.db` and seeds it, so no separate setup step is needed.

For a production build:

```bash
npm run build
npm start
```

### Step by step, from a fresh machine

1. **Install Node.js 22.13 or newer** from https://nodejs.org (the LTS or current release is fine). Check it with `node -v`.
2. **Get the code.** Clone the repository and move into it:
   ```bash
   git clone https://github.com/<your-username>/coy-discover.git
   cd coy-discover
   ```
3. **Install dependencies** (three packages: `next`, `react`, `react-dom`):
   ```bash
   npm install
   ```
4. **Run the tests** to confirm the setup works. All 35 should pass:
   ```bash
   npm test
   ```
5. **Start the app in development mode:**
   ```bash
   npm run dev
   ```
6. **Open http://localhost:3000.** In Chrome, press F12 and turn on the device toolbar to see the phone layout. The app creates and seeds `data/coy.db` on the first request.
7. **Try it.** Swipe or use the buttons. About one in three likes produces a match. Open the Matches view to see them, and reload the page to confirm everything persists.
8. **Replay the demo** at any time. Stop the server (Ctrl+C), then run `npm run reset` and start it again.

If port 3000 is busy, run `npx next dev -p 3001` instead. If `npm install` or the app complains about `node:sqlite`, your Node version is too old; upgrade it.

### Seed and reset

```bash
npm run seed    # create and seed the database if it is empty
npm run reset   # clear all swipes and matches, then reseed
```

Set `COY_DB` to use a different database file. `npm run reset` is the quickest way to replay the demo.

### Tests

```bash
npm test
```

The suite has 35 tests and runs in well under a second against an in-memory database.

## Demo guide

The seed has 36 profiles. Twelve of them have already liked the logged-in user. To see a match, keep liking: about one card in three will produce the "It's a match!" screen. Passing on someone who liked you never produces a match, and a swiped profile never comes back, so use `npm run reset` to start over.

Controls: drag the card left or right (touch or mouse), or use the pass and like buttons, or the left and right arrow keys.

## API

All endpoints are available at `/api/...` and, to match the brief, at the shorter paths `/feed`, `/swipe` and `/matches` (see `next.config.mjs`). Errors always have the shape `{ "error": { "code": "...", "message": "..." } }`.

### `GET /api/feed?limit=20`

Profiles the user has not swiped on, in a fixed order. `limit` is optional (1 to 50, default 20); anything else is a 400.

```json
{
  "profiles": [
    { "id": 25, "name": "Yash", "age": 24, "photoUrl": "/avatars/25.svg",
      "bio": "Sunday cricket, Monday regrets about my knees.",
      "place": "Indore", "interests": ["Cricket", "Fitness", "Photography", "Football"] }
  ]
}
```

### `POST /api/swipe`

Body: `{ "profileId": 25, "action": "like" | "pass" }`

```json
{ "profileId": 25, "action": "like", "duplicate": false, "matched": false }
```

When the like completes a match, the response also carries `"match"` with the matched profile (same shape as in the feed). Status codes:

| Status | Code | When |
| --- | --- | --- |
| 200 | | Swipe recorded, or an earlier swipe on this profile returned unchanged (`"duplicate": true`) |
| 400 | `invalid_json`, `invalid_body`, `invalid_profile_id`, `invalid_action` | Malformed request |
| 404 | `profile_not_found` | No profile with that id |

### `GET /api/matches`

Mutual matches, newest first. Each item is a profile plus `matchedAt`.

```json
{ "matches": [ { "id": 25, "name": "Yash", "...": "...", "matchedAt": "2026-11-18T08:49:12.429Z" } ] }
```

## Project layout

```
app/                 pages, global CSS, and the three API route handlers
components/          TabBar, Discover, SwipeDeck, ProfileCard, MatchOverlay, MatchesList
lib/service.js       all business rules (feed, swipe, matches, validation)
lib/db.js            SQLite connection and schema
lib/seed.js          mock data and reset logic
lib/http.js          maps service errors to JSON responses
scripts/             seed/reset script and avatar generator
test/                automated tests for the service layer
public/avatars/      generated placeholder portraits
```

The route handlers are deliberately thin. Everything that decides behaviour sits in `lib/service.js` and takes a database handle as an argument, which is what lets the tests run against `:memory:` without starting a server.

## Design decisions and trade-offs

**A swipe is final and idempotent.** `swipes` has `profile_id` as its primary key, and `swipe()` runs inside a `BEGIN IMMEDIATE` transaction. A repeated swipe returns the stored outcome with `duplicate: true` and writes nothing, so a double tap, a retried request or two tabs cannot create duplicate rows or a second match. A repeat with a *different* action does not change the first decision. That mirrors Coy's own rule that adding is final, and it also stops a user from flipping a swipe to probe whether the other person liked them.

**Matches are decided on the server, at the moment of the user's like.** The client never sends "I am matching with X". The service checks the private incoming-likes table inside the same transaction that records the swipe.

**Seeded likes live in their own table.** `incoming_likes` stands in for the other users' side of the system. No query that builds a feed or a list reads it. The only read is the match check inside `swipe()`.

**Local queue with server confirmation.** The client loads up to 50 cards, shows one at a time and sends each swipe in the background. When the queue empties it refetches before showing the empty state, after waiting for in-flight swipes, and it filters out anything it has already swiped. If a swipe request fails, the card is put back and a message is shown.

**SQLite over a JSON file.** The uniqueness constraint and the transaction give real idempotency guarantees. A JSON file would need hand-written locking for the same result.

**Plain JavaScript and `node:sqlite`.** This keeps the install to three packages and avoids a native build step on Windows. The trade-off is that `node:sqlite` is newer than the usual `better-sqlite3`, and the minimum Node version is 22.13.

**Hand-rolled drag handling.** Pointer events on the top card are enough for this interaction and keep the dependency list short. The card follows the pointer, tilts, shows LIKE or PASS stamps that fade in with distance, and flies off past a 110px threshold or springs back. `touch-action: pan-y` lets the page scroll vertically without fighting the gesture. Animations respect `prefers-reduced-motion`.

## Privacy design

Incoming likes can leak in four ways: a field, the ordering, the response shape, or the timing of when something appears. This is what the code does about each.

- **Fields.** `toPublicProfile()` is an allow-list of seven fields. There is no `likedYou` flag, and the feed query does not join `incoming_likes`.
- **Ordering.** The feed is ordered by `feed_rank`, a fixed shuffle created at seed time with a different random stream from the one that picks who liked the user. Likers are therefore spread evenly through the deck. A test checks that the order is identical with and without incoming likes.
- **Response shape.** A pass on a liker and a pass on a non-liker return exactly the same keys. A like on a non-liker returns the same keys as a pass. `match` appears only when the like is mutual.
- **Edit-and-retry.** Because swipes cannot be changed, there is no way to swipe, observe the outcome and undo it.

What this does not cover: the match response arrives immediately after a like, so a user who likes someone can tell whether that person liked them. That is the intended mutual-match moment, not a leak. Response timing differences are negligible here but would deserve attention against a real user base.

## What I would do next

- **Real authentication and a users table.** Today there is one implicit user. Swipes, likes and matches would become `(user_id, target_id)` pairs, with a unique constraint on the pair and a canonical ordering for match rows.
- **Tests at the HTTP layer and in the browser.** The business rules are covered, but route handlers and the drag interaction are currently checked by hand. I would add handler tests and a small Playwright run for the swipe flow.
- **Cursor-based feed pagination** and a ranking step that is still independent of incoming likes (for example by distance or shared interests).
- **Rate limiting on `POST /swipe`.** Even without leaks, it protects against scripted scraping of the deck.
- **Real photo storage** instead of generated placeholders, and image preloading for the next card.
- **An undo window** for accidental swipes, designed carefully so it cannot be used to probe, which is also the subject of the first proposal in Part A.
- **Accessibility pass** with a screen reader. Buttons and arrow keys exist, but the drag interaction and the match dialog need real testing.

## Verified

Automated tests (35), a production build, a scripted API pass with curl (feed, swipe, duplicate swipe, unknown id, bad JSON, bad types, matches), and a pass in a browser at phone width: the drag gesture (driven with synthetic pointer events), the like button, the match overlay, the Matches list and badge, the empty state, and persistence after a reload. Not tested: real touch hardware, a real mouse drag, Safari, and other browsers.
