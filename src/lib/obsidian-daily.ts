import "server-only";
import {readdir,readFile} from "node:fs/promises";
import path from "node:path";
import type {Entry} from "@/lib/types";

/** Read-only view over the PhD vault's YYYY-MM-DD.md daily notes.
 * The directory is mounted read-only by Docker; never mutate source files.
 */
const dailyName=/^(\d{4}-\d{2}-\d{2})\.md$/i;
const monthName=/^\d{4}-(0[1-9]|1[0-2])$/;
const maxDepth=7;
const maxFiles=1000;
const maxNoteBytes=200_000;

function validDay(day:string):boolean{
  const date=new Date(day+"T00:00:00.000Z");
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===day;
}

function parseNote(markdown:string,day:string):{title:string;content:string}{
  let body=markdown;
  let title="";
  if(body.startsWith("---\n")){
    const end=body.indexOf("\n---",4);
    if(end>=0){
      const metadata=body.slice(4,end).split("\n");
      const titleRow=metadata.find(line=>/^title:\s*/i.test(line));
      if(titleRow)title=titleRow.replace(/^title:\s*/i,"").trim().replace(/^["']|["']$/g,"");
      body=body.slice(end+4).replace(/^\r?\n/,"");
    }
  }
  return {title:title||"Daily note · "+day,content:body};
}

export async function obsidianDailyEntries(month?:string):Promise<Entry[]>{
  const root=process.env.OBSIDIAN_DAILY_DIR??"";
  if(!root)return [];
  if(month&&!monthName.test(month))throw new Error("Invalid month");
  const notes:Entry[]=[];
  let files=0;
  async function visit(dir:string,depth:number):Promise<void>{
    if(depth>maxDepth)return;
    const children=await readdir(dir,{withFileTypes:true});
    for(const child of children){
      if(child.name.startsWith(".")||child.name==="private"||child.name==="templates")continue;
      // Dirent checks exclude symlinked files and directories.
      if(child.isDirectory()){await visit(path.join(dir,child.name),depth+1);continue;}
      if(!child.isFile())continue;
      files++;
      if(files>maxFiles)throw new Error("Obsidian vault exceeds the daily-note scanning limit");
      const match=dailyName.exec(child.name);
      if(!match||!validDay(match[1])||(month&&!match[1].startsWith(month)))continue;
      const file=path.join(dir,child.name);
      // Guard against unexpectedly large notes.
      const buffer=await readFile(file);
      if(buffer.byteLength>maxNoteBytes)continue;
      const parsed=parseNote(buffer.toString("utf8"),match[1]);
      const relative=path.relative(root,file).split(path.sep).join("/");
      notes.push({
        id:"obsidian:"+relative,
        date:match[1]+"T00:00:00.000Z",
        title:parsed.title,
        content:parsed.content,
        period:"DAY",
        links:[],
        source:"obsidian",
      });
    }
  }
  await visit(root,0);
  return notes.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
