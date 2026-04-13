import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

/**
 * Liveness + MongoDB connectivity (for monitoring and local sanity checks).
 */
export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ ok: true, db: "connected" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database unavailable";
    return NextResponse.json({ ok: false, db: "error", error: msg }, { status: 503 });
  }
}
