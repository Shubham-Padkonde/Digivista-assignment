/** @type {import('next').NextConfig} */
const nextConfig = {
  // The brief names the endpoints GET /feed, POST /swipe and GET /matches.
  // They live under /api, and these rewrites make the short paths work too.
  async rewrites() {
    return [
      { source: "/feed", destination: "/api/feed" },
      { source: "/swipe", destination: "/api/swipe" },
      { source: "/matches", destination: "/api/matches" },
    ];
  },
};

export default nextConfig;
