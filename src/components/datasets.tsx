"use client";
import {useCallback,useEffect,useState} from "react";

type Variant={id:string;variantId:string;metadata:{shape:number[];dtype:string;environment:string;sha256:string;sampling:{method:string}}};
type Dataset={id:string;title:string;description:string;variants:Variant[]};

export function Datasets(){
  const [items,setItems]=useState<Dataset[]>([]);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [mode,setMode]=useState<"dataset"|"edit"|"variant"|null>(null);
  const [id,setId]=useState("");
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [metadata,setMetadata]=useState("");
  const [filter,setFilter]=useState("");
  const load=useCallback(async()=>{
    try{
      const r=await fetch("/api/datasets",{cache:"no-store"});
      const data=await r.json();
      if(!r.ok)throw Error(data.error);
      setItems(data.datasets);
    }catch(e){setError(String(e));}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  function open(kind:"dataset"|"edit"|"variant",dataset?:Dataset){
    setMode(kind);setId(dataset?.id??"");setTitle(dataset?.title??"");setDescription(dataset?.description??"");setError("");
    setMetadata(JSON.stringify({schema_version:1,dataset_id:dataset?.id??"",variant_id:"",shape:[],dtype:"uint16",sampling:{method:"full"},environment:"cluster",sha256:""},null,2));
  }
  async function save(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{
      const body=mode==="variant"?{kind:"variant",metadata:JSON.parse(metadata)}:{kind:"dataset",id,title,description};
      if(mode==="variant"&&body.metadata.dataset_id!==id)throw Error("Dataset ID must match the selected dataset");
      const r=await fetch("/api/datasets",{method:mode==="edit"?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await r.json();if(!r.ok)throw Error(data.error);
      setMode(null);await load();
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  const visible=items.filter(d=>(d.id+" "+d.title+" "+d.description).toLowerCase().includes(filter.toLowerCase()));
  return <div className="experiments-page">
    <div className="page-header"><div><div className="eyebrow">Acquisition / sampling / provenance</div><h1>Datasets</h1><p className="muted">A registry of original scans and derived dataset variants. No remote filesystem access.</p></div><button className="button" onClick={()=>open("dataset")}>New dataset</button></div>
    {error&&<p className="error" role="alert">{error}</p>}
    {mode&&<form className="panel form" onSubmit={save}>
      <h2>{mode==="variant"?"Register variant":mode==="edit"?"Edit dataset":"Register dataset"}</h2>
      {mode==="variant"?<><p className="muted">Paste the version 1 dataset manifest. Cluster variants are metadata only; Palma registration does not verify local availability.</p><label className="field">Manifest JSON<textarea className="textarea" required value={metadata} onChange={e=>setMetadata(e.target.value)}/></label></>:<>
      <label className="field">Dataset ID<input className="input" required maxLength={128} pattern="[A-Za-z0-9][A-Za-z0-9_-]*" disabled={mode==="edit"} value={id} onChange={e=>setId(e.target.value)}/></label>
      <label className="field">Title<input className="input" required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
      <label className="field">Description<textarea className="textarea" maxLength={12000} value={description} onChange={e=>setDescription(e.target.value)}/></label></>}
      <div className="toolbar"><button className="button" disabled={busy}>{busy?"Saving…":"Save"}</button><button type="button" className="button secondary" disabled={busy} onClick={()=>setMode(null)}>Cancel</button></div>
    </form>}
    <div className="toolbar spaced"><input className="input" aria-label="Search datasets" placeholder="Search datasets" value={filter} onChange={e=>setFilter(e.target.value)}/><span className="muted small">{items.length} datasets</span></div>
    <div className="experiment-register spaced">
      {loading?<p className="muted">Loading datasets…</p>:!visible.length?<div className="empty">No matching datasets.</div>:visible.map(d=><article key={d.id} className="experiment-item">
        <div className="experiment-item-body">
          <div className="folio-label">{d.id}</div><h2>{d.title}</h2><p>{d.description}</p>
          <div className="toolbar"><button className="button secondary" onClick={()=>open("edit",d)}>Edit</button><button className="button secondary" onClick={()=>open("variant",d)}>Add variant</button></div>
          {!d.variants.length&&<p className="muted spaced">No variants registered.</p>}
          {d.variants.map(v=><details className="spaced" key={v.id}><summary>{v.variantId} · {v.metadata.environment==="palma"?"Palma / local target":"Cluster / external"} · {v.metadata.shape.join(" × ")} · {v.metadata.dtype}</summary><div className="markdown"><pre>{JSON.stringify(v.metadata,null,2)}</pre></div></details>)}
        </div>
      </article>)}
    </div>
  </div>;
}
