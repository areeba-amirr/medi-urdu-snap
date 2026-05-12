import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkInteraction } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Search, Trash2, Loader2, Pill, ShieldCheck, AlertTriangle, FileText, X, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

type Scan = any;

type Group =
  | { kind: "prescription"; key: string; created_at: string; items: Scan[] }
  | { kind: "label"; key: string; created_at: string; item: Scan };

function isEmpty(v?: string | null) {
  if (!v) return true;
  const t = String(v).trim();
  return t === "" || t.toLowerCase() === "n/a" || t === "دستیاب نہیں";
}

function HistoryPage() {
  const interactionFn = useServerFn(checkInteraction);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [m1, setM1] = useState(""); const [m2, setM2] = useState("");
  const [checking, setChecking] = useState(false);
  const [interaction, setInteraction] = useState<any>(null);
  const [viewing, setViewing] = useState<Group | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("scans").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setScans(data || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function delScan(id: string) {
    if (!confirm("Are you sure? This cannot be undone")) return;
    const { error } = await supabase.from("scans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setScans((s) => s.filter((x) => x.id !== id));
    toast.success("Deleted");
  }

  async function delGroup(groupId: string) {
    if (!confirm("Are you sure? This cannot be undone")) return;
    const { error } = await supabase.from("scans").delete().eq("scan_group_id", groupId);
    if (error) return toast.error(error.message);
    setScans((s) => s.filter((x) => x.scan_group_id !== groupId));
    toast.success("Deleted");
  }

  async function runInteraction() {
    if (!m1 || !m2) return toast.error("Pick two medicines");
    setChecking(true); setInteraction(null);
    try {
      const r = await interactionFn({ data: { medicine1: m1, medicine2: m2 } });
      setInteraction(r);
    } catch (e: any) { toast.error(e.message); }
    finally { setChecking(false); }
  }

  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    const grouped = new Map<string, Scan[]>();
    for (const s of scans) {
      if (s.scan_type === "prescription" && s.scan_group_id) {
        const arr = grouped.get(s.scan_group_id) || [];
        arr.push(s);
        grouped.set(s.scan_group_id, arr);
      } else {
        out.push({ kind: "label", key: s.id, created_at: s.created_at, item: s });
      }
    }
    for (const [key, items] of grouped) {
      const sorted = [...items].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
      out.push({ kind: "prescription", key, created_at: sorted[0].created_at, items: sorted });
    }
    return out.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [scans]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      if (g.kind === "label") return (g.item.medicine_name || "").toLowerCase().includes(q);
      return g.items.some((m) => (m.medicine_name || "").toLowerCase().includes(q));
    });
  }, [groups, search]);

  const medOptions = Array.from(new Set(scans.map((s) => s.medicine_name).filter(Boolean)));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold md:text-3xl">Scan History</h1>
      <p className="mt-1 text-muted-foreground">All your saved medicines and prescriptions.</p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Drug interaction checker</h2>
        <p className="text-sm text-muted-foreground">Check whether two medicines are safe to take together.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select value={m1} onChange={(e) => setM1(e.target.value)} className="rounded-lg border border-input bg-background p-2.5 text-sm">
            <option value="">Medicine 1…</option>
            {medOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={m2} onChange={(e) => setM2(e.target.value)} className="rounded-lg border border-input bg-background p-2.5 text-sm">
            <option value="">Medicine 2…</option>
            {medOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button disabled={checking} onClick={runInteraction}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
          </button>
        </div>
        {interaction && (
          <div className={`mt-4 rounded-xl border-l-4 p-4 ${
            interaction.is_safe ? "border-success bg-success/10" : "border-destructive bg-destructive/10"
          }`}>
            <div className="flex items-center gap-2 font-semibold">
              {interaction.is_safe ? <ShieldCheck className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
              {interaction.is_safe ? "Safe combination" : `Caution — ${interaction.severity}`}
            </div>
            <p className="mt-2 text-sm">{interaction.explanation}</p>
            {interaction.explanation_urdu && <p className="urdu mt-1 text-sm">{interaction.explanation_urdu}</p>}
          </div>
        )}
      </div>

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicine name…"
          className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {loading ? (
        <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="text-5xl">📋</div>
          <p className="mt-3 text-lg font-semibold">No scans yet</p>
          <p className="urdu mt-1 text-base text-muted-foreground">ابھی تک کوئی اسکین نہیں</p>
          <Link to="/scanner" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90">
            <Pill className="h-4 w-4" /> Scan Your First Medicine
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filtered.map((g) =>
            g.kind === "prescription" ? (
              <PrescriptionCard key={g.key} group={g} onView={() => setViewing(g)} onDelete={() => delGroup(g.key)} />
            ) : (
              <LabelCard key={g.key} item={g.item} onView={() => setViewing(g)} onDelete={() => delScan(g.item.id)} />
            )
          )}
        </div>
      )}

      {viewing && <ViewModal group={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function PrescriptionCard({ group, onView, onDelete }: { group: Extract<Group, { kind: "prescription" }>; onView: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary"><ClipboardList className="h-4 w-4" /> Prescription Scan</p>
          <p className="mt-1 text-xs text-muted-foreground">📅 {format(new Date(group.created_at), "PPP — p")}</p>
          <p className="mt-1 text-sm font-medium">💊 {group.items.length} medicine{group.items.length === 1 ? "" : "s"} found</p>
        </div>
      </div>
      <ol className="mt-4 space-y-2">
        {group.items.map((m, i) => (
          <li key={m.id} className="rounded-lg border border-border bg-secondary/40 p-3">
            <p className="font-semibold">
              <span className="text-primary">{i + 1}.</span> {m.medicine_name || "Unnamed"}
              {!isEmpty(m.medicine_name_urdu) && <span className="urdu"> — {m.medicine_name_urdu}</span>}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {!isEmpty(m.dosage) && <span>{m.dosage}</span>}
              {!isEmpty(m.dosage) && !isEmpty(m.frequency) && " — "}
              {!isEmpty(m.frequency) && <span>{m.frequency}</span>}
              {!isEmpty(m.frequency_urdu) && <span className="urdu"> ({m.frequency_urdu})</span>}
            </p>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button onClick={onView} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent">View Full</button>
        <button onClick={onDelete} className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </div>
  );
}

function LabelCard({ item, onView, onDelete }: { item: Scan; onView: () => void; onDelete: () => void }) {
  return (
    <div className={`rounded-2xl border bg-card p-5 shadow-sm ${item.is_dangerous ? "border-destructive" : "border-border"}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Pill className="h-4 w-4" /> Medicine Label Scan</p>
      <p className="mt-1 text-xs text-muted-foreground">📅 {format(new Date(item.created_at), "PPP — p")}</p>
      <div className="mt-3">
        <p className="text-lg font-bold">
          {item.medicine_name || "Unnamed"}
          {!isEmpty(item.medicine_name_urdu) && <span className="urdu"> — {item.medicine_name_urdu}</span>}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {!isEmpty(item.dosage) && <span>{item.dosage}</span>}
          {!isEmpty(item.dosage) && !isEmpty(item.frequency) && " — "}
          {!isEmpty(item.frequency) && <span>{item.frequency}</span>}
          {!isEmpty(item.frequency_urdu) && <span className="urdu"> ({item.frequency_urdu})</span>}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button onClick={onView} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent">View Full</button>
        <button onClick={onDelete} className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </div>
  );
}

function ViewModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const items = group.kind === "prescription" ? group.items : [group.item];
  const isPrescription = group.kind === "prescription";
  const interactions = isPrescription
    ? (items.find((i: any) => i.prescription_data?.interactions)?.prescription_data?.interactions as string | undefined)
    : undefined;
  const doctorNotes = items.find((i: any) => !isEmpty(i.doctor_notes))?.doctor_notes;
  const doctorNotesUrdu = items.find((i: any) => !isEmpty(i.doctor_notes_urdu))?.doctor_notes_urdu;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              {isPrescription ? <FileText className="h-5 w-5 text-primary" /> : <Pill className="h-5 w-5 text-primary" />}
              {isPrescription ? "Prescription Details" : "Medicine Details"}
            </h2>
            <p className="text-xs text-muted-foreground">{format(new Date(group.created_at), "PPP — p")}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          {!isEmpty(interactions) && (
            <div className="rounded-xl border-2 border-warning bg-warning/10 p-4">
              <p className="flex items-center gap-2 font-bold text-warning"><AlertTriangle className="h-4 w-4" /> Drug Interactions</p>
              <p className="mt-2 text-sm">{interactions}</p>
            </div>
          )}
          {items.map((m: any, i: number) => (
            <div key={m.id} className={`rounded-xl border p-4 ${m.is_dangerous ? "border-destructive" : "border-border"}`}>
              <p className="text-lg font-bold">
                {isPrescription && <span className="text-primary">{i + 1}. </span>}
                {m.medicine_name}
                {!isEmpty(m.medicine_name_urdu) && <span className="urdu"> — {m.medicine_name_urdu}</span>}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Field label="💊 Dosage" en={m.dosage} ur={m.dosage_urdu} />
                <Field label="⏰ Frequency" en={m.frequency} ur={m.frequency_urdu} />
                <Field label="🍽️ Instructions" en={m.food_interactions} ur={m.food_interactions_urdu} />
                <Field label="⚠️ Warnings" en={m.warnings} ur={m.warnings_urdu} danger />
              </div>
            </div>
          ))}
          {!isEmpty(doctorNotes) && (
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <p className="font-semibold">Doctor's Notes</p>
              <p className="mt-2 text-sm">{doctorNotes}</p>
              {!isEmpty(doctorNotesUrdu) && <p className="urdu mt-1 text-sm">{doctorNotesUrdu}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, en, ur, danger }: { label: string; en?: string; ur?: string; danger?: boolean }) {
  if (isEmpty(en) && isEmpty(ur)) return null;
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wide ${danger ? "text-destructive" : "text-muted-foreground"}`}>{label}</p>
      {!isEmpty(en) && <p className={`mt-1 text-sm ${danger ? "text-destructive" : ""}`}>{en}</p>}
      {!isEmpty(ur) && <p className={`urdu text-sm ${danger ? "text-destructive" : ""}`}>{ur}</p>}
    </div>
  );
}
