import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function DELETE(_request: NextRequest, { params }: {params:Promise<{id:string}>}) {
  try { const {id}=await params; await db.resourceLink.delete({where:{id}}); return NextResponse.json({ok:true}); }
  catch { return NextResponse.json({error:"Not found"},{status:404}); }
}
