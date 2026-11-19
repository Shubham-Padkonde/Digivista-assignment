import { getDb } from "@/lib/db.js";
import { getFeed } from "@/lib/service.js";
import { handle } from "@/lib/http.js";

export const dynamic = "force-dynamic";

export function GET(request) {
  const limit = new URL(request.url).searchParams.get("limit");
  return handle(() => getFeed(getDb(), { limit }));
}
