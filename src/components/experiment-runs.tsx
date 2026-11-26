"use client";
import {LoadingList,LoadingStatus,LoadingImage} from "@/components/loading";
import {useCallback,useEffect,useState} from "react";
import ReactMarkdown from "react-markdown";
import {PalmaLaunch} from "@/components/palma-launch";

type Run={id:string;runKey:string;manifest:{environment:string;dataset_id:string;variant_id:string;repository:string;commit:string;status:string;created_at:string};files:{path:string}[]};
function fileUrl(id:string,path:string){return "/api/runs/"+encodeURIComponent(id)+"/file?"+new URLSearchParams({path});}
function RunReport({run}:{run:Run}){
  const [report,setReport]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;
    if(!run.files.some(f=>f.path==="results.md")){setReport("No report for this run.");return;}
    fetch(fileUrl(run.id,"results.md")).then(r=>{if(!r.ok)throw Error();return r.text();}).then(t=>{if(active)setReport(t);}).catch(()=>{if(active)setReport("Report unavailable.");});
    return ()=>{active=false;};
  },[run.id,run.files.some(f=>f.path==="results.md")]);
  return <div className="experiment-report">
    <p className="muted">{run.manifest.repository} · {run.manifest.commit} · {run.manifest.created_at}</p>
    {report===null?<LoadingList label="Loading run report…" rows={2}/>:<div className="markdown"><ReactMarkdown components={{img:({src,alt})=>{
      const path=String(src??"").replace(/^\.\//,"");
      return run.files.some(f=>f.path===path)&&/\.(png|jpe?g|webp)$/i.test(path)?<LoadingImage key={path} src={fileUrl(run.id,path)} alt={alt??""}/>:<span>{alt??"Figure unavailable"}</span>;
    },a:({children})=><span>{children}</span>}}>{report}</ReactMarkdown></div>}
    <details><summary>Run files</summary><div className="list">{run.files.map(f=><a key={f.path} className="resource-link" href={fileUrl(run.id,f.path)} download={f.path.split("/").pop()}>{f.path}</a>)}</div></details>
  </div>;
}
export function ExperimentRuns({experimentId}:{experimentId:string}){
  const [loading,setLoading]=useState(true);
  const [runs,setRuns]=useState<Run[]>([]);
  const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [selected,setSelected]=useState<string|null>(null);
  const url="/api/experiments/"+encodeURIComponent(experimentId)+"/runs";
  const load=useCallback(async()=>{
    try{const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error("Runs unavailable");setRuns((await r.json()).runs);}
    catch(e){setError(String(e));}finally{setLoading(false);}
  },[url]);
  useEffect(()=>{void load();},[load]);
  async function upload(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();if(!file)return;
    const form=e.currentTarget;
    setBusy(true);setError("");
    try{
      if(file.size>32*1024*1024)throw Error("ZIP exceeds 32 MiB");
      const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/zip"},body:file});
      const data=await r.json();if(!r.ok)throw Error(data.error);
      setFile(null);form.reset();setSelected(data.id);await load();
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  return <section className="spaced">
    <h2>Runs</h2><p className="muted small">Experiment ID: {experimentId}</p>
    <PalmaLaunch experimentId={experimentId} onImported={load}/>
    <h3 className="spaced">Manual result import</h3>
    <form className="toolbar spaced" onSubmit={upload}><label className="field">Result bundle (.zip)<input type="file" accept=".zip" required onChange={e=>setFile(e.target.files?.[0]??null)}/></label><button className="button" disabled={!file||busy}>{busy?<LoadingStatus label="Importing…"/>:"Import run"}</button></form>
    {error&&<p className="error" role="alert">{error}</p>}
    {loading&&<LoadingList label="Loading runs…"/>}
    {!loading&&!error&&!runs.length&&<p className="muted spaced">No imported runs.</p>}
    {runs.map(run=><article className="experiment-item spaced" key={run.id}>
      <button className="experiment-item-heading" aria-expanded={selected===run.id} onClick={()=>setSelected(selected===run.id?null:run.id)}><span className="folio-label">{run.manifest.environment}</span><span><strong>{run.runKey}</strong><small>{run.manifest.dataset_id} / {run.manifest.variant_id} · {run.manifest.status}</small></span><span>{selected===run.id?"−":"+"}</span></button>
      {selected===run.id&&<div className="experiment-item-body"><RunReport run={run}/></div>}
    </article>)}
  </section>;
}
