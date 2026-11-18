"use client";
import { useState } from "react";
import type { Entry } from "@/lib/types";
export function JournalEditor({ entry, date, onSaved, onCancel }: {entry?:Entry;date:string;onSaved:()=>void;onCancel:()=>void}) {
  const [title,setTitle] = useState(entry?.title ?? "");
  const [content,setContent] = useState(entry?.content ?? "");
  const [period,setPeriod] = useState(entry?.period ?? "DAY");
  const [day,setDay] = useState(entry?.date?.slice(0,10) ?? date);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function save(e:React.FormEvent) {
    e.preventDefault();setBusy(true);setError("");
    try {
      const response=await fetch(entry ? `/api/journal/${entry.id}` : "/api/journal",{method:entry?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,content,period,date:day})});
      if(!response.ok)throw new Error((await response.json()).error??"Save failed");
      onSaved();
    } catch(e){setError(e instanceof Error?e.message:"Save failed");}finally{setBusy(false);}
  }
  return <form className="panel form" onSubmit={save}>
    <h2>{entry?"Edit journal entry":"New journal entry"}</h2>
    <label className="field">Title<input className="input" maxLength={300} required value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <div className="grid two">
      <label className="field">Date<input className="input" type="date" required value={day} onChange={e=>setDay(e.target.value)}/></label>
      <label className="field">Journal period<select value={period} onChange={e=>setPeriod(e.target.value as typeof period)}><option value="DAY">Daily</option><option value="WEEK">Weekly</option><option value="MONTH">Monthly</option></select></label>
    </div>
    <label className="field">Research notes (Markdown)<textarea className="textarea" value={content} onChange={e=>setContent(e.target.value)} placeholder="Objectives, work done, findings, problems and next steps…"/></label>
    {error&&<div className="error">{error}</div>}
    <div className="toolbar"><button className="button" disabled={busy}>{busy?"Saving…":"Save entry"}</button><button type="button" className="button secondary" onClick={onCancel}>Cancel</button></div>
  </form>;
}
