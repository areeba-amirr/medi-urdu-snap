import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Pill, ScanLine, FileText, Mic, History, FileBarChart, LogOut, Loader2, Menu, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Pill },
  { to: "/scanner", label: "Scan Medicine", icon: ScanLine },
  { to: "/prescription", label: "Prescription", icon: FileText },
  { to: "/diary", label: "Symptom Diary", icon: Mic },
  { to: "/history", label: "History", icon: History },
  { to: "/report", label: "Doctor Report", icon: FileBarChart },
] as const;

function AuthLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (!session) navigate({ to: "/login" });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (!data.session) navigate({ to: "/login" });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  useEffect(() => { setMenuOpen(false); }, [path]);

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Pill className="h-4 w-4" /></div>
          <span className="font-bold">MediSnap</span>
        </Link>
        <button onClick={() => setMenuOpen((o) => !o)} className="rounded-md p-2 hover:bg-accent">
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className={`${menuOpen ? "block" : "hidden"} md:block fixed md:sticky md:top-0 inset-x-0 top-[57px] md:inset-auto md:h-screen z-20 w-full md:w-64 shrink-0 border-r border-border bg-card`}>
          <div className="flex h-full flex-col p-4">
            <Link to="/dashboard" className="mb-6 hidden items-center gap-2 md:flex">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Pill className="h-5 w-5" /></div>
              <span className="text-lg font-bold">MediSnap</span>
            </Link>
            <nav className="flex flex-col gap-1">
              {NAV.map(({ to, label, icon: Icon }) => {
                const active = path === to;
                return (
                  <Link key={to} to={to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto rounded-lg border border-border bg-secondary/50 p-3">
              <p className="truncate text-xs text-muted-foreground">Signed in as</p>
              <p className="truncate text-sm font-medium">{user.email}</p>
              <button onClick={logout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
