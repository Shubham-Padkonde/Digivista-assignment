import { NextResponse } from "next/server";
import { ApiError } from "./service.js";

/** Run a handler and turn ApiError into a clean JSON error. */
export function handle(fn) {
  try {
    return NextResponse.json(fn());
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: { code: "internal_error", message: "Something went wrong" } }, { status: 500 });
  }
}
