import "server-only";
import {obsidianDailyEntries} from "@/lib/obsidian-daily";
import path from "node:path";

export const experimentRepos=["tdonnenfeld/tomo-compression","tdonnenfeld/tomo-mct-pipeline","tdonnenfeld/volcomp","tdonnenfeld/codecomp"] as const;
export type ExperimentSourceType="github"|"obsidian";
export const resultCandidates=["results/results.md","results.md","README.md"] as const;

export function allowedRepo(repo:string):boolean{return experimentRepos.includes(repo as typeof experimentRepos[number]);}
export function validRepoPath(p:string):boolean{
  return p.length>0&&p.length<=350&&!p.startsWith("/")&&!p.includes("\\")&&
    p.split("/").every(s=>s.length>0&&s!=="."&&s!==".."&&!s.startsWith("."))&&/^[\w./ -]+$/.test(p);
}
function githubHeaders(){const token=process.env.GITHUB_TOKEN;return {"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",...(token?{"Authorization":`Bearer ${token}`}:{})};}
export async function repositoryRef(repo:string):Promise<string>{
  if(!allowedRepo(repo))throw Error("Repository is not approved");
  const response=await fetch(`https://api.github.com/repos/${repo}/commits/main`,{headers:githubHeaders(),cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error(`GitHub commit lookup failed (${response.status})`);
  const obj=await response.json() as {sha?:string};
  if(!obj.sha||!/^[a-f0-9]{40}$/.test(obj.sha))throw Error("Invalid GitHub commit reference");
  return obj.sha;
}
export async function githubFile(repo:string,file:string,ref:string):Promise<{bytes:Buffer;type:string}>{
  if(!allowedRepo(repo)||!validRepoPath(file)||!/^[a-f0-9]{40}$/.test(ref))throw Error("Invalid source reference");
  const encoded=file.split("/").map(encodeURIComponent).join("/");
  const response=await fetch(`https://api.github.com/repos/${repo}/contents/${encoded}?ref=${ref}`,{headers:githubHeaders(),cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error(`GitHub file unavailable (${response.status})`);
  const data=await response.json() as {type?:string;content?:string;encoding?:string;size?:number};
  if(data.type!=="file"||data.encoding!=="base64"||!data.content||!Number.isFinite(data.size)||data.size!>2_000_000)throw Error("File unavailable or too large");
  const bytes=Buffer.from(data.content.replace(/\s/g,""),"base64");
  if(bytes.length>2_000_000)throw Error("File too large");
  const ext=path.extname(file).toLowerCase();
  const type=ext===".png"?"image/png":ext===".jpg"||ext===".jpeg"?"image/jpeg":ext===".webp"?"image/webp":ext===".svg"?"image/svg+xml":ext===".md"?"text/markdown; charset=utf-8":"application/octet-stream";
  return {bytes,type};
}
export async function obsidianSource(noteId:string):Promise<{title:string;content:string}>{
  const notes=await obsidianDailyEntries();
  const item=notes.find(n=>n.id===noteId);
  if(!item)throw Error("Obsidian daily note not found");
  return {title:item.title,content:item.content};
}
