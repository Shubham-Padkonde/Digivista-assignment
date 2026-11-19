// Thin fetch wrapper used by the UI. Throws an Error carrying the server message.
async function request(url, options) {
  const res = await fetch(url, { cache: "no-store", ...options });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // fall through to the generic error below
  }
  if (!res.ok) throw new Error(data?.error?.message || `Request failed (${res.status})`);
  return data;
}

export const fetchFeed = () => request("/api/feed?limit=50").then((d) => d.profiles);
export const fetchMatches = () => request("/api/matches").then((d) => d.matches);
export const postSwipe = (profileId, action) =>
  request("/api/swipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId, action }),
  });
