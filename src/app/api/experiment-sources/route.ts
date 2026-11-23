import {NextResponse} from "next/server";
import {experimentRepos,resultCandidates,githubFile,repositoryRef} from "@/lib/experiment-sources";
import {obsidianDailyEntries} from "@/lib/obsidian-daily";
export const dynamic="force-dynamic";
export async function GET(){
  const [repos,notes]=await Promise.all([
    Promise.all(experimentRepos.map(async repo=>{
      try{
        const ref=await repositoryRef(repo);
        const checks=await Promise.all(resultCandidates.map(async p=>{try{await githubFile(repo,p,ref);return p;}catch{return null;}}));
        return {repo,ref,files:checks.filter((p):p is string=>p!==null)};
      }catch{return {repo,ref:null,files:[] as string[]};}
    })),
    obsidianDailyEntries().then(list=>list.map(n=>({id:n.id,title:n.title,date:n.date.slice(0,10)}))).catch(()=>[]),
  ]);
  return NextResponse.json({repos,notes},{headers:{"Cache-Control":"private, no-store"}});
}
