"use client";
import {useCallback,useEffect,useState} from "react";
import ReactMarkdown from "react-markdown";
import {ArrowUpRight,Trash2} from "lucide-react";

type Experiment={id:string;title:string;description:string;sourceType:string;repository:string|null;sourcePath:string;sourceRef:string|null;createdAt:string};
type Repo={repo:string;ref:string|null;files:string[]};
type Note={id:string;title:string;date:string};
type Sources={repos:Repo[];notes:Note[]};

function sourceLink(e:Experiment):string|undefined{
  if(e.sourceType==="github"&&e.repository&&e.sourceRef)return `https://github.com/${e.repository}/blob/${e.sourceRef}/${e.sourcePath.split("/").map(encodeURIComponent).join("/")}`;
  return undefined;
}
function assetPath(e:Experiment,raw:string){
  if(!e.repository||!e.sourceRef||!raw||/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(raw))return null;
  const base=e.sourcePath.split("/").slice(0,-1);
  const clean=decodeURIComponent(raw.split(/[?#]/)[0]||"");
  for(const part of clean.split("/")){
    if(part==="..")base.pop();
    else if(part!==".")base.push(part);
  }
  const file=base.join("/");
  if(!file||base.some(x=>!x||x===".."||x.startsWith(".")))return null;
  return file;
}
function sourceAsset(e:Experiment,src:string):string|null{
  try{
    const file=assetPath(e,src);
    if(!file||!/^.*\.(png|jpe?g|webp)$/i.test(file))return null;
    return "/api/experiment-sources/asset?"+new URLSearchParams({repo:e.repository!,ref:e.sourceRef!,path:file}).toString();
  }catch{return null;}
}
function Report({experiment}:{experiment:Experiment}){
  const [content,setContent]=useState<string|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    let live=true;
    const q=experiment.sourceType==="github"
      ?new URLSearchParams({type:"github",repo:experiment.repository||"",path:experiment.sourcePath,ref:experiment.sourceRef||""})
      :new URLSearchParams({type:"obsidian",id:experiment.sourcePath});
    fetch("/api/experiment-sources/content?"+q,{cache:"no-store"}).then(async r=>{
      const j=await r.json();if(!r.ok)throw Error(j.error??"Source unavailable");if(live){setContent(j.content);setError("");}
    }).catch(e=>{if(live)setError(String(e));});
    return ()=>{live=false;};
  },[experiment]);
  return <div className="experiment-report">
    {error&&<p className="error">{error}</p>}
    {content===null&&!error&&<p className="muted">Loading source report…</p>}
    {content!==null&&<div className="markdown">
      <ReactMarkdown components={{
        img:({src,alt})=>{
          const url=experiment.sourceType==="github"?sourceAsset(experiment,String(src??"")):null;
          return url?<img src={url} alt={alt??"Experiment figure"} loading="lazy"/>:<span className="muted">Figure: {String(alt||src||"unavailable")}</span>;
        },
        a:({href,children})=>{
          let url=href||"";
          if(experiment.sourceType==="github"&&url&&!/^https?:\/\//i.test(url)){
            const file=assetPath(experiment,url);
            url=file?`https://github.com/${experiment.repository}/blob/${experiment.sourceRef}/${file.split("/").map(encodeURIComponent).join("/")}`:"";
          }
          if(!/^https:\/\//i.test(url))return <span>{children}</span>;
          return <a href={url} target="_blank" rel="noopener noreferrer">{children}</a>;
        },
      }}>{content}</ReactMarkdown>
    </div>}
  </div>;
}

export function Experiments(){
  const [items,setItems]=useState<Experiment[]>([]);
  const [sources,setSources]=useState<Sources>({repos:[],notes:[]});
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [creating,setCreating]=useState(false);
  const [sourceType,setSourceType]=useState<"github"|"obsidian">("github");
  const [repo,setRepo]=useState("tdonnenfeld/tomo-mct-pipeline");
  const [sourcePath,setSourcePath]=useState("");
  const [note,setNote]=useState("");
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [selected,setSelected]=useState<string|null>(null);
  const load=useCallback(async()=>{
    try{
      const r=await fetch("/api/experiments",{cache:"no-store"});
      const data=await r.json();if(!r.ok)throw Error(data.error);
      setItems(data.experiments??[]);setError("");
    }catch(e){setError(String(e));}
  },[]);
  useEffect(()=>{void load();fetch("/api/experiment-sources",{cache:"no-store"}).then(r=>r.json()).then(setSources).catch(()=>{});},[load]);
  const currentRepo=sources.repos.find(r=>r.repo===repo);
  const validSource=sourceType==="obsidian"?Boolean(note):Boolean(currentRepo?.ref&&sourcePath);
  async function create(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{
      const r=await fetch("/api/experiments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,description,sourceType,repository:sourceType==="github"?repo:undefined,sourcePath:sourceType==="github"?sourcePath:note})});
      const data=await r.json();if(!r.ok)throw Error(data.error||"Could not create experiment");
      setTitle("");setDescription("");setCreating(false);setSelected(data.id);await load();
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  async function remove(id:string){
    if(!confirm("Remove this experiment from the catalogue? The source files will not be modified."))return;
    const r=await fetch("/api/experiments/"+encodeURIComponent(id),{method:"DELETE"});
    if(!r.ok){setError("Could not remove experiment");return;}setSelected(null);await load();
  }
  return <div className="experiments-page">
    <div className="page-header"><div><div className="eyebrow">Evidence / interpretation / provenance</div><h1>Experiment register</h1><p className="muted">Documented results from your repositories and Obsidian notes. No MLflow required.</p></div><button className="button" onClick={()=>setCreating(x=>!x)}>{creating?"Close":"New experiment"}</button></div>
    {error&&<p className="error" role="alert">{error}</p>}
    {creating&&<form className="panel form" onSubmit={create}>
      <h2>Record an experiment</h2>
      <div className="segmented"><button type="button" className={sourceType==="github"?"active":""} onClick={()=>setSourceType("github")}>From repository</button><button type="button" className={sourceType==="obsidian"?"active":""} onClick={()=>setSourceType("obsidian")}>From Obsidian</button></div>
      {sourceType==="github"?<div className="grid two">
        <label className="field">Repository<select value={repo} onChange={e=>{setRepo(e.target.value);setSourcePath("");}}>{["tdonnenfeld/tomo-mct-pipeline","tdonnenfeld/volcomp"].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label className="field">Markdown report<select value={sourcePath} required onChange={e=>setSourcePath(e.target.value)}><option value="">Select committed file</option>{currentRepo?.files.map(file=><option key={file} value={file}>{file}</option>)}</select></label>
        <p className="muted small">Generated reports and PNGs must be committed to the repository to display here. Until then, you can start from its README.</p>
      </div>:<label className="field">Obsidian daily note<select value={note} required onChange={e=>setNote(e.target.value)}><option value="">Select note</option>{sources.notes.map(n=><option key={n.id} value={n.id}>{n.date} · {n.title}</option>)}</select></label>}
      <label className="field">Experiment title<input className="input" value={title} onChange={e=>setTitle(e.target.value)} required maxLength={200}/></label>
      <label className="field">Interpretation / research question<textarea className="textarea" value={description} onChange={e=>setDescription(e.target.value)} maxLength={12000} placeholder="Hypothesis, parameters, conclusions, next checks…" /></label>
      <div><button className="button" disabled={busy||!validSource||!title.trim()}>{busy?"Saving…":"Create experiment"}</button></div>
    </form>}
    <div className="experiment-register">
      {!items.length&&<div className="empty">No experiments recorded yet. Create one from a GitHub report or an Obsidian daily note.</div>}
      {items.map((e,i)=><article className="experiment-item" key={e.id}>
        <button className="experiment-item-heading" onClick={()=>setSelected(selected===e.id?null:e.id)} aria-expanded={selected===e.id}>
          <span className="folio-label">{String(i+1).padStart(2,"0")} / {e.sourceType==="github"?"CODE":"OBSIDIAN"}</span>
          <span><strong>{e.title}</strong><small>{e.sourceType==="github"?e.repository+" / "+e.sourcePath:e.sourcePath.replace(/^obsidian:/,"")}</small></span>
          <span>{selected===e.id?"−":"+"}</span>
        </button>
        {selected===e.id&&<div className="experiment-item-body">
          {e.description&&<p className="experiment-summary">{e.description}</p>}
          <div className="toolbar"><span className="muted small">Registered {new Date(e.createdAt).toLocaleDateString()}</span>{sourceLink(e)&&<a className="resource-link" href={sourceLink(e)} target="_blank" rel="noopener noreferrer">Open source <ArrowUpRight size={14}/></a>}<button className="button danger" onClick={()=>void remove(e.id)}><Trash2 size={14}/> Remove record</button></div>
          <Report experiment={e}/>
        </div>}
      </article>)}
    </div>
  </div>;
}
