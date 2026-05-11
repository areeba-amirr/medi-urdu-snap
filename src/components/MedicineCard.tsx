import { AlertTriangle } from "lucide-react";

export function WarningBanner({ text, urdu }: { text?: string; urdu?: string }) {
  return (
    <div className="flex gap-3 rounded-xl border-l-4 border-destructive bg-destructive/10 p-4">
      <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
      <div>
        <p className="font-semibold text-destructive">Warning — strong medicine</p>
        {text && <p className="mt-1 text-sm">{text}</p>}
        {urdu && <p className="urdu mt-1 text-sm">{urdu}</p>}
      </div>
    </div>
  );
}

export function BilingualField({ label, en, ur }: { label: string; en?: string | null; ur?: string | null }) {
  if (!en && !ur) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {en && <p className="mt-1 text-sm">{en}</p>}
      {ur && <p className="urdu mt-1 text-sm">{ur}</p>}
    </div>
  );
}

interface Med {
  medicine_name?: string; medicine_name_urdu?: string;
  dosage?: string; dosage_urdu?: string;
  frequency?: string; frequency_urdu?: string;
  warnings?: string; warnings_urdu?: string;
  food_interactions?: string; food_interactions_urdu?: string;
  is_dangerous?: boolean;
}

export function MedicineCard({ med }: { med: Med }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Medicine</p>
        <h2 className="mt-1 text-2xl font-bold">{med.medicine_name || "Unknown"}</h2>
        {med.medicine_name_urdu && <p className="urdu mt-1 text-xl">{med.medicine_name_urdu}</p>}
      </div>
      {med.is_dangerous && <WarningBanner text={med.warnings} urdu={med.warnings_urdu} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <BilingualField label="Dosage" en={med.dosage} ur={med.dosage_urdu} />
        <BilingualField label="Frequency" en={med.frequency} ur={med.frequency_urdu} />
        {!med.is_dangerous && <BilingualField label="Warnings" en={med.warnings} ur={med.warnings_urdu} />}
        <BilingualField label="Food interactions" en={med.food_interactions} ur={med.food_interactions_urdu} />
      </div>
    </div>
  );
}
