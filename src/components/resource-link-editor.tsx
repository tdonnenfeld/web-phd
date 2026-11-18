"use client";
import { useState } from "react";
import type { Entry } from "@/lib/types";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
export function ResourceLinkEditor({entry,onDone}:{entry:Entry;onDone:()=>void}) {
  const [source,setSource]=useState("github");
  const [externalId,setExternalId]=useState("");
  const [label,setLabel]=useState("");
  const [url,setUrl]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function add(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try {
      const r=await fetch(`/api/journal/${entry.id}/links`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({source,externalId,label,url})});
      if(!r.ok)throw Error((await r.json()).error??"Could not add link");
      onDone();
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  async function remove(id:string){
    const r=await fetch("/api/links/"+id,{method:"DELETE"});
    if(r.ok)onDone();else setError("Could not remove link");
  }
  return <div><div className="page-header"><div><div className="eyebrow">Research provenance</div><h1>Linked resources</h1><p className="muted">{entry.title}</p></div><button className="button secondary" onClick={onDone}><ArrowLeft size={15}/> Back to journal</button></div>
    <div className="panel"><h2>Existing links</h2><div className="list">{entry.links.map(l=><div className="list-item" key={l.id}><div><div><a className="resource-link" href={l.url} target="_blank" rel="noopener noreferrer">{l.label} <ExternalLink size={12}/></a></div><div className="muted small">{l.source} · {l.externalId}</div></div><button className="button danger" aria-label={"Remove "+l.label} onClick={()=>void remove(l.id)}><Trash2 size={14}/></button></div>)}{!entry.links.length&&<div className="empty">No resources linked yet.</div>}</div></div>
    <form className="panel form spaced" onSubmit={add}><h2>Link a research resource</h2><div className="grid two"><label className="field">Source<select value={source} onChange={e=>setSource(e.target.value)}>{["github","obsidian","mlflow","vikunja","external"].map(s=><option value={s} key={s}>{s}</option>)}</select></label><label className="field">Stable identifier<input className="input" required value={externalId} onChange={e=>setExternalId(e.target.value)} placeholder="Full Git commit SHA, run ID, or task ID"/></label></div><label className="field">Description<input className="input" value={label} required onChange={e=>setLabel(e.target.value)} placeholder="The result or change documented"/></label><label className="field">URL<input className="input" type="url" required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://github.com/.../commit/..."/></label>{error&&<p className="error">{error}</p>}<div><button className="button" disabled={busy}>Add link</button></div></form>
  </div>;
}
