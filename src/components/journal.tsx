"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addMonths, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek, subMonths } from "date-fns";
import ReactMarkdown from "react-markdown";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Link2 } from "lucide-react";
import { JournalEditor } from "./journal-editor";
import { ResourceLinkEditor } from "./resource-link-editor";
import { ActivityFeed } from "./activity-feed";
import type { Entry } from "@/lib/types";
function localKey(date: Date){return format(date,"yyyy-MM-dd");}
export function Journal({ initialDate }: {initialDate?: string}) {
  const [current,setCurrent]=useState(()=>initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)?parseISO(initialDate):new Date());
  const [view,setView]=useState<"DAY"|"WEEK"|"MONTH">("MONTH");
  const [entries,setEntries]=useState<Entry[]>([]);
  const [editing,setEditing]=useState<Entry|null|undefined>(undefined);
  const [linking,setLinking]=useState<Entry|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const month=format(current,"yyyy-MM");
  const load=useCallback(async()=>{setLoading(true);try {
    const response=await fetch(`/api/journal?month=${month}`,{cache:"no-store"});if(!response.ok)throw Error("Journal unavailable");
    setEntries(await response.json());setError("");
  }catch(e){setError(String(e));}finally{setLoading(false);}},[month]);
  useEffect(()=>{void load();},[load]);
  const filtered=useMemo(()=>entries.filter(e=>{
    const d=parseISO(e.date.slice(0,10));
    if(view==="DAY")return localKey(d)===localKey(current);
    if(view==="WEEK")return getISOWeek(d)===getISOWeek(current)&&getISOWeekYear(d)===getISOWeekYear(current);
    return true;
  }),[entries,view,current]);
  const heading=view==="DAY"?format(current,"EEEE, d MMMM yyyy"):view==="WEEK"?`Week of ${format(startOfISOWeek(current),"d MMM yyyy")}`:format(current,"MMMM yyyy");
  function navigate(n:number){setCurrent(d=>view==="DAY"?addDays(d,n):view==="WEEK"?addDays(d,n*7):addMonths(d,n));}
  async function remove(id:string){if(!confirm("Delete this journal entry?"))return;const response=await fetch("/api/journal/"+id,{method:"DELETE"});if(response.ok)await load();else alert("Delete failed");}
  if(linking)return <ResourceLinkEditor entry={linking} onDone={()=>{setLinking(null);void load();}}/>;
  if(editing!==undefined)return <JournalEditor entry={editing??undefined} date={localKey(current)} onCancel={()=>setEditing(undefined)} onSaved={()=>{setEditing(undefined);void load();}}/>;
  return <div>
    <div className="page-header"><div><div className="eyebrow">Research history</div><h1>Journal</h1><p className="muted">Daily notes from your Obsidian PhD vault, alongside existing journal entries.</p></div><button className="button" onClick={()=>setEditing(null)}><Plus size={16}/> New entry</button></div>
    <div className="panel">
      <div className="page-header"><div><h2 style={{margin:0}}>{heading}</h2><div className="muted small">{filtered.length} entries</div></div><div className="toolbar"><button aria-label="Previous period" className="button secondary" onClick={()=>navigate(-1)}><ChevronLeft size={17}/></button><button className="button secondary" onClick={()=>setCurrent(new Date())}>Today</button><button aria-label="Next period" className="button secondary" onClick={()=>navigate(1)}><ChevronRight size={17}/></button></div></div>
      <div className="segmented" role="group" aria-label="Journal period">{(["DAY","WEEK","MONTH"] as const).map(p=><button className={view===p?"active":""} key={p} onClick={()=>setView(p)}>{p==="DAY"?"Day":p==="WEEK"?"Week":"Month"}</button>)}</div>
      <div className="spaced">{loading?<div className="loading">Loading…</div>:error?<p className="error">{error}</p>:filtered.length===0?<div className="empty">No entries for this period. Create your first research note.</div>:filtered.map(e=><article className="entry" key={e.id}>
        <div className="entry-date">{format(parseISO(e.date.slice(0,10)),"d MMM yyyy")} · {e.source==="obsidian"?"Obsidian daily note (read-only)":e.period.toLowerCase()+" journal"}</div>
        <div className="toolbar" style={{justifyContent:"space-between"}}><h3>{e.title}</h3>{e.source!=="obsidian"&&<div className="toolbar"><button className="button secondary" aria-label="Manage links" onClick={()=>setLinking(e)}><Link2 size={14}/></button><button className="button secondary" aria-label="Edit" onClick={()=>setEditing(e)}><Pencil size={14}/></button><button className="button danger" aria-label="Delete" onClick={()=>void remove(e.id)}><Trash2 size={14}/></button></div>}</div>
        <div className="markdown"><ReactMarkdown>{e.content}</ReactMarkdown></div>
        {e.links.length>0&&<div className="toolbar">{e.links.map(l=><a key={l.id} className="pill" target="_blank" rel="noopener noreferrer" href={l.url}><Link2 size={12}/> {l.label}</a>)}</div>}
      </article>)}</div>
    </div>
    <ActivityFeed current={current} period={view}/>
  </div>;
}
