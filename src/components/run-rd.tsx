"use client";
import {useEffect,useState} from "react";
import {RDCurves} from "@/components/rd-curves";
import {LoadingStatus} from "@/components/loading";
import {parseMeasurements,type Measurement} from "@/lib/compare-metrics";

export function RunRD({id,path,label}:{id:string;path:string;label:string}){
  const [rows,setRows]=useState<Measurement[]|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/runs/"+encodeURIComponent(id)+"/file?"+new URLSearchParams({path}),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error("Metrics unavailable");return r.text();}).then(csv=>{if(!controller.signal.aborted)setRows(parseMeasurements(csv));}).catch(e=>{if(!controller.signal.aborted)setError(String(e));});
    return ()=>controller.abort();
  },[id,path]);
  if(error)return <p className="error" role="alert">{error}</p>;
  if(!rows)return <LoadingStatus label="Loading rate–distortion metrics…"/>;
  return <RDCurves series={[{label,rows}]}/>;
}
