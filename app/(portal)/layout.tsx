import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, ClipboardList, Home, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
  const initial = name.trim().charAt(0).toUpperCase() || "S";

  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <div className="brand-wrap">
          <div className="brand-mark">CC</div>
          <div className="brand">Commerce College<small>Online learning portal</small></div>
        </div>

        <nav className="nav" aria-label="Student navigation">
          <Link href="/dashboard"><Home className="nav-icon" size={18}/>Dashboard</Link>
          <Link href="/assessments"><ClipboardList className="nav-icon" size={18}/>Assessments</Link>
          <Link href="/results"><BarChart3 className="nav-icon" size={18}/>Results</Link>
          <Link href="/profile"><UserRound className="nav-icon" size={18}/>Profile</Link>
        </nav>

        <div className="sidebar-note">
          Complete Section A online, upload Sections B & C as one PDF, then review your combined result and feedback.
        </div>

        <div className="sidebar-footer"><LogoutButton /></div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <strong>Student workspace</strong>
            <span>Assessment progress, submissions and results</span>
          </div>
          <div className="user-chip"><div className="user-avatar">{initial}</div><span>{name}</span></div>
        </header>
        {children}
      </div>
    </div>
  );
}
