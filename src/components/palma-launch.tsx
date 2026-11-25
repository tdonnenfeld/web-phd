"use client";
import {useCallback,useEffect,useRef,useState} from "react";
type Launch={id:string;ratio:number;pipelineCommit:string;status:string;githubRunId:string|null;message:string;createdAt:string};
const active=["dispatching","queued","running","unknown","import_pending"];
export function PalmaLaunch({experimentId,onImported}:{experimentId:string;onImported:()=>Promise<void>}){
  const [items,setItems]=useState<Launch[]>([]);
  const [configured,setConfigured]=useState(false);
  const [ratio,setRatio]=useState(8);
  const [commit,setCommit]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const inFlight=useRef(false);
  const url="/api/experiments/"+encodeURIComponent(experimentId)+"/palma";
  const refresh=useCallback(async()=>{
    if(inFlight.current)return;
    inFlight.current=true;
    try{
      const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"sync"})});
      if(!response.ok)throw Error("Could not refresh Palma runs");
      const r=await fetch(url,{cache:"no-store"});
      if(!r.ok)throw Error("Palma requests unavailable");
      const data=await r.json();setItems(data.launches);setConfigured(data.configured);
      await onImported();
    }catch(e){setError(String(e));}
    finally{inFlight.current=false;}
  },[url,onImported]);
  useEffect(()=>{
    void refresh();
    const timer=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},15000);
    return ()=>clearInterval(timer);
  },[refresh]);
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{
      const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"launch",ratio,commit:commit.trim()})});
      const data=await r.json();if(!r.ok)throw Error(data.error);
      await refresh();
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  async function release(id:string){
    if(!confirm("Confirm in GitHub Actions that this request is no longer executing. Release the web request?"))return;
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"release",id})});
    if(!r.ok){setError("Could not release request");return;}await refresh();
  }
  return <section className="panel spaced">
    <h3>Run on Palma</h3>
    <p className="muted small">tomo-mct-pipeline · sample_0001 / quick_4rows · one ratio · full reconstruction size</p>
    {!configured&&<p className="muted">Palma execution is not configured yet.</p>}
    <form className="form" onSubmit={submit}>
      <label className="field">Compression ratio<select value={ratio} onChange={e=>setRatio(Number(e.target.value))}>{[2,4,8,16,32,64].map(r=><option key={r} value={r}>{r}×</option>)}</select></label>
      <label className="field">Pipeline commit (optional)<input className="input" placeholder="Latest main" value={commit} onChange={e=>setCommit(e.target.value)} pattern="[a-f0-9]{40}" maxLength={40}/></label>
      <button className="button" disabled={!configured||busy||items.some(x=>active.includes(x.status))}>{busy?"Launching…":"Run experiment"}</button>
    </form>
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="toolbar spaced"><button className="button secondary" onClick={()=>void refresh()}>Refresh runs</button><span className="muted small">Auto-refresh every 15 seconds while open</span></div>
    {items.map(item=><div className="spaced" key={item.id}>
      <strong>{item.ratio}× · {item.status.replaceAll("_"," ")}</strong> <span className="muted small">{new Date(item.createdAt).toLocaleString()}</span>
      <p className="muted small">{item.pipelineCommit||"Latest main"} {item.message&&"· "+item.message}</p>
      {item.githubRunId&&<a className="resource-link" href={"https://github.com/tdonnenfeld/phd-experiments/actions/runs/"+item.githubRunId} target="_blank" rel="noopener noreferrer">GitHub execution log</a>}
      {["unknown","import_pending"].includes(item.status)&&<button className="button secondary" onClick={()=>void release(item.id)}>Release request</button>}
    </div>)}
  </section>;
}
