import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {activeStatuses} from "@/lib/palma";

type Context={params:Promise<{id:string}>};

export async function DELETE(request:Request,{params}:Context){
  if(request.headers.get("sec-fetch-site")==="cross-site"||!request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json({error:"Invalid deletion request"},{status:400});
  try{
    const {id}=await params;
    const body=await request.json();
    if(body?.confirm!==true)return NextResponse.json({error:"Confirm deletion of the experiment and its run history"},{status:400});
    const result=await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(712530)`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(712531)`;
      if(!await tx.researchExperiment.findUnique({where:{id},select:{id:true}}))return "missing";
      if(await tx.palmaLaunch.findFirst({where:{experimentId:id,status:{in:activeStatuses}},select:{id:true}}))return "active";
      await tx.palmaLaunch.deleteMany({where:{experimentId:id}});
      await tx.experimentRun.deleteMany({where:{experimentId:id}});
      await tx.researchExperiment.delete({where:{id}});
      return "deleted";
    },{maxWait:10000,timeout:30000});
    if(result==="missing")return NextResponse.json({error:"Experiment not found"},{status:404});
    if(result==="active")return NextResponse.json({error:"This experiment has an active or pending Palma request. Resolve it before deleting."},{status:409});
    return NextResponse.json({ok:true});
  }catch(e){
    console.error("Experiment deletion failed",e);
    return NextResponse.json({error:"Could not delete experiment and run history"},{status:500});
  }
}
