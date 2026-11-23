"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const sections = [
  { href: "/", label: "Desk", number: "01" },
  { href: "/journal", label: "Journal", number: "02" },
  { href: "/calendar", label: "Calendar", number: "03" },
  { href: "/knowledge/", label: "Library", number: "04" },
  { href: "/repositories", label: "Code", number: "05" },
  { href: "/tasks", label: "Tasks", number: "06" },
  { href: "/experiments", label: "Experiments", number: "07" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));

  return <div className="workbench">
    <header className="workbench-header">
      <div className="workbench-masthead">
        <Link href="/" className="workbench-identity" onClick={() => setMenuOpen(false)}>
          <span className="identity-glyph" aria-hidden="true">∴</span>
          <span><strong>FIELDNOTES</strong><small>Research / Tomography & compression</small></span>
        </Link>
        <div className="masthead-right">
          <span className="masthead-edition">PERSONAL RESEARCH SYSTEM <span className="masthead-separator">/</span> BCN</span>
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
