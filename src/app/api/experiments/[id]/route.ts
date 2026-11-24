import {NextResponse} from "next/server";
import {db} from "@/lib/db";
type Context={params:Promise<{id:string}>};
export async function DELETE(_request:Request,{params}:Context){
  try{const {id}=await params;if(await db.experimentRun.count({where:{experimentId:id}}))return NextResponse.json({error:"Experiment has imported runs"},{status:409});await db.researchExperiment.delete({where:{id}});return NextResponse.json({ok:true});}
  catch{return NextResponse.json({error:"Experiment not found"},{status:404});}
}
