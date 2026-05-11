import { createFileRoute, Link } from "@tanstack/react-router";
import { Pill, ScanLine, Mic, FileText, ShieldCheck, Languages } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "MediSnap — Snap. Understand. Stay Safe." },
      { name: "description", content: "Scan any English medicine or prescription and instantly understand it in Urdu. Track symptoms, generate doctor reports." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Pill className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">MediSnap</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-foreground/80 hover:text-foreground">Login</Link>
          <Link to="/signup" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Get started</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-12 pb-24">
        <section className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <ShieldCheck className="h-3.5 w-3.5" /> AI medical assistant for Pakistan
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Snap. Understand. <span className="text-primary">Stay Safe.</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              MediSnap reads English medicine labels and doctor prescriptions and explains them in clear Urdu —
              dosage, timing, warnings and food interactions.
            </p>
            <p className="urdu mt-2 text-lg text-muted-foreground">
              انگریزی دوا کے لیبل اور ڈاکٹر کے نسخے کو اردو میں سمجھیں۔
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground shadow-sm hover:opacity-90">
                Create free account
              </Link>
              <Link to="/login" className="rounded-lg border border-border bg-card px-6 py-3 font-medium hover:bg-accent">
                I have an account
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: ScanLine, title: "Medicine Scanner", desc: "Scan any pill bottle." },
              { icon: FileText, title: "Prescription Reader", desc: "Decodes handwriting." },
              { icon: Mic, title: "Voice Diary", desc: "Speak your symptoms." },
              { icon: Languages, title: "Bilingual", desc: "English + اردو." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        MediSnap is an AI assistant — always consult a qualified doctor for medical advice.
      </footer>
    </div>
  );
}
