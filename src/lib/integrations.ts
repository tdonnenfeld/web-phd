import type { Activity } from "@/lib/types";
const timeoutMs = 9000;
async function getJson(url: string, headers: Record<string,string> = {}, init?: RequestInit): Promise<unknown> {
  const response=await fetch(url,{...init,headers:{Accept:"application/json",...headers,...init?.headers},signal:AbortSignal.timeout(timeoutMs),cache:"no-store"});
  if(!response.ok)throw new Error(`Integration HTTP ${response.status}`);
  return response.json();
}
export function githubRepos(){return(process.env.GITHUB_REPOS??"").split(",").map(x=>x.trim()).filter(x=>/^[\w.-]+\/[\w.-]+$/.test(x));}
export async function githubActivity(month:string):Promise<Activity[]> {
  const token=process.env.GITHUB_TOKEN;
  if(!token)return [];
  const start=month+"-01T00:00:00Z";
  const [y,m]=month.split("-").map(Number);
  const end=new Date(Date.UTC(y,m,1)).toISOString();
  const headers={Authorization:`Bearer ${token}`,"X-GitHub-Api-Version":"2022-11-28"};
  const all=await Promise.all(githubRepos().map(async repo=>{
    const base=`https://api.github.com/repos/${repo}`;
    const calls=await Promise.allSettled([
      getJson(`${base}/commits?since=${encodeURIComponent(start)}&until=${encodeURIComponent(end)}&per_page=100`,headers),
      getJson(`${base}/pulls?state=all&sort=updated&direction=desc&per_page=100`,headers),
      getJson(`${base}/issues?state=all&since=${encodeURIComponent(start)}&per_page=100`,headers),
      getJson(`${base}/releases?per_page=30`,headers),
    ]);
    const rows=<T,>(i:number):T[]=>{ const result=calls[i]; return result?.status==="fulfilled"&&Array.isArray(result.value)?result.value as T[]:[]; };
    type Commit={sha:string;html_url:string;commit:{message:string;author?:{date?:string}}};
    type Item={id:number;title:string;html_url:string;created_at:string;updated_at?:string;published_at?:string;pull_request?:unknown;tag_name?:string};
    const commits=rows<Commit>(0).map(c=>({id:`github:commit:${repo}:${c.sha}`,source:"github" as const,kind:"commit",title:c.commit.message.split("\n")[0],subtitle:repo,date:c.commit.author?.date??start,url:c.html_url}));
    const prs=rows<Item>(1).filter(i=>i.created_at>=start&&i.created_at<end).map(i=>({id:`github:pr:${repo}:${i.id}`,source:"github" as const,kind:"pull_request",title:`PR: ${i.title}`,subtitle:repo,date:i.created_at,url:i.html_url}));
    const issues=rows<Item>(2).filter(i=>!i.pull_request&&i.created_at>=start&&i.created_at<end).map(i=>({id:`github:issue:${repo}:${i.id}`,source:"github" as const,kind:"issue",title:`Issue: ${i.title}`,subtitle:repo,date:i.created_at,url:i.html_url}));
    const releases=rows<Item>(3).filter(i=>(i.published_at??i.created_at)>=start&&(i.published_at??i.created_at)<end).map(i=>({id:`github:release:${repo}:${i.id}`,source:"github" as const,kind:"release",title:`Release: ${i.tag_name??i.title}`,subtitle:repo,date:i.published_at??i.created_at,url:i.html_url}));
    return [...commits,...prs,...issues,...releases];
  }));
  return all.flat();
}
function vikunjaSettings(){const base=process.env.VIKUNJA_URL?.replace(/\/$/,"");const token=process.env.VIKUNJA_TOKEN;if(!base||!token)return null;return {base,headers:{Authorization:`Bearer ${token}`}};}
type Task={id:number;title:string;done:boolean;due_date?:string|null;created?:string;updated?:string;project_id?:number};
export async function vikunjaTasks():Promise<Task[]> {
  const cfg=vikunjaSettings();if(!cfg)return [];
  const data=await getJson(cfg.base+"/api/v1/tasks/all?per_page=100",cfg.headers);
  return Array.isArray(data)?data as Task[]:[];
}
export async function vikunjaActivity(month:string):Promise<Activity[]> {
  const tasks=await vikunjaTasks();return tasks.filter(t=>(t.due_date??t.created??"").startsWith(month)).map(t=>({id:`vikunja:task:${t.id}`,source:"vikunja",kind:"task",title:t.title,subtitle:t.done?"Completed":"Open",date:t.due_date??t.created??month+"-01",url:`https://tasks.les12.fr/tasks/${t.id}`,status:t.done?"done":"open"}));
}
export async function writeVikunjaTask(action:"create"|"update",payload:{projectId?:number;id?:number;title?:string;done?:boolean;due_date?:string|null}) {
  const cfg=vikunjaSettings();if(!cfg)throw new Error("Vikunja not configured");
  const path=action==="create"?`/api/v1/projects/${payload.projectId}/tasks`:`/api/v1/tasks/${payload.id}`;
  if(action==="create"&&(!Number.isInteger(payload.projectId)||!payload.title?.trim()))throw new Error("Project and task title are required");
  if(action==="update"&&!Number.isInteger(payload.id))throw new Error("Valid task ID required");
  return getJson(cfg.base+path,{...cfg.headers,"Content-Type":"application/json"},{method:action==="create"?"PUT":"POST",body:JSON.stringify({title:payload.title,done:payload.done,due_date:payload.due_date})});
}
type MlfRun={info:{run_id:string;experiment_id:string;start_time?:number;artifact_uri?:string};data?:{metrics?:Array<{key:string;value:number}>;tags?:Array<{key:string;value:string}>}};
export async function mlflowRuns():Promise<MlfRun[]>{
  const base=process.env.MLFLOW_URL?.replace(/\/$/,"");if(!base)return [];
  const ex=await getJson(base+"/api/2.0/mlflow/experiments/search",{}, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({max_results:100})}) as {experiments?:Array<{experiment_id:string}>};
  if(!ex.experiments?.length)return [];
  const result=await getJson(base+"/api/2.0/mlflow/runs/search",{}, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({experiment_ids:ex.experiments.map(e=>e.experiment_id),max_results:100,order_by:["attributes.start_time DESC"]})}) as {runs?:MlfRun[]};
  return result.runs??[];
}
export async function mlflowActivity(month:string):Promise<Activity[]>{
  const runs=await mlflowRuns();return runs.filter(r=>r.info.start_time&&new Date(r.info.start_time).toISOString().startsWith(month)).map(r=>({id:"mlflow:run:"+r.info.run_id,source:"mlflow",kind:"experiment",title:r.data?.tags?.find(t=>t.key==="mlflow.runName")?.value??"Experiment "+r.info.run_id.slice(0,8),date:new Date(r.info.start_time!).toISOString(),url:"/experiments?run="+encodeURIComponent(r.info.run_id),subtitle:r.info.experiment_id}));
}
