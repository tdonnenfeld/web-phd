"use client";
import {LoadingList,LoadingStatus} from "@/components/loading";
import {useCallback,useEffect,useRef,useState} from "react";
type Launch={id:string;ratio:number;ratios:number[];variantId:string;backend:string;pipelineCommit:string;status:string;githubRunId:string|null;message:string;createdAt:string};
const active=["dispatching","queued","running","unknown","import_pending"];
export function PalmaLaunch({experimentId,onImported}:{experimentId:string;onImported:()=>Promise<void>}){
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [items,setItems]=useState<Launch[]>([]);
  const [configured,setConfigured]=useState(false);
  const [ratios,setRatios]=useState<number[]>([8]);
  const [variant,setVariant]=useState("quick_4rows");
  const [variants,setVariants]=useState<{id:string;rows:number;available:boolean}[]>([]);
  const larger=variant!=="quick_4rows";
  const [commit,setCommit]=useState("");
  const [backend,setBackend]=useState("legacy");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const inFlight=useRef(false);
  const url="/api/experiments/"+encodeURIComponent(experimentId)+"/palma";
  const refresh=useCallback(async()=>{
    if(inFlight.current)return;
    inFlight.current=true;setRefreshing(true);
    try{
      const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"sync"})});
      if(!response.ok)throw Error("Could not refresh Palma runs");
      const r=await fetch(url,{cache:"no-store"});
      if(!r.ok)throw Error("Palma requests unavailable");
      const data=await r.json();setItems(data.launches);setConfigured(data.configured);setVariants(data.variants??[]);
      setError("");await onImported();
    }catch(e){setError(String(e));}
    finally{inFlight.current=false;setLoading(false);setRefreshing(false);}
  },[url,onImported]);
  useEffect(()=>{
    void refresh();
    const timer=setInterval(()=>{if(document.visibilityState==="visible")void refresh();},15000);
    return ()=>clearInterval(timer);
  },[refresh]);
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{
      const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"launch",ratios,variant,backend,commit:commit.trim()})});
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
    <p className="muted small">sample_0001 · full reconstruction size</p>
    {!loading&&!error&&!configured&&<p className="muted">Palma execution is not configured yet.</p>}
    {loading?<LoadingList label="Loading Palma configuration…" rows={2}/>:<form className="form" onSubmit={submit}>
      <label className="field">Scientific backend<select value={backend} onChange={e=>{setBackend(e.target.value);setCommit("");}}><option value="legacy">tomo-mct-pipeline (legacy)</option><option value="unified">tomo-compression (unified)</option></select></label>
      <label className="field">Dataset variant<select value={variant} onChange={e=>{setVariant(e.target.value);if(e.target.value!=="quick_4rows")setRatios(old=>[old[0]??8]);}}>{variants.map(v=><option key={v.id} value={v.id} disabled={!v.available}>{v.id} · {v.rows} rows{v.available?"":" (not available)"}</option>)}</select></label>
      {larger&&<p className="muted small">Experimental larger slab: one ratio per run until memory usage is validated.</p>}
      <fieldset className="field"><legend>Compression ratios</legend><div className="toolbar">{[2,4,8,16,32,64].map(r=><label key={r}><input type="checkbox" checked={ratios.includes(r)} onChange={e=>setRatios(old=>e.target.checked?(larger?[r]:[...old,r].sort((a,b)=>a-b)):old.filter(x=>x!==r))}/> {r}×</label>)}</div><div className="toolbar"><button type="button" className="button secondary" disabled={larger} onClick={()=>setRatios([2,4,8,16,32,64])}>Select all</button><button type="button" className="button secondary" onClick={()=>setRatios([])}>Clear</button></div></fieldset>
      <label className="field">Pipeline commit (optional)<input className="input" placeholder="Latest main" value={commit} onChange={e=>setCommit(e.target.value)} pattern="[a-f0-9]{40}" maxLength={40}/></label>
      <button className="button" disabled={!configured||busy||!variants.some(v=>v.id===variant&&v.available)||!ratios.length||items.some(x=>active.includes(x.status))}>{busy?<LoadingStatus label="Launching…"/>:"Run experiment"}</button>
    </form>}
    {error&&<p className="error" role="alert">{error}</p>}
    <div className="toolbar spaced"><button className="button secondary" disabled={refreshing} onClick={()=>void refresh()}>{refreshing?<LoadingStatus label="Refreshing…"/>:"Refresh runs"}</button><span className="muted small">Auto-refresh every 15 seconds while open</span></div>
    {items.map(item=><div className="spaced" key={item.id}>
      <strong>{(item.ratios?.length?item.ratios:[item.ratio]).map(r=>r+"×").join(", ")} · {item.status.replaceAll("_"," ")}</strong> <span className="muted small">{new Date(item.createdAt).toLocaleString()}</span>
      <p className="muted small">{item.backend==="unified"?"tomo-compression":"tomo-mct-pipeline"} · {item.variantId||"quick_4rows"} · {item.pipelineCommit||"Latest main"} {item.message&&"· "+item.message}</p>
      {item.githubRunId&&<a className="resource-link" href={"https://github.com/tdonnenfeld/phd-experiments/actions/runs/"+item.githubRunId} target="_blank" rel="noopener noreferrer">GitHub execution log</a>}
      {["unknown","import_pending"].includes(item.status)&&<button className="button secondary" onClick={()=>void release(item.id)}>Release request</button>}
    </div>)}
  </section>;
}
