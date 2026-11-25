import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {MAX_BUNDLE,unpackBundle} from "@/lib/run-bundle";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};

export async function GET(_request:NextRequest,{params}:Context){
  const {id}=await params;
  const runs=await db.experimentRun.findMany({where:{experimentId:id},orderBy:{importedAt:"desc"},include:{files:{select:{path:true}}}});
  return NextResponse.json({runs},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(request:NextRequest,{params}:Context){
  try{
    const {id}=await params;
    if(!await db.researchExperiment.findUnique({where:{id}}))throw Error("Experiment not found");
    if(request.headers.get("content-type")!=="application/zip"||!request.body)throw Error("Upload a ZIP bundle");
    const length=request.headers.get("content-length");
    const expected=length===null?null:Number(length);
    if(expected!==null&&(!Number.isSafeInteger(expected)||expected<0))throw Error("Invalid Content-Length");
    if(expected!==null&&expected>MAX_BUNDLE)return NextResponse.json({error:"ZIP exceeds 32 MiB"},{status:413});
    const reader=request.body.getReader();
    const chunks:Buffer[]=[];let size=0;
    try{
      while(true){
        const {done,value}=await reader.read();if(done)break;
        size+=value.length;if(size>MAX_BUNDLE){await reader.cancel();throw Error("ZIP exceeds 32 MiB");}
        chunks.push(Buffer.from(value));
      }
    }finally{reader.releaseLock();}
    if(expected!==null&&size!==expected)throw Error(`Incomplete upload: received ${size} of ${expected} bytes`);
    const zip=Buffer.concat(chunks);
    if(zip.length<4||zip.readUInt32LE(0)!==0x04034b50)throw Error("Upload is not a standard ZIP archive");
    const {manifest,files}=unpackBundle(zip);
    if(manifest.experiment_id!==id)throw Error("Manifest experiment ID does not match selected experiment");
    const variant=await db.datasetVariant.findUnique({where:{datasetId_variantId:{datasetId:manifest.dataset_id,variantId:manifest.variant_id}}});
    if(!variant||!variant.metadata||typeof variant.metadata!=="object"||Array.isArray(variant.metadata)||variant.metadata.sha256!==manifest.dataset_sha256||variant.metadata.environment!==manifest.environment)throw Error("Register the matching dataset variant and checksum first");
    const run=await db.experimentRun.create({data:{experimentId:id,datasetVariantId:variant.id,runKey:manifest.run_id,manifest,files:{create:Array.from(files,([path,content])=>({path,content:Uint8Array.from(content)}))}},select:{id:true}});
    return NextResponse.json(run,{status:201});
  }catch(e){return NextResponse.json({error:e instanceof Error&&e.name==="Error"?e.message:"Invalid bundle or duplicate run"},{status:400});}
}
