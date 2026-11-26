"use client";
import {LoadingList,LoadingStatus} from "@/components/loading";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {Plus,Upload,Download,Search,Trash2,ArrowUpDown} from "lucide-react";
type Field="paper"|"authors"|"year"|"journal"|"imageType"|"notes";
type Paper={id:string;createdAt:string;paper:string;authors:string;year:string;journal:string;imageType:string;notes:string};
const fields:{key:Field;name:string}[]=[
{key:"paper",name:"Paper"},{key:"authors",name:"Authors"},{key:"year",name:"Year"},{key:"journal",name:"Journal"},{key:"imageType",name:"Image type"},{key:"notes",name:"Notes"}];
const empty={paper:"",authors:"",year:"",journal:"",imageType:"",notes:""};
function quoteCsv(s:string){return '"'+s.replace(/"/g,'""')+'"';}
export function LiteratureTable(){
 const [loading,setLoading]=useState(true);
 const [papers,setPapers]=useState<Paper[]>([]);
 const [search,setSearch]=useState("");
 const [sort,setSort]=useState<Field>("paper");
 const [asc,setAsc]=useState(true);
 const [editing,setEditing]=useState<string|null>(null);
 const [draft,setDraft]=useState("");
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [adding,setAdding]=useState(false);
 const [newRow,setNewRow]=useState(empty);
 const fileRef=useRef<HTMLInputElement>(null);
 const load=useCallback(async()=>{
  const r=await fetch("/api/literature",{cache:"no-store"});
  const d=await r.json();
  if(!r.ok)throw Error(d.error??"Cannot load literature");
  setPapers(d.papers);
 },[]);
 useEffect(()=>{load().catch(e=>setError(String(e))).finally(()=>setLoading(false));},[load]);
 const shown=useMemo(()=>papers.filter(p=>fields.some(f=>p[f.key].toLowerCase().includes(search.toLowerCase())))
  .sort((a,b)=>{const x=a[sort],y=b[sort];const c=sort==="year"?x.localeCompare(y,undefined,{numeric:true}):x.localeCompare(y,undefined,{sensitivity:"base"});return asc?c:-c;}),[papers,search,sort,asc]);
 function sortOn(field:Field){if(field===sort)setAsc(v=>!v);else{setSort(field);setAsc(true);}}
 function start(p:Paper,field:Field){setEditing(p.id+":"+field);setDraft(p[field]);setError("");}
 async function save(p:Paper,field:Field){
  if(editing!==p.id+":"+field)return;
  setEditing(null);
  if(draft===p[field])return;
  const before=papers;
  setPapers(current=>current.map(x=>x.id===p.id?{...x,[field]:draft}:x));
  try{
   const response=await fetch("/api/literature/"+encodeURIComponent(p.id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({[field]:draft})});
   if(!response.ok){const data=await response.json();throw Error(data.error??"Save failed");}
  }catch(e){setPapers(before);setError(String(e));}
 }
 async function create(){
  setBusy(true);setError("");
  try{
   const r=await fetch("/api/literature",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newRow)});
   const d=await r.json();if(!r.ok)throw Error(d.error);
   setPapers(prev=>[...prev,d]);setNewRow(empty);setAdding(false);setMessage("Paper added");
  }catch(e){setError(String(e));}finally{setBusy(false);}
 }
 async function remove(p:Paper){
  if(!confirm("Remove this literature entry?"))return;
  const r=await fetch("/api/literature/"+encodeURIComponent(p.id),{method:"DELETE"});
  if(r.ok)setPapers(prev=>prev.filter(x=>x.id!==p.id));else setError("Could not remove paper");
 }
 async function importFile(file:File){
  setBusy(true);setError("");setMessage("");
  try{
   if(file.size>2_000_000)throw Error("CSV must be smaller than 2 MB");
   const csv=await file.text();
   const r=await fetch("/api/literature",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"import",csv})});
   const d=await r.json();if(!r.ok)throw Error(d.error??"Import failed");
   await load();
   setMessage(`Imported ${d.imported} papers; skipped ${d.skipped} duplicates.`);
  }catch(e){setError(String(e));}finally{setBusy(false);if(fileRef.current)fileRef.current.value="";}
 }
 function exportCsv(){
  const lines=[fields.map(f=>quoteCsv(f.name)).join(";"),...shown.map(p=>fields.map(f=>quoteCsv(p[f.key])).join(";"))];
  const blob=new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");anchor.href=url;anchor.download="phd-literature.csv";anchor.click();URL.revokeObjectURL(url);
 }
 return <section className="literature-page">
  <div className="page-header"><div><div className="eyebrow">Research / reference index</div><h1>Literature</h1><p className="muted">A working bibliography. Edit a cell, press Enter or click away to save; press Escape to cancel.</p></div>
   <div className="toolbar"><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void importFile(file);}}/>
    <button className="button secondary" disabled={busy} onClick={()=>fileRef.current?.click()}>{busy?<LoadingStatus label="Working…"/>:<><Upload size={15}/> Import CSV</>}</button>
    <button className="button secondary" onClick={exportCsv}><Download size={15}/> Export CSV</button>
    <button className="button" onClick={()=>setAdding(!adding)}><Plus size={15}/> Add paper</button>
   </div>
  </div>
  {error&&<p className="error" role="alert">{error}</p>}{message&&<p className="muted" role="status">{message}</p>}
  {adding&&<form className="panel form" onSubmit={e=>{e.preventDefault();void create();}}>
   <h2>New reference</h2>
   <div className="literature-new-fields">{fields.map(f=><label key={f.key} className="field">{f.name}{f.key==="notes"?<textarea className="textarea" value={newRow[f.key]} onChange={e=>setNewRow(s=>({...s,[f.key]:e.target.value}))}/>:<input className="input" required={f.key==="paper"} value={newRow[f.key]} onChange={e=>setNewRow(s=>({...s,[f.key]:e.target.value}))}/>}</label>)}</div>
   <div><button className="button" disabled={busy||!newRow.paper.trim()}>Save reference</button></div>
  </form>}
  <div className="literature-tools"><span className="folio-label">{shown.length} / {papers.length} REFERENCES</span><label className="literature-search"><Search size={15}/><input type="search" placeholder="Search all columns…" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
  <div className="literature-scroll" role="region" aria-label="Editable literature spreadsheet" tabIndex={0}>
   <table className="literature-grid"><thead><tr><th className="literature-index">#</th>{fields.map(f=><th key={f.key}><button type="button" onClick={()=>sortOn(f.key)}>{f.name} <ArrowUpDown size={13}/></button></th>)}<th aria-label="Actions"/></tr></thead>
    <tbody>{shown.map((p,i)=><tr key={p.id}><td className="literature-index">{String(i+1).padStart(2,"0")}</td>{fields.map(f=>{
      const active=editing===p.id+":"+f.key;
      return <td key={f.key} className={f.key==="notes"?"literature-notes":""}>{active?
        <textarea autoFocus rows={f.key==="notes"?7:2} value={draft} onChange={e=>setDraft(e.target.value)}
         onBlur={()=>void save(p,f.key)}
         onKeyDown={e=>{if(e.key==="Escape"){setEditing(null);e.stopPropagation();}if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void save(p,f.key);}}}/>:
        <button type="button" className="literature-cell" title="Click to edit" onClick={()=>start(p,f.key)}>{p[f.key]||<span className="literature-blank">—</span>}</button>}</td>;
     })}<td><button className="literature-delete" title="Delete reference" aria-label={"Delete "+p.paper} onClick={()=>void remove(p)}><Trash2 size={15}/></button></td></tr>)}</tbody>
   </table>
   {loading&&<LoadingList label="Loading references…"/>}
   {!loading&&!error&&!shown.length&&<div className="empty">{papers.length?"No matching references.":"No references yet. Import your literature CSV to populate this table."}</div>}
  </div>
  <p className="muted small">Notes are preserved as text, including line breaks. Changes are saved to private PostgreSQL, not to the public GitHub repository.</p>
 </section>;
}
