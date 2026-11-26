"use client";
import {LoadingList,LoadingStatus} from "@/components/loading";
import { useCallback,useEffect,useMemo,useState } from "react";
import { format,getISOWeek,getISOWeekYear,parseISO } from "date-fns";
import type { Activity } from "@/lib/types";
type Period="DAY"|"WEEK"|"MONTH";
export function ActivityFeed({current,period}:{current:Date;period:Period}){
  const month=format(current,"yyyy-MM");
  const [loadedMonth,setLoadedMonth]=useState("");
  const [refreshing,setRefreshing]=useState(false);
  const [items,setItems]=useState<Activity[]>([]);
  const [error,setError]=useState("");
  const load=useCallback(async()=>{
    setRefreshing(true);
    try{const response=await fetch("/api/activity?month="+month,{cache:"no-store"});if(!response.ok)throw Error("Activity unavailable");setItems(await response.json());setError("");setLoadedMonth(month); }
    catch(e){setError(String(e));}finally{setRefreshing(false);}
  },[month]);
  useEffect(()=>{void load();},[load]);
  const shown=useMemo(()=>(loadedMonth===month?items:[]).filter(item=>{
    const date=parseISO(item.date);
    if(period==="DAY")return format(date,"yyyy-MM-dd")===format(current,"yyyy-MM-dd");
    if(period==="WEEK")return getISOWeek(date)===getISOWeek(current)&&getISOWeekYear(date)===getISOWeekYear(current);
    return true;
  }),[items,current,period,loadedMonth,month]);
  return <section className="panel spaced"><div className="page-header"><div><h2 style={{margin:0}}>Automatically collected activity</h2><p className="muted small">GitHub · Vikunja</p></div><button className="button secondary" disabled={refreshing} onClick={()=>void load()}>{refreshing?<LoadingStatus label="Refreshing…"/>:"Refresh"}</button></div>
    {error&&<p className="error">{error}</p>}
    <div className="list">{shown.map(a=><a className="list-item" key={a.id} href={a.url} target={a.url.startsWith("/")?undefined:"_blank"} rel="noopener noreferrer"><div><div className="entry-date">{a.source.toUpperCase()} · {a.kind} · {format(parseISO(a.date),"d MMM yyyy")}</div><strong>{a.title}</strong><div className="muted small">{a.subtitle??""}</div></div><span className="pill">View</span></a>)}{loadedMonth!==month&&!error&&<LoadingList label="Loading activity…"/>}{loadedMonth===month&&!error&&!shown.length&&<div className="empty">No external activity found for this period. Configure integrations to populate this timeline.</div>}</div>
  </section>;
}
