import {randomUUID} from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import {open,realpath} from "node:fs/promises";
import {constants} from "node:fs";
import {join} from "node:path";
import {db} from "@/lib/db";
import {validateVariant} from "@/lib/dataset-metadata";
import {MAX_BUNDLE,unpackBundle} from "@/lib/run-bundle";
import type {PalmaLaunch} from "@prisma/client";

const workflow="https://api.github.com/repos/tdonnenfeld/phd-experiments/actions/workflows/palma-tomo.yml";
const runApi="https://api.github.com/repos/tdonnenfeld/phd-experiments/actions/runs";
const datasetId="sample_0001",variantId="quick_4rows";
export const activeStatuses=["dispatching","queued","running","unknown","import_pending"];
export function configured(){
  return Boolean(process.env.PHD_ACTIONS_TOKEN&&process.env.PHD_DATASETS_DIR&&process.env.PHD_RESULTS_DIR);
}
async function github(url:string,init:RequestInit={}){
  const token=process.env.PHD_ACTIONS_TOKEN;
  if(!token)throw Error("Palma Actions token is not configured");
  return fetch(url,{...init,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000),headers:{Accept:"application/vnd.github+json",Authorization:"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"}});
}
async function readFile(path:string,max:number){
  const file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  try{
    const stat=await file.stat();
    if(!stat.isFile()||stat.size>max)throw Error("Invalid or oversized local file");
    const buffer=Buffer.alloc(stat.size);
    let offset=0;
    while(offset<buffer.length){
      const {bytesRead}=await file.read(buffer,offset,buffer.length-offset,offset);
      if(!bytesRead)throw Error("Incomplete local file");
      offset+=bytesRead;
    }
    return buffer;
  }finally{await file.close();}
}
async function localDataset(){
  const root=process.env.PHD_DATASETS_DIR;
  if(!root)throw Error("Palma datasets not configured");
  const base=await realpath(root);
  const dir=join(base,datasetId,variantId);
  if(await realpath(dir)!==dir)throw Error("Unexpected dataset directory");
  const metadata=validateVariant(JSON.parse((await readFile(join(dir,"manifest.json"),100000)).toString("utf8")));
  if(metadata.dataset_id!==datasetId||metadata.variant_id!==variantId||metadata.environment!=="palma"||!Array.isArray(metadata.shape)||metadata.shape[1]!==4||typeof metadata.sha256!=="string")throw Error("Unexpected local dataset metadata");
  await db.researchDataset.upsert({where:{id:datasetId},create:{id:datasetId,title:datasetId},update:{}});
  const variant=await db.datasetVariant.upsert({where:{datasetId_variantId:{datasetId,variantId}},create:{datasetId,variantId,metadata},update:{}});
  if(!variant.metadata||typeof variant.metadata!=="object"||Array.isArray(variant.metadata)||variant.metadata.sha256!==metadata.sha256||variant.metadata.environment!=="palma")throw Error("Registered dataset conflicts with local manifest");
  return metadata.sha256;
}
export async function launch(experimentId:string,input:unknown,commit:unknown){
  if(!configured())throw Error("Palma execution is not configured");
  const selected=Array.isArray(input)?input:[input];
  if(!selected.length||selected.length>6||selected.some(r=>typeof r!=="number"||![2,4,8,16,32,64].includes(r))||new Set(selected).size!==selected.length||typeof commit!=="string"||(commit!==""&&!/^[a-f0-9]{40}$/.test(commit)))throw Error("Invalid ratio or commit");
  const ratios=(selected as number[]).sort((a,b)=>a-b);
  if(!await db.researchExperiment.findUnique({where:{id:experimentId}}))throw Error("Experiment not found");
  const datasetSha=await localDataset();
  const request=await db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(712530)`;
    if(await tx.palmaLaunch.findFirst({where:{status:{in:activeStatuses}}}))throw Error("A Palma request is already active; refresh its status first");
    return tx.palmaLaunch.create({data:{id:randomUUID(),experimentId,ratio:ratios[0],ratios,pipelineCommit:commit,datasetSha,status:"dispatching"}});
  });
  try{
    const response=await github(workflow+"/dispatches",{method:"POST",body:JSON.stringify({ref:"main",inputs:{request_id:request.id,experiment_id:experimentId,pipeline_commit:commit,ratio:String(ratios[0]),ratios:ratios.join(" ")}})});
    if(!response.ok){
      const status=response.status>=500?"unknown":"dispatch_failed";
      return db.palmaLaunch.update({where:{id:request.id},data:{status,message:"GitHub dispatch returned HTTP "+response.status}});
    }
    return db.palmaLaunch.update({where:{id:request.id},data:{status:"queued"}});
  }catch{
    return db.palmaLaunch.update({where:{id:request.id},data:{status:"unknown",message:"Dispatch outcome unknown; refresh before retrying"}});
  }
}
type GitHubRun={id:number;display_title:string;status:string;conclusion:string|null;run_attempt:number};
async function getRun(request:PalmaLaunch):Promise<GitHubRun|null>{
  const url=request.githubRunId?runApi+"/"+request.githubRunId:workflow+"/runs?event=workflow_dispatch&branch=main&per_page=100";
  const response=await github(url);
  if(!response.ok)throw Error("GitHub status returned HTTP "+response.status);
  const data=await response.json();
  const title="Palma tomography / "+request.id;
  const run=request.githubRunId?data:(data.workflow_runs as GitHubRun[]).find(r=>r.display_title===title);
  if(!run)return null;
  if(run.display_title!==title||!Number.isSafeInteger(run.id)||run.id<1||!Number.isSafeInteger(run.run_attempt)||run.run_attempt<1)throw Error("Unexpected GitHub run identity");
  return run;
}
async function importResult(request:PalmaLaunch,run:GitHubRun){
  const root=process.env.PHD_RESULTS_DIR;
  if(!root)throw Error("Palma results not configured");
  const key="palma-"+run.id+"-"+run.run_attempt;
  const {manifest,files}=unpackBundle(await readFile(join(root,key+".zip"),MAX_BUNDLE));
  if(manifest.experiment_id!==request.experimentId||manifest.run_id!==key||manifest.workflow_run_id!==run.id||manifest.environment!=="palma"||manifest.repository!=="tdonnenfeld/tomo-mct-pipeline"||manifest.dataset_id!==datasetId||manifest.variant_id!==variantId||manifest.dataset_sha256!==request.datasetSha||(request.pipelineCommit&&manifest.commit!==request.pipelineCommit))throw Error("Result provenance does not match request");
  const parameters=manifest.parameters;
  if(!parameters||typeof parameters!=="object"||Array.isArray(parameters)||JSON.stringify((parameters as Record<string,unknown>).ratios)!==JSON.stringify(request.ratios.length?request.ratios:[request.ratio]))throw Error("Result ratio differs from request");
  if(manifest.status!==(run.conclusion==="success"?"completed":"failed"))throw Error("Result status differs from workflow");
  const variant=await db.datasetVariant.findUnique({where:{datasetId_variantId:{datasetId,variantId}}});
  if(!variant||!variant.metadata||typeof variant.metadata!=="object"||Array.isArray(variant.metadata)||variant.metadata.sha256!==request.datasetSha||variant.metadata.environment!=="palma")throw Error("Dataset registration changed");
  const runFiles=Array.from(files,([path,content])=>({path,content:Uint8Array.from(content)}));
  await db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(712531)`;
    const existing=await tx.experimentRun.findUnique({where:{experimentId_runKey:{experimentId:request.experimentId,runKey:key}}});
    if(existing&&!isDeepStrictEqual(existing.manifest,manifest))throw Error("Existing imported run conflicts with local bundle");
    if(!existing)await tx.experimentRun.create({data:{experimentId:request.experimentId,datasetVariantId:variant.id,runKey:key,manifest,files:{create:runFiles}}});
    await tx.palmaLaunch.update({where:{id:request.id},data:{status:manifest.status,message:"Results imported",githubRunId:String(run.id)}});
  },{maxWait:10000,timeout:60000});
}
async function updateActive(id:string,data:{status?:string;message?:string;githubRunId?:string}){
  await db.palmaLaunch.updateMany({where:{id,status:{in:activeStatuses}},data});
}
export async function syncLaunch(request:PalmaLaunch){
  try{
    const run=await getRun(request);
    if(!run){
      if(Date.now()-request.createdAt.getTime()>10*60*1000)await updateActive(request.id,{status:"unknown",message:"No matching GitHub run found; check Actions before releasing this request"});
      return;
    }
    const githubRunId=String(run.id);
    if(run.status!=="completed"){
      await updateActive(request.id,{githubRunId,status:run.status==="in_progress"?"running":"queued",message:""});
      return;
    }
    try{await importResult(request,run);}
    catch(e){
      const missing=(e as NodeJS.ErrnoException).code==="ENOENT";
      await updateActive(request.id,{githubRunId,status:run.conclusion==="success"?"import_pending":"failed",message:missing?"Workflow ended without a readable result ZIP":e instanceof Error?e.message:"Result import failed"});
    }
  }catch{
    await updateActive(request.id,{message:"Could not refresh GitHub status; retry shortly"});
  }
}
