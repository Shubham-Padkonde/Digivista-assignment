import { getDb } from "@/lib/db.js";
import { getMatches } from "@/lib/service.js";
import { handle } from "@/lib/http.js";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(() => getMatches(getDb()));
}
