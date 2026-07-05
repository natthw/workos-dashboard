import { NextResponse } from "next/server";
import { vaultVersion } from "@/lib/workos/version";

// Always computed live; never cached. This is the cheap probe the client polls
// to decide whether a full re-scan is needed.
export const dynamic = "force-dynamic";

export function GET() {
  try {
    return NextResponse.json(
      { version: vaultVersion() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }
}
