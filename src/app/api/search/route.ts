import { NextResponse } from "next/server";
import { getContext } from "@/lib/auth/context";
import { globalSearch } from "@/lib/services/search";

export async function GET(req: Request) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    const hits = await globalSearch(ctx.workspaceId, q.slice(0, 100), 5);
    return NextResponse.json({ hits });
  } catch (e) {
    console.error("[search]", e);
    return NextResponse.json({ error: "Suche fehlgeschlagen" }, { status: 500 });
  }
}
