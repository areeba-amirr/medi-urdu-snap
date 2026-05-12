import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { extractSymptoms } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Mic, Loader2, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/diary")({
  component: DiaryPage,
});

type Mood = "happy" | "okay" | "sad" | "";

function painColor(p: number) {
  if (p <= 3) return "accent-success";
  if (p <= 6) return "accent-warning";
  return "accent-destructive";
}
function painEmoji(p: number) {
  if (p <= 3) return "😊";
  if (p <= 6) return "😐";
  return "😢";
}
function painText(p: number) {
  if (p <= 3) return "text-success";
  if (p <= 6) return "text-warning";
  return "text-destructive";
}

function DiaryPage() {
  const fn = useServerFn(extractSymptoms);
  const recRef = useRef<any>(null);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [extracting, setExtracting] = useState(false);

  const [pain, setPain] = useState(5);
  const [sleep, setSleep] = useState(7);
  const [mood, setMood] = useState<Mood>("");
  const [notes, setNotes] = useState("");
  const [notesUrdu, setNotesUrdu] = useState("");

  const [saving, setSaving] = useState(false);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const start = new Date(); start.setHours(0,0,0,0);
      const { data } = await supabase
        .from("symptoms")
        .select("*")
        .eq("user_id", u.user.id)
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data[0]) setTodayEntry(data[0]);
    })();
    return () => { try { recRef.current?.stop(); } catch {} };
  }, []);

  function startListening() {
    const SR: any = (typeof window !== "undefined") &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) return toast.error("Voice input not supported. Try Chrome.");
    const r = new SR();
    r.lang = "ur-PK";
    r.continuous = false;
    r.interimResults = false;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = (e: any) => { setListening(false); toast.error(`Voice error: ${e.error}`); };
    r.onresult = async (e: any) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      await runExtract(text);
    };
    r.start();
    recRef.current = r;
  }

  async function runExtract(text: string) {
    if (!text.trim()) return;
    setExtracting(true);
    try {
      const data = await fn({ data: { transcript: text } });
      setPain(data.pain_level);
      setSleep(data.sleep_hours);
      setMood(data.mood as Mood);
      setNotes(data.notes);
      setNotesUrdu(data.notes_urdu);
      toast.success("Form filled — review and save.");
    } catch (e: any) {
      toast.error(e.message || "Could not extract symptoms");
    } finally { setExtracting(false); }
  }

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const payload = {
      user_id: u.user.id,
      pain_level: pain,
      sleep_hours: sleep,
      mood: mood || "okay",
      notes: notes || null,
      notes_urdu: notesUrdu || null,
    };
    let error;
    if (todayEntry && editing) {
      ({ error } = await supabase.from("symptoms").update(payload).eq("id", todayEntry.id));
    } else {
      ({ error } = await supabase.from("symptoms").insert(payload));
    }
    setSaving(false);
    if (error) return toast.error("❌ Please try again");
    toast.success("✅ Symptoms saved!");
    const { data } = await supabase
      .from("symptoms").select("*").eq("id", todayEntry?.id || "").maybeSingle();
    setTodayEntry(data || { ...payload, id: todayEntry?.id, created_at: new Date().toISOString() });
    setEditing(false);
  }

  if (todayEntry && !editing) {
    return (
      <div className="mx-auto max-w-[600px]">
        <div className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="mt-3 text-2xl font-bold">✅ Already logged today!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last entry: pain {todayEntry.pain_level}/10, {todayEntry.sleep_hours}hrs sleep, mood {todayEntry.mood}
          </p>
          {todayEntry.notes && <p className="mt-3 text-sm">{todayEntry.notes}</p>}
          {todayEntry.notes_urdu && <p className="urdu mt-1 text-sm">{todayEntry.notes_urdu}</p>}
          <button
            onClick={() => {
              setEditing(true);
              setPain(todayEntry.pain_level || 5);
              setSleep(todayEntry.sleep_hours || 7);
              setMood((todayEntry.mood as Mood) || "");
              setNotes(todayEntry.notes || "");
              setNotesUrdu(todayEntry.notes_urdu || "");
            }}
            className="mt-5 w-full rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90"
          >
            Update Today's Entry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[600px] space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold md:text-3xl">Log Today's Symptoms</h1>
        <p className="urdu mt-1 text-lg">آج کی صحت درج کریں</p>
        <p className="mt-2 text-sm text-muted-foreground">Speak in English or Urdu</p>

        <div className="mt-6 flex flex-col items-center">
          <button
            onClick={listening ? () => recRef.current?.stop() : startListening}
            disabled={extracting}
            className={`grid h-32 w-32 place-items-center rounded-full text-4xl text-white shadow-lg transition-all disabled:opacity-60 ${
              listening ? "bg-destructive animate-pulse" : "bg-primary hover:scale-105"
            }`}
            aria-label={listening ? "Listening" : "Tap to speak"}
          >
            {listening ? "🔴" : "🎤"}
          </button>
          <p className="mt-3 text-sm font-medium">
            {listening ? "Listening..." : extracting ? "Understanding..." : "Tap to speak"}
          </p>
        </div>

        {transcript && (
          <div className="mt-5 rounded-lg bg-secondary p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">You said</p>
            <p className="mt-1 text-sm italic">"{transcript}"</p>
          </div>
        )}
        {extracting && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Extracting symptoms…
          </div>
        )}
      </div>

      <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <label className="flex items-center justify-between text-sm font-semibold">
            <span>Pain Level: <span className={painText(pain)}>{pain}/10</span></span>
            <span className="text-2xl">{painEmoji(pain)}</span>
          </label>
          <input type="range" min={1} max={10} value={pain}
            onChange={(e) => setPain(+e.target.value)}
            className={`mt-2 w-full ${painColor(pain)}`} />
        </div>

        <div>
          <label className="text-sm font-semibold">Sleep Hours Last Night</label>
          <input type="number" min={0} max={24} step={0.5} value={sleep}
            onChange={(e) => setSleep(+e.target.value || 0)}
            className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div>
          <label className="text-sm font-semibold">How are you feeling?</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {([
              ["happy", "😊", "Happy", "border-success bg-success/10 text-success"],
              ["okay", "😐", "Okay", "border-warning bg-warning/10 text-warning"],
              ["sad", "😢", "Sad", "border-destructive bg-destructive/10 text-destructive"],
            ] as const).map(([val, emoji, label, active]) => (
              <button key={val} type="button" onClick={() => setMood(val)}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-4 transition-colors ${
                  mood === val ? active : "border-border hover:bg-accent"
                }`}>
                <span className="text-3xl">{emoji}</span>
                <span className="text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold">Notes (English)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Describe your symptoms..."
            className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div>
          <label className="urdu text-sm font-semibold">نوٹس (اردو)</label>
          <textarea value={notesUrdu} onChange={(e) => setNotesUrdu(e.target.value)} rows={3}
            placeholder="اردو میں لکھیں..." dir="rtl"
            className="urdu mt-2 w-full rounded-lg border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <button disabled={saving} onClick={save}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {editing ? "Update Today's Entry" : "Save Today's Entry"}
        </button>
      </div>
    </div>
  );
}
