"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Maximize, Minimize, Menu, X } from "lucide-react";

const sections = [
  { href: "/", label: "Desk", number: "01" },
  { href: "/journal", label: "Journal", number: "02" },
  { href: "/calendar", label: "Calendar", number: "03" },
  { href: "/knowledge/", label: "Library", number: "04" },
  { href: "/repositories", label: "Code", number: "05" },
  { href: "/tasks", label: "Tasks", number: "06" },
  { href: "/experiments", label: "Experiments", number: "07" },
  { href: "/literature", label: "Literature", number: "08" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [wideMode, setWideMode] = useState(false);
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWideMode(false);
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  const expanded = fullscreen || wideMode;
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else if (wideMode) {
      setWideMode(false);
    } else {
      try {
        if (!document.fullscreenEnabled) throw new Error("Fullscreen unavailable");
        await document.documentElement.requestFullscreen();
      } catch {
        setWideMode(true);
      }
    }
  };
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));

  return <div className={`workbench ${expanded ? "is-fullscreen" : ""}`}>
    <header className="workbench-header">
      <div className="workbench-masthead">
        <Link href="/" className="workbench-identity" onClick={() => setMenuOpen(false)}>
          <span className="identity-glyph" aria-hidden="true">∴</span>
          <span><strong>FIELDNOTES</strong><small>Research / Tomography & compression</small></span>
        </Link>
        <div className="masthead-right">
          <span className="masthead-edition">PERSONAL RESEARCH SYSTEM <span className="masthead-separator">/</span> BCN</span>
          <button className="workbench-fullscreen-button" type="button" onClick={() => void toggleFullscreen()} aria-label={expanded ? "Exit fullscreen" : "Enter fullscreen"} title={expanded ? "Exit fullscreen" : "Enter fullscreen"} aria-pressed={expanded}>
            {expanded ? <Minimize size={20}/> : <Maximize size={20}/>}
          </button>
          <button className="workbench-menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen}>
            {menuOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>
      </div>
      <nav className={`workbench-nav ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
        {sections.map(s => <Link key={s.href} href={s.href} onClick={() => setMenuOpen(false)} aria-current={active(s.href) ? "page" : undefined} className={`workbench-nav-link ${active(s.href) ? "is-active" : ""}`}>
          <span className="nav-index">{s.number}</span>{s.label}
        </Link>)}
        <span className="workbench-nav-tail">PRIVATE / LOCAL-FIRST</span>
      </nav>
    </header>
    <main className="workbench-content">{children}</main>
    <footer className="workbench-footer">
      <span>FIELDNOTES <span className="footer-symbol">∴</span> A LIVING RESEARCH RECORD</span>
      <span>CATPPUCCIN MOCHA <span className="masthead-separator">/</span> BARCELONA</span>
    </footer>
  </div>;
}
