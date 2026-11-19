// Usage: npm run seed   (create and seed the database if it is empty)
//        npm run reset  (wipe swipes and matches, reseed from scratch)
import { openDb, defaultDbPath } from "../lib/db.js";
import { seedIfEmpty, resetAndSeed, LIKER_COUNT } from "../lib/seed.js";

const reset = process.argv.includes("--reset");
const file = defaultDbPath();
const db = openDb(file);

if (reset) {
  resetAndSeed(db);
  console.log(`Reset ${file}: swipes and matches cleared, profiles reseeded (${LIKER_COUNT} have liked you).`);
} else if (seedIfEmpty(db)) {
  console.log(`Seeded ${file} (${LIKER_COUNT} profiles have liked you).`);
} else {
  console.log(`${file} already has data. Use "npm run reset" to start over.`);
}
db.close();
