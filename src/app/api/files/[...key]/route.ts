import { NextResponse } from "next/server";
import { getContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { getStorage } from "@/lib/storage";

/** Authenticated download. Only files referenced by a record of the active workspace are served. */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const ctx = await getContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = (await params).key.map(decodeURIComponent).join("/");

  const [version, attachment] = await Promise.all([
    db.documentVersion.findFirst({ where: { storageKey: key, document: { workspaceId: ctx.workspaceId } } }),
    db.attachment.findFirst({ where: { storageKey: key, task: { workspaceId: ctx.workspaceId } } }),
  ]);
  const meta = version ?? attachment;
  if (!meta) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await getStorage().get(key);
  if (!data) return NextResponse.json({ error: "Datei nicht im Storage vorhanden" }, { status: 404 });
  const inline = new URL(req.url).searchParams.get("inline") === "1" && /^(image\/|application\/pdf|text\/)/.test(meta.mimeType);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": meta.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(meta.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=0",
    },
  });
}
