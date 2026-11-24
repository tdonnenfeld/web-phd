import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {validateVariant,validId} from "@/lib/dataset-metadata";

import {discoverDatasets} from "@/lib/dataset-discovery";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    const discovery=await discoverDatasets();
    const datasets=await db.researchDataset.findMany({orderBy:{title:"asc"},include:{variants:{orderBy:{variantId:"asc"}}}});
    return NextResponse.json({datasets:datasets.map(d=>({...d,variants:d.variants.map(v=>({...v,localManifestFound:discovery.available.has(d.id+"/"+v.variantId)}))})),discoveryEnabled:discovery.enabled,warnings:discovery.warnings},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({error:"Dataset registry unavailable"},{status:503});}
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    if(body.kind==="variant"){
      const metadata=validateVariant(body.metadata);
      const variant=await db.datasetVariant.create({data:{datasetId:metadata.dataset_id,variantId:metadata.variant_id,metadata}});
      return NextResponse.json(variant,{status:201});
    }
    if(body.kind!=="dataset"||!validId(body.id)||typeof body.title!=="string"||!body.title.trim()||body.title.length>200||typeof body.description!=="string"||body.description.length>12000)throw Error("Invalid dataset");
    const dataset=await db.researchDataset.create({data:{id:body.id,title:body.title.trim(),description:body.description}});
    return NextResponse.json(dataset,{status:201});
  }catch(e){
    return NextResponse.json({error:e instanceof Error&&e.name==="Error"?e.message:"Could not register dataset or variant (check unique identifiers and parent dataset)"},{status:400});
  }
}

export async function PATCH(request:NextRequest){
  try{
    const body=await request.json();
    if(!validId(body.id)||typeof body.title!=="string"||!body.title.trim()||body.title.length>200||typeof body.description!=="string"||body.description.length>12000)throw Error("Invalid dataset");
    return NextResponse.json(await db.researchDataset.update({where:{id:body.id},data:{title:body.title.trim(),description:body.description}}));
  }catch{return NextResponse.json({error:"Could not update dataset"},{status:400});}
}
