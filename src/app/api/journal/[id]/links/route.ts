import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
type Context = { params: Promise<{ id: string }> };
const sources = ["github", "obsidian", "mlflow", "vikunja", "external"];
export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    if (!sources.includes(body.source) || typeof body.externalId !== "string" || !body.externalId.trim() || typeof body.label !== "string" || !body.label.trim() || body.label.length > 200 || typeof body.url !== "string") throw Error("Invalid link");
    const url = new URL(body.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw Error("Invalid protocol");
    if (body.url.length > 2048) throw Error("URL too long");
    const link = await db.resourceLink.upsert({ where: { journalId_source_externalId: { journalId: id, source: body.source, externalId: body.externalId } }, create: { journalId: id, source: body.source, externalId: body.externalId, url: body.url, label: body.label }, update: { url: body.url, label: body.label } });
    return NextResponse.json(link);
  } catch { return NextResponse.json({ error: "Invalid link" }, { status: 400 }); }
}
