import {NextRequest,NextResponse} from "next/server";
import {db} from "@/lib/db";
import {allowedRepo,githubFile,obsidianSource,repositoryRef,validRepoPath} from "@/lib/experiment-sources";
export const dynamic="force-dynamic";
export async function GET(){
  try{
    const experiments=await db.researchExperiment.findMany({orderBy:{createdAt:"desc"},take:200});
    return NextResponse.json({experiments},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({error:"Experiment registry unavailable"},{status:503});}
}
export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    if(typeof body.title!=="string"||!body.title.trim()||body.title.length>200||typeof body.description!=="string"||body.description.length>12000)throw Error("Invalid title or description");
    if(body.sourceType!=="github"&&body.sourceType!=="obsidian")throw Error("Invalid experiment source");
    let repository:string|null=null, sourceRef:string|null=null;
    if(body.sourceType==="github"){
      if(typeof body.repository!=="string"||!allowedRepo(body.repository)||typeof body.sourcePath!=="string"||!validRepoPath(body.sourcePath)||!body.sourcePath.toLowerCase().endsWith(".md"))throw Error("Invalid repository Markdown source");
      repository=body.repository;sourceRef=await repositoryRef(repository);
      await githubFile(repository,body.sourcePath,sourceRef);
    }else{
      if(typeof body.sourcePath!=="string"||!body.sourcePath.startsWith("obsidian:"))throw Error("Invalid note reference");
      await obsidianSource(body.sourcePath);
    }
    const result=await db.researchExperiment.create({data:{title:body.title.trim(),description:body.description,sourceType:body.sourceType,repository,sourcePath:body.sourcePath,sourceRef}});
    return NextResponse.json(result,{status:201});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Experiment creation failed"},{status:400});}
}
