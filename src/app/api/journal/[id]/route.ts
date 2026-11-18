import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { utcDate } from "@/lib/dates";
import { Period } from "@prisma/client";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 300 || typeof body.content !== "string" || body.content.length > 200000 || !["DAY","WEEK","MONTH"].includes(body.period)) return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
    const entry = await db.journalEntry.update({ where: { id }, data: { title: body.title.trim(), content: body.content, period: body.period as Period, date: utcDate(body.date) } });
    return NextResponse.json(entry);
  } catch { return NextResponse.json({ error: "Unable to update entry" }, { status: 400 }); }
}
export async function DELETE(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  try { await db.journalEntry.delete({ where: { id } }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Unable to delete entry" }, { status: 404 }); }
}
