import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Download, Loader2, FileBarChart } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export const Route = createFileRoute("/_authenticated/report")({
  component: ReportPage,
});

function painColor(p?: number | null) {
  if (p == null) return "bg-muted";
  if (p <= 3) return "bg-success/70";
  if (p <= 6) return "bg-warning/70";
  return "bg-destructive/70";
}

function ReportPage() {
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUser(u.user);
      const [s, sc] = await Promise.all([
        supabase.from("symptoms").select("*").order("created_at", { ascending: true }),
        supabase.from("scans").select("*").order("created_at", { ascending: false }),
      ]);
      setSymptoms(s.data || []);
      setScans(sc.data || []);
      setLoading(false);
    })();
  }, []);

  const last30 = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    return days.map((d) => {
      const entries = symptoms.filter((s) => isSameDay(new Date(s.created_at), d));
      const avgPain = entries.length ? entries.reduce((a, b) => a + (b.pain_level || 0), 0) / entries.length : null;
      const avgSleep = entries.length ? entries.reduce((a, b) => a + Number(b.sleep_hours || 0), 0) / entries.length : null;
      return { date: d, pain: avgPain, sleep: avgSleep };
    });
  }, [symptoms]);

  const stats = useMemo(() => {
    if (!symptoms.length) return null;
    const pains = symptoms.map((s) => s.pain_level).filter((p): p is number => p != null);
    const sleeps = symptoms.map((s) => Number(s.sleep_hours)).filter((s) => !isNaN(s));
    const avgPain = pains.reduce((a, b) => a + b, 0) / (pains.length || 1);
    const avgSleep = sleeps.reduce((a, b) => a + b, 0) / (sleeps.length || 1);
    const sorted = [...symptoms].sort((a, b) => (a.pain_level || 0) - (b.pain_level || 0));
    return {
      avgPain: avgPain.toFixed(1),
      avgSleep: avgSleep.toFixed(1),
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      count: symptoms.length,
    };
  }, [symptoms]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end }).map((d) => {
      const entries = symptoms.filter((s) => isSameDay(new Date(s.created_at), d));
      const avgPain = entries.length ? entries.reduce((a, b) => a + (b.pain_level || 0), 0) / entries.length : null;
      return { date: d, pain: avgPain, count: entries.length };
    });
  }, [symptoms, month]);

  async function downloadPDF() {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const W = doc.internal.pageSize.getWidth();
      let y = 18;

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, W, 28, "F");
      doc.setTextColor(255); doc.setFontSize(20); doc.setFont("helvetica", "bold");
      doc.text("MediSnap — Health Report", 14, 18);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text("Snap. Understand. Stay Safe.", 14, 24);

      doc.setTextColor(0); y = 38;
      doc.setFontSize(11);
      doc.text(`Patient: ${user?.email || ""}`, 14, y); y += 6;
      doc.text(`Report date: ${format(new Date(), "PPP")}`, 14, y); y += 6;
      doc.text(`Entries: ${symptoms.length} symptoms · ${scans.length} medicines`, 14, y); y += 10;

      // Stats
      doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      doc.text("Summary", 14, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(11);
      if (stats) {
        doc.text(`Average pain level: ${stats.avgPain}/10`, 14, y); y += 5;
        doc.text(`Average sleep: ${stats.avgSleep} hours`, 14, y); y += 5;
        if (stats.best) {
          doc.text(`Best day: ${format(new Date(stats.best.created_at), "PP")} (pain ${stats.best.pain_level}/10)`, 14, y); y += 5;
        }
        if (stats.worst) {
          doc.text(`Worst day: ${format(new Date(stats.worst.created_at), "PP")} (pain ${stats.worst.pain_level}/10)`, 14, y); y += 5;
        }
      } else {
        doc.text("No symptom entries logged yet.", 14, y); y += 5;
      }
      y += 6;

      // Pain trend (text-based for portability)
      doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      doc.text("Pain trend (last 30 days)", 14, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const chartW = W - 28; const chartH = 36; const baseX = 14; const baseY = y + chartH;
      doc.setDrawColor(200); doc.line(baseX, baseY, baseX + chartW, baseY);
      const points = last30.filter((d) => d.pain != null);
      if (points.length) {
        const stepX = chartW / Math.max(last30.length - 1, 1);
        last30.forEach((d, i) => {
          if (d.pain == null) return;
          const x = baseX + i * stepX;
          const h = (d.pain / 10) * chartH;
          doc.setFillColor(d.pain <= 3 ? 22 : d.pain <= 6 ? 202 : 220, d.pain <= 3 ? 163 : d.pain <= 6 ? 138 : 38, d.pain <= 3 ? 74 : d.pain <= 6 ? 4 : 38);
          doc.rect(x - 1, baseY - h, 2, h, "F");
        });
      } else {
        doc.text("No data", baseX, baseY - 8);
      }
      y = baseY + 10;

      // Medicines
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      doc.text("Medicines & prescriptions", 14, y); y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      const recent = scans.slice(0, 15);
      if (!recent.length) { doc.text("No scans saved.", 14, y); y += 6; }
      recent.forEach((s) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text(`• ${s.medicine_name || "Unnamed"}${s.is_dangerous ? "  [CAUTION]" : ""}`, 14, y); y += 5;
        doc.setFont("helvetica", "normal");
        const sub = [s.dosage, s.frequency].filter(Boolean).join(" · ");
        if (sub) { doc.text(sub, 18, y); y += 5; }
        doc.setTextColor(120);
        doc.text(format(new Date(s.created_at), "PP"), 18, y); y += 6;
        doc.setTextColor(0);
      });

      // Disclaimer
      if (y > 260) { doc.addPage(); y = 20; }
      y += 4;
      doc.setDrawColor(200); doc.line(14, y, W - 14, y); y += 5;
      doc.setFontSize(9); doc.setTextColor(120);
      doc.text("Always consult your doctor. This report is AI-generated and for informational purposes only.", 14, y);

      doc.save(`medisnap-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Report downloaded");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate PDF");
    } finally { setGenerating(false); }
  }

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Health Report</h1>
          <p className="mt-1 text-muted-foreground">Calendar, charts, and a doctor-ready PDF.</p>
        </div>
        <button disabled={generating} onClick={downloadPDF}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Avg pain", value: stats ? `${stats.avgPain}/10` : "—" },
          { label: "Avg sleep", value: stats ? `${stats.avgSleep}h` : "—" },
          { label: "Entries", value: symptoms.length },
          { label: "Medicines", value: scans.length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Health calendar</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth(subMonths(month, 1))} className="rounded-md p-2 hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-medium w-32 text-center">{format(month, "MMMM yyyy")}</span>
            <button onClick={() => setMonth(addMonths(month, 1))} className="rounded-md p-2 hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="font-medium text-muted-foreground">{d}</div>)}
          {Array.from({ length: startOfMonth(month).getDay() }).map((_, i) => <div key={`pad-${i}`} />)}
          {calendarDays.map((d) => (
            <div key={d.date.toISOString()} title={d.pain != null ? `Pain ${d.pain.toFixed(1)}/10` : "No entry"}
              className={`aspect-square rounded-md p-1 text-xs font-medium ${painColor(d.pain)} ${d.pain != null ? "text-foreground" : "text-muted-foreground"}`}>
              {format(d.date, "d")}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-success/70" /> Good (1-3)</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-warning/70" /> Okay (4-6)</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-destructive/70" /> Bad (7-10)</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-muted" /> No entry</span>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Pain — last 30 days</h2>
          <div className="mt-4">
            <Line
              data={{
                labels: last30.map((d) => format(d.date, "M/d")),
                datasets: [{
                  label: "Pain", data: last30.map((d) => d.pain),
                  borderColor: "rgb(220,38,38)", backgroundColor: "rgba(220,38,38,0.15)",
                  fill: true, tension: 0.3, spanGaps: true,
                }],
              }}
              options={{ responsive: true, scales: { y: { min: 0, max: 10 } }, plugins: { legend: { display: false } } }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Sleep — last 30 days</h2>
          <div className="mt-4">
            <Bar
              data={{
                labels: last30.map((d) => format(d.date, "M/d")),
                datasets: [{ label: "Hours", data: last30.map((d) => d.sleep), backgroundColor: "rgba(37,99,235,0.7)" }],
              }}
              options={{ responsive: true, scales: { y: { min: 0, max: 12 } }, plugins: { legend: { display: false } } }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
        <FileBarChart className="h-5 w-5 shrink-0 text-primary" />
        Always consult your doctor. This report is AI-generated and for informational purposes only.
      </div>
    </div>
  );
}
