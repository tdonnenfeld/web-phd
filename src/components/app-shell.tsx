"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ChartNoAxesCombined, FlaskConical, GitBranch, House, ListTodo, Menu, X } from "lucide-react";
import { useState } from "react";
const items = [
  { href: "/", label: "Overview", icon: House },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/knowledge/", label: "Knowledge", icon: BookOpen },
  { href: "/repositories", label: "Repositories", icon: GitBranch },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="shell">
    <aside className={`sidebar ${open ? "opened" : ""}`}>
      <div className="brand"><span className="brand-icon"><ChartNoAxesCombined size={22}/></span><div><strong>Research Hub</strong><small>PhD · Tomography compression</small></div></div>
      <nav aria-label="Main navigation">{items.map(item => { const Icon = item.icon; return <Link onClick={()=>setOpen(false)} key={item.href} className={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)) ? "nav-item selected" : "nav-item"} href={item.href}><Icon size={18}/>{item.label}</Link>; })}</nav>
      <div className="sidebar-footer"><span className="status-dot"/> Private workspace <small>phd.les12.fr</small></div>
    </aside>
    {open && <button aria-label="Close menu" onClick={()=>setOpen(false)} className="overlay"/>}
    <div className="main-area"><header className="topbar"><button className="mobile-menu icon-button" onClick={()=>setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button><span>Research workspace</span><span className="topright">Europe/Madrid</span></header><main className="content">{children}</main></div>
  </div>;
}
