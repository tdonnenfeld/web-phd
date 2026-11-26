import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {activeStatuses,availableVariants,configured,launch,syncLaunch} from "@/lib/palma";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};

export async function GET(_request:NextRequest,{params}:Context){
  const {id}=await params;
  const launches=await db.palmaLaunch.findMany({where:{experimentId:id},orderBy:{createdAt:"desc"},take:30});
  return NextResponse.json({launches,configured:configured(),variants:await availableVariants()},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:NextRequest,{params}:Context){
  try{
    if(request.headers.get("sec-fetch-site")==="cross-site"||!request.headers.get("content-type")?.startsWith("application/json"))throw Error("Invalid request");
    const {id}=await params;
    const body=await request.json();
    if(body.action==="launch"){
      const record=await launch(id,body.ratios??body.ratio,body.commit,body.variant,body.backend,body.projectionIndex,body.slices,body.datasetId,body.method);
      return NextResponse.json(record,{status:201});
    }
    if(body.action==="sync"){
      if(configured()){
        const records=await db.palmaLaunch.findMany({where:{experimentId:id,status:{in:activeStatuses}},take:10});
        for(const record of records)await syncLaunch(record);
      }
      return NextResponse.json({ok:true});
    }
    if(body.action==="release"){
      const record=await db.palmaLaunch.findFirst({where:{id:body.id,experimentId:id,status:{in:["unknown","import_pending"]}}});
      if(!record)throw Error("Request is not releasable");
      await db.palmaLaunch.update({where:{id:record.id},data:{status:"released",message:"Released manually; results can still be imported by ZIP"}});
      return NextResponse.json({ok:true});
    }
    throw Error("Unknown action");
  }catch(e){return NextResponse.json({error:e instanceof Error&&e.name==="Error"?e.message:"Palma request failed"},{status:400});}
}
