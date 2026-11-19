// Mock data for the demo. Everything here is deterministic so that tests and
// screenshots are repeatable.

const PEOPLE = [
  ["Aarav", 23, "IIT Bombay"], ["Diya", 21, "Delhi University"], ["Kabir", 25, "Bengaluru"],
  ["Meera", 22, "St. Xavier's, Mumbai"], ["Rohan", 24, "Pune"], ["Ananya", 20, "Christ University"],
  ["Vihaan", 26, "Hyderabad"], ["Ishita", 23, "NIT Trichy"], ["Arjun", 27, "Gurugram"],
  ["Saanvi", 22, "Jadavpur University"], ["Reyansh", 21, "BITS Pilani"], ["Kiara", 24, "Mumbai"],
  ["Dev", 25, "Chennai"], ["Tara", 23, "Ashoka University"], ["Neil", 28, "Bengaluru"],
  ["Myra", 21, "Symbiosis, Pune"], ["Aditya", 24, "IIM Ahmedabad"], ["Navya", 22, "Hyderabad"],
  ["Samar", 26, "Delhi"], ["Zoya", 25, "Lucknow"], ["Krish", 20, "VIT Vellore"],
  ["Pari", 23, "Jaipur"], ["Veer", 27, "Kolkata"], ["Anika", 22, "Presidency University"],
  ["Yash", 24, "Indore"], ["Riya", 21, "Mumbai"], ["Ayaan", 25, "Chandigarh"],
  ["Sia", 23, "Kochi"], ["Lakshya", 26, "Noida"], ["Mahika", 20, "Manipal"],
  ["Ishaan", 24, "IIT Delhi"], ["Nisha", 28, "Ahmedabad"], ["Parth", 22, "Nagpur"],
  ["Tanvi", 25, "Bhopal"], ["Om", 23, "Goa"], ["Rhea", 21, "Pune"],
];

const BIOS = [
  "Final-year engineer who still reads comics on the metro.",
  "Will happily argue about the best chai stall in the city.",
  "Sunday long rides, weekday spreadsheets.",
  "Learning guitar badly. Open to feedback.",
  "Part-time foodie, full-time overthinker.",
  "Ask me about my sourdough starter. It has a name.",
  "Gym at 6am, memes by 6:05.",
  "Bookstore wanderer, currently reading too many things at once.",
  "Weekend trekker with a questionable sense of direction.",
  "I make playlists for every mood and occasionally share them.",
  "Cricket on the terrace beats any night out.",
  "Film school dropout who still has strong opinions.",
  "Looking for someone to split a dessert with.",
  "Debate society veteran. I lose arguments about pizza toppings only.",
  "Building a side project that is 80% done and has been for a year.",
  "Sketchbook in my bag, chai in my hand.",
  "Case-study nerd who relaxes with football manager games.",
  "Dog person. The dog has more followers than I do.",
  "Delhi winters, jackets, and street momos.",
  "Poetry on weekends, spreadsheets on weekdays.",
  "Hostel cook, famous for one very good maggi.",
  "Will drive anywhere for a good kachori.",
  "Old Bollywood songs and rainy Kolkata evenings.",
  "Philosophy major who overthinks group chats.",
  "Sunday cricket, Monday regrets about my knees.",
  "Mumbai local train philosopher.",
  "Road trips with no fixed destination.",
  "Backwater mornings, filter coffee, long walks.",
  "Startup by day, stand-up open mics by night.",
  "Coding club president, terrible at chess.",
  "Professional second-guesser of my own playlists.",
  "Gardening on a balcony the size of a doormat.",
  "Fantasy football champion of one very small league.",
  "Amateur photographer, forever chasing golden hour.",
  "Beach shack regular, laptop in tow.",
  "Anime marathons and homemade ramen.",
];

const INTERESTS = [
  "Travel", "Coffee", "Films", "Cricket", "Photography", "Cooking", "Music", "Books",
  "Trekking", "Gaming", "Dance", "Fitness", "Art", "Podcasts", "Football", "Startups",
];

/** Small seeded PRNG (mulberry32). Good enough for demo data. */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, rand) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const LIKER_COUNT = 12;

/** Build the seed rows without touching a database. */
export function buildSeed() {
  const rand = prng(20240611);
  const ids = PEOPLE.map((_, i) => i + 1);

  // Two independent shuffles: one decides the display order, the other decides
  // who liked the user. Keeping them separate means feed position tells you
  // nothing about incoming likes.
  const order = shuffle(ids, prng(101));
  const likers = shuffle(ids, prng(202)).slice(0, LIKER_COUNT);

  const profiles = PEOPLE.map(([name, age, place], i) => {
    const id = i + 1;
    const picks = shuffle(INTERESTS, rand).slice(0, 3 + Math.floor(rand() * 2));
    return {
      id,
      name,
      age,
      photo_url: `/avatars/${id}.svg`,
      bio: BIOS[i],
      place,
      interests: picks,
      feed_rank: order.indexOf(id),
    };
  });

  return { profiles, likers };
}

/** Insert the mock profiles and incoming likes. Does nothing if profiles exist. */
export function seedIfEmpty(db) {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM profiles").get();
  if (n > 0) return false;
  seed(db);
  return true;
}

export function seed(db) {
  const { profiles, likers } = buildSeed();
  const insertProfile = db.prepare(
    "INSERT INTO profiles (id, name, age, photo_url, bio, place, interests, feed_rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertLike = db.prepare("INSERT INTO incoming_likes (profile_id) VALUES (?)");
  db.exec("BEGIN");
  try {
    for (const p of profiles) {
      insertProfile.run(p.id, p.name, p.age, p.photo_url, p.bio, p.place, JSON.stringify(p.interests), p.feed_rank);
    }
    for (const id of likers) insertLike.run(id);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/** Wipe every table and seed again. Used by `npm run reset` and by tests. */
export function resetAndSeed(db) {
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM matches; DELETE FROM swipes; DELETE FROM incoming_likes; DELETE FROM profiles;");
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  seed(db);
}
