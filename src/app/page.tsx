import Link from "next/link";
import { db } from "@/lib/db";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const destinations = [
  { id: "01", title: "Knowledge archive", detail: "Obsidian / Quartz", href: "/knowledge/index.html" },
  { id: "02", title: "Source repositories", detail: "GitHub / commits & issues", href: "/repositories" },
  { id: "03", title: "Experiment register", detail: "MLflow / runs & metrics", href: "/experiments" },
  { id: "04", title: "Working queue", detail: "Vikunja / PhD project", href: "/tasks" },
];

export default async function Home() {
  let entries: Awaited<ReturnType<typeof db.journalEntry.findMany>> = [];
  let count = 0;
  let available = true;
  try {
    [entries, count] = await Promise.all([
      db.journalEntry.findMany({ take: 6, orderBy: { date: "desc" } }),
      db.journalEntry.count(),
    ]);
  } catch {
    available = false;
  }
  const today = new Date();
  return <div className="desk-page">
    <section className="desk-intro">
      <div className="desk-intro-side">
        <span className="folio-label">RESEARCH DESK <span className="folio-divider">/</span> 001</span>
        <div className="desk-mark" aria-hidden="true">∴</div>
        <span className="desk-dateline">{format(today, "EEEE, d MMMM yyyy")}</span>
      </div>
      <div className="desk-intro-main">
        <span className="desk-kicker">DOCTORAL RESEARCH / ALBA SYNCHROTRON</span>
        <h1>Notes from the<br/><em>compression lab.</em></h1>
        <p className="desk-lede">An evolving record of experiments, ideas and decisions in lossy compression for synchrotron tomography.</p>
        <div className="desk-intro-actions">
          <Link href="/journal" className="desk-primary-link">Open research journal <ArrowUpRight size={17}/></Link>
          <Link href="/calendar" className="desk-text-link">Research timeline <ArrowRight size={16}/></Link>
        </div>
      </div>
    </section>

    {!available && <div className="notice">The journal database is unavailable. Check DATABASE_URL and Prisma migrations.</div>}

    <section className="desk-columns">
      <div className="desk-journal">
        <div className="desk-section-heading">
          <div><span className="folio-label">01 / CHRONICLE</span><h2>Latest entries</h2></div>
          <Link href="/journal" className="desk-all-link">Full journal <ArrowUpRight size={16}/></Link>
        </div>
        {entries.length
          ? <div className="desk-entry-list">
              {entries.map((e, i) => <Link className="desk-entry-row" href={`/journal/${format(e.date, "yyyy-MM-dd")}`} key={e.id}>
                <span className="desk-entry-index">{String(i+1).padStart(2,"0")}</span>
                <span className="desk-entry-info"><strong>{e.title}</strong><small>{format(e.date, "d MMM yyyy")} <span className="folio-divider">/</span> {e.period.toLowerCase()}</small></span>
                <ArrowUpRight size={18}/>
              </Link>)}
            </div>
          : <div className="desk-empty">No entries yet. Your ongoing research log starts here. <Link href="/journal">Begin writing <ArrowRight size={14}/></Link></div>}
        <div className="desk-journal-foot">
          <span>{count} JOURNAL {count===1 ? "ENTRY" : "ENTRIES"} ARCHIVED</span>
          <span>RECORD / REFLECT / REVISIT</span>
        </div>
      </div>
      <aside className="desk-reference">
        <div className="desk-section-heading"><div><span className="folio-label">02 / INDEX</span><h2>Working references</h2></div></div>
        <p className="desk-reference-intro">A few doors into the work. One place for notes, code, data and what comes next.</p>
        <div className="desk-reference-list">
          {destinations.map(d => <Link className="desk-reference-row" href={d.href} key={d.id}>
            <span className="desk-reference-id">{d.id}</span>
            <span><strong>{d.title}</strong><small>{d.detail}</small></span>
            <ArrowUpRight size={17}/>
          </Link>)}
        </div>
        <div className="desk-reference-note">
          <span className="folio-label">CURRENT SUBJECT</span>
          <p>What information survives compression, and which distortions matter after reconstruction?</p>
          <span className="desk-note-rule" aria-hidden="true"/>
          <small>TOMOGRAPHY <span className="folio-divider">/</span> RATE–DISTORTION <span className="folio-divider">/</span> RECONSTRUCTION</small>
        </div>
      </aside>
    </section>
  </div>;
}
