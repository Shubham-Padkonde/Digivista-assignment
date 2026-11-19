import { NextResponse } from "next/server";
import { getDb } from "@/lib/db.js";
import { swipe } from "@/lib/service.js";
import { handle } from "@/lib/http.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Request body must be valid JSON" } },
      { status: 400 }
    );
  }
  return handle(() => swipe(getDb(), body));
}
