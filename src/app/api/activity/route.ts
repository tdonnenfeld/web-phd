import { NextRequest, NextResponse } from "next/server";
import { githubActivity, vikunjaActivity } from "@/lib/integrations";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
  const month=request.nextUrl.searchParams.get("month")??new Date().toISOString().slice(0,7);
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return NextResponse.json({error:"Invalid month"},{status:400});
  const sources=await Promise.allSettled([githubActivity(month),vikunjaActivity(month)]);
  const activities=sources.flatMap(x=>x.status==="fulfilled"?x.value:[]).sort((a,b)=>b.date.localeCompare(a.date));
  return NextResponse.json(activities,{headers:{"Cache-Control":"private, no-store"}});
}
