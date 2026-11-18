import Link from "next/link";
import { db } from "@/lib/db";
import { ArrowUpRight, BookOpenText, CalendarDays, FlaskConical, GitBranch, ListTodo } from "lucide-react";
import { format } from "date-fns";
export const dynamic="force-dynamic";
export default async function Home(){
  let entries:Awaited<ReturnType<typeof db.journalEntry.findMany>>=[];
  let count=0, available=true;
  try{[entries,count]=await Promise.all([db.journalEntry.findMany({take:5,orderBy:{date:"desc"}}),db.journalEntry.count()]);}catch{available=false;}
  return <div>
    <div className="page-header"><div><div className="eyebrow">Your research at a glance</div><h1>Research overview</h1><p className="muted">Lossy compression for synchrotron tomography · PhD workspace</p></div><Link className="button" href="/journal">Open journal <ArrowUpRight size={16}/></Link></div>
    {!available&&<div className="notice">Database not configured yet. Check DATABASE_URL and run Prisma migrations.</div>}
    <div className="grid three"><div className="panel"><div className="metric-label">Journal entries</div><div className="metric">{count}</div><div className="muted small">Research notes recorded</div></div><div className="panel"><div className="metric-label">Research timeline</div><div className="metric">{format(new Date(),"MMM yyyy")}</div><div className="muted small">Current month</div></div><div className="panel"><div className="metric-label">Research sources</div><div className="metric">4</div><div className="muted small">Notes, code, tasks, experiments</div></div></div>
    <div className="split spaced"><section className="panel"><div className="page-header"><h2>Recent journal</h2><Link className="resource-link" href="/journal">View all →</Link></div>{entries.length?entries.map(e=><Link href={`/journal/${format(e.date,"yyyy-MM-dd")}`} className="list-item" key={e.id}><div><strong>{e.title}</strong><div className="muted small">{format(e.date,"d MMM yyyy")} · {e.period.toLowerCase()}</div></div><ArrowUpRight size={17}/></Link>):<div className="empty">Your entries will appear here when you start writing.</div>}</section><section className="panel"><h2>Explore the workspace</h2><div className="list">{[{href:"/calendar",name:"Research calendar",icon:CalendarDays},{href:"/knowledge/",name:"Obsidian knowledge",icon:BookOpenText},{href:"/repositories",name:"GitHub repositories",icon:GitBranch},{href:"/tasks",name:"Vikunja tasks",icon:ListTodo},{href:"/experiments",name:"MLflow experiments",icon:FlaskConical}].map(item=>{const Icon=item.icon;return <Link className="list-item" key={item.href} href={item.href}><div className="toolbar"><Icon size={17}/>{item.name}</div><ArrowUpRight size={15}/></Link>;})}</div></section></div>
  </div>;
}
