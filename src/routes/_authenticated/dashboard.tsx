import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScanLine, FileText, Mic, FileBarChart, History, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function useFullName() {
  const [name, setName] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      const n = (u?.user_metadata?.full_name as string | undefined)
        || (u?.email ? u.email.split("@")[0] : "");
      setName(n);
    });
  }, []);
  return name;
}

const TILES = [
  { to: "/scanner", title: "Scan Medicine", desc: "Read any English label", urdu: "دوا اسکین کریں", icon: ScanLine, color: "from-primary to-primary/70" },
  { to: "/prescription", title: "Scan Prescription", desc: "Decode doctor's handwriting", urdu: "نسخہ پڑھیں", icon: FileText, color: "from-success to-success/70" },
  { to: "/diary", title: "Log Symptoms", desc: "Voice or text diary", urdu: "علامات لکھیں", icon: Mic, color: "from-warning to-warning/70" },
  { to: "/report", title: "Generate Report", desc: "PDF for your doctor", urdu: "ڈاکٹر رپورٹ بنائیں", icon: FileBarChart, color: "from-destructive to-destructive/70" },
] as const;

function Dashboard() {
  const name = useFullName();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return (
    <div>
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-4xl">
          Welcome back, <span className="text-primary">{name || "there"}</span>! 👋
        </h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">{today}</p>
        <p className="mt-3 text-base font-medium md:text-lg">Take care of your health today 💊</p>
        <p className="urdu mt-1 text-base md:text-lg">آج اپنی صحت کا خیال رکھیں</p>
      </div>

      <h2 className="mt-8 text-xl font-bold md:text-2xl">What would you like to do?</h2>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {TILES.map(({ to, title, desc, urdu, icon: Icon, color }) => (
          <Link key={to} to={to} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${color}`} />
            <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${color} text-primary-foreground`}>
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
            <p className="urdu mt-1 text-sm text-muted-foreground">{urdu}</p>
            <ArrowRight className="absolute right-5 top-5 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link to="/history" className="flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:bg-accent">
          <div className="flex items-center gap-3"><History className="h-5 w-5 text-primary" /><span className="font-medium">View scan history</span></div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          MediSnap is an AI assistant. Always consult a qualified doctor before changing medication.
        </div>
      </div>
    </div>
  );
}
