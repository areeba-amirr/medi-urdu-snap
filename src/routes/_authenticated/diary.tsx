import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { extractSymptoms } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, Loader2, Save, Smile, Meh, Frown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/diary")({
  component: DiaryPage,
});

type Mood = "happy" | "okay" | "sad" | "";

function DiaryPage() {
  const fn = useServerFn(extractSymptoms);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [pain, setPain] = useState(5);
  const [sleep, setSleep] = useState(7);
  const [mood, setMood] = useState<Mood>("");
  const [notes, setNotes] = useState("");
  const [notesUrdu, setNotesUrdu] = useState("");
  const [saving, setSaving] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    return () => { try { recRef.current?.stop(); } catch {} };
  }, []);

  function startRec(lang: "en-US" | "ur-PK") {
    const SR: any = (typeof window !== "undefined") && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) return toast.error("Voice input not supported in this browser. Try Chrome.");
    const r = new SR();
    r.lang = lang; r.interimResults = true; r.continuous = true;
    let finalText = "";
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      setTranscript(finalText + interim);
    };
    r.onend = () => setRecording(false);
    r.onerror = (e: any) => { toast.error(`Voice error: ${e.error}`); setRecording(false); };
    r.start();
    recRef.current = r;
    setRecording(true);
  }

  function stopRec() {
    try { recRef.current?.stop(); } catch {}
    setRecording(false);
  }

  async function extract() {
    if (!transcript.trim()) return toast.error("Please record or type something first.");
    setExtracting(true);
    try {
      const data = await fn({ data: { transcript } });
      if (data.pain_level != null) setPain(data.pain_level);
      if (data.sleep_hours != null) setSleep(data.sleep_hours);
      if (data.mood) setMood(data.mood);
      if (data.notes) setNotes(data.notes);
      if (data.notes_urdu) setNotesUrdu(data.notes_urdu);
      toast.success("Form filled — review and save.");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setExtracting(false); }
  }

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("symptoms").insert({
      user_id: u.user.id,
      pain_level: pain,
      sleep_hours: sleep,
      mood: mood || null,
      notes: notes || null,
      notes_urdu: notesUrdu || null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Symptoms logged");
      setTranscript(""); setNotes(""); setNotesUrdu(""); setMood(""); setPain(5); setSleep(7);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold md:text-3xl">Symptom Diary</h1>
      <p className="mt-1 text-muted-foreground">Speak in English or Urdu — we'll fill the form for you.</p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          {!recording ? (
            <>
              <button onClick={() => startRec("en-US")} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90">
                <Mic className="h-4 w-4" /> Speak (English)
              </button>
              <button onClick={() => startRec("ur-PK")} className="flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 font-medium text-success-foreground hover:opacity-90">
                <Mic className="h-4 w-4" /> اردو میں بولیں
              </button>
            </>
          ) : (
            <button onClick={stopRec} className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 font-medium text-destructive-foreground">
              <MicOff className="h-4 w-4" /> Stop recording
            </button>
          )}
          <button disabled={!transcript.trim() || extracting} onClick={extract}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 font-medium hover:bg-accent disabled:opacity-60">
            {extracting && <Loader2 className="h-4 w-4 animate-spin" />}
            Auto-fill form from voice
          </button>
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="What you said will appear here. You can also type directly."
          rows={4}
          className="mt-4 w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div>
          <label className="flex items-center justify-between text-sm font-medium">
            Pain level <span className="text-primary font-bold">{pain}/10</span>
          </label>
          <input type="range" min={0} max={10} value={pain} onChange={(e) => setPain(+e.target.value)} className="mt-2 w-full accent-primary" />
        </div>
        <div>
          <label className="flex items-center justify-between text-sm font-medium">
            Sleep hours <span className="text-primary font-bold">{sleep}h</span>
          </label>
          <input type="range" min={0} max={12} step={0.5} value={sleep} onChange={(e) => setSleep(+e.target.value)} className="mt-2 w-full accent-primary" />
        </div>
        <div>
          <label className="text-sm font-medium">Mood</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {([
              ["happy", "Happy", Smile, "text-success"],
              ["okay", "Okay", Meh, "text-warning"],
              ["sad", "Sad", Frown, "text-destructive"],
            ] as const).map(([val, label, Icon, color]) => (
              <button key={val} onClick={() => setMood(val)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors ${
                  mood === val ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                }`}>
                <Icon className={`h-6 w-6 ${color}`} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Notes (English)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-sm font-medium">نوٹس (اردو)</label>
          <textarea value={notesUrdu} onChange={(e) => setNotesUrdu(e.target.value)} rows={2}
            className="urdu mt-2 w-full rounded-lg border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button disabled={saving} onClick={save}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save entry
        </button>
      </div>
    </div>
  );
}
