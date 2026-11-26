"use client";
import {LoadingStatus} from "@/components/loading";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, endOfMonth, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, eachDayOfInterval } from "date-fns";
import { ChevronLeft,ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Entry, Activity } from "@/lib/types";
type Event = {id:string;date:string;title:string;type:string;url:string};
export function CalendarView(){
  const [month,setMonth]=useState(new Date());const [events,setEvents]=useState<Event[]>([]);const [enabled,setEnabled]=useState(["journal","github","vikunja"]);const [errors,setErrors]=useState<string[]>([]);
  const [loadedMonth,setLoadedMonth]=useState("");
  const monthKey=format(month,"yyyy-MM");
  const load=useCallback(async()=>{
    const results=await Promise.allSettled([fetch(`/api/journal?month=${monthKey}`).then(r=>r.ok?r.json():Promise.reject()),fetch(`/api/activity?month=${monthKey}`).then(r=>r.ok?r.json():Promise.reject())]);
    const combined:Event[]=[];const errs:string[]=[];
    if(results[0].status==="fulfilled")for(const e of results[0].value as Entry[])combined.push({id:"j-"+e.id,date:e.date.slice(0,10),title:e.title,type:"journal",url:"/journal/"+e.date.slice(0,10)});else errs.push("Journal could not be loaded");
    if(results[1].status==="fulfilled")for(const a of results[1].value as Activity[])combined.push({id:a.id,date:a.date.slice(0,10),title:a.title,type:a.source,url:a.url});else errs.push("External activity could not be loaded");
    setEvents(combined);setErrors(errs);setLoadedMonth(monthKey);
  },[monthKey]);
  useEffect(()=>{void load();},[load]);
  const days=useMemo(()=>eachDayOfInterval({start:startOfWeek(startOfMonth(month),{weekStartsOn:1}),end:endOfWeek(endOfMonth(month),{weekStartsOn:1})}),[month]);
  const filtered=(loadedMonth===monthKey?events:[]).filter(e=>enabled.includes(e.type));
  const toggle=(type:string)=>setEnabled(s=>s.includes(type)?s.filter(x=>x!==type):[...s,type]);
  return <div>
    <div className="page-header"><div><div className="eyebrow">Timeline & planning</div><h1>Research calendar</h1><p className="muted">Journal, GitHub activity and Vikunja tasks.</p></div></div>
    <div className="panel"><div className="page-header"><h2 style={{margin:0}}>{format(month,"MMMM yyyy")}</h2><div className="toolbar"><button className="button secondary" aria-label="Previous month" onClick={()=>setMonth(m=>addMonths(m,-1))}><ChevronLeft size={17}/></button><button className="button secondary" onClick={()=>setMonth(new Date())}>Today</button><button className="button secondary" aria-label="Next month" onClick={()=>setMonth(m=>addMonths(m,1))}><ChevronRight size={17}/></button></div></div>
    <div className="toolbar" style={{marginBottom:19}}>{[{key:"journal",label:"Journal"},{key:"github",label:"GitHub"},{key:"vikunja",label:"Tasks"}].map(f=><label className="pill" key={f.key}><input type="checkbox" checked={enabled.includes(f.key)} onChange={()=>toggle(f.key)}/> {f.label}</label>)}</div>
    {loadedMonth!==monthKey&&<LoadingStatus label="Loading calendar events…"/>}
    {errors.map(e=><p className="error" key={e}>{e}</p>)}
    <div className="calendar-grid">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div className="calendar-weekday" key={d}>{d}</div>)}
    {days.map(day=>{const key=format(day,"yyyy-MM-dd");const dayEvents=filtered.filter(e=>e.date===key);return <div key={key} className={`calendar-day ${!isSameMonth(day,month)?"outside":""} ${isToday(day)?"today":""}`}><Link href={"/journal/"+key} className="calendar-date">{format(day,"d")}</Link>{dayEvents.slice(0,3).map(e=><Link key={e.id} className={`calendar-event ${e.type==="vikunja"?"task":""}`} title={e.title} href={e.url}>{e.title}</Link>)}{dayEvents.length>3&&<div className="muted small">+{dayEvents.length-3} more</div>}</div>;})}</div>
    </div>
  </div>;
}
