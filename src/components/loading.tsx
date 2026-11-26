"use client";
import {useState} from "react";
import {LoaderCircle} from "lucide-react";

export function LoadingStatus({label="Loading…"}:{label?:string}){
  return <span className="loading-status" role="status"><LoaderCircle size={15} aria-hidden="true"/>{label}</span>;
}

export function LoadingList({label="Loading…",rows=3}:{label?:string;rows?:number}){
  return <div className="loading-list" role="status" aria-label={label}>
    <span className="muted small">{label}</span>
    {Array.from({length:rows},(_,i)=><div className="loading-row" key={i} aria-hidden="true"><span/><div><span/><span/></div></div>)}
  </div>;
}

export function LoadingImage({src,alt}:{src:string;alt:string}){
  const [state,setState]=useState<"loading"|"ready"|"error">("loading");
  return <span className="loading-figure">
    {state==="loading"&&<span className="loading-figure-placeholder"><LoadingStatus label="Loading figure…"/></span>}
    {state==="error"?<span className="muted small" role="status">Figure unavailable: {alt}</span>:<img src={src} alt={alt} loading="lazy" onLoad={()=>setState("ready")} onError={()=>setState("error")} className={state==="loading"?"loading-figure-image":undefined}/>}
  </span>;
}
