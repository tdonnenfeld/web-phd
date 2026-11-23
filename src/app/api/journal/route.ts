import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { monthBounds, utcDate } from "@/lib/dates";
import { Period } from "@prisma/client";
import { obsidianDailyEntries } from "@/lib/obsidian-daily";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month");
    const where = month ? { date: { gte: monthBounds(month).start, lt: monthBounds(month).end } } : {};
    const [entries, daily] = await Promise.all([db.journalEntry.findMany({ where, include: { links: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 500 }),obsidianDailyEntries(month??undefined)]);
    return NextResponse.json([...entries.map(e=>({...e,source:"database" as const})),...daily].sort((a,b)=>b.date.toISOString?.().localeCompare?.(a.date.toISOString?.())??0));
  } catch { return NextResponse.json({ error: "Could not load journal entries" }, { status: 400 }); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 300 || typeof body.content !== "string" || body.content.length > 200000 || !["DAY", "WEEK", "MONTH"].includes(body.period)) {
      return NextResponse.json({ error: "Invalid journal entry" }, { status: 400 });
    }
    const date = utcDate(body.date);
    const entry = await db.journalEntry.create({ data: { date, title: body.title.trim(), content: body.content, period: body.period as Period } });
    return NextResponse.json(entry, { status: 201 });
  } catch { return NextResponse.json({ error: "Invalid input" }, { status: 400 }); }
}
