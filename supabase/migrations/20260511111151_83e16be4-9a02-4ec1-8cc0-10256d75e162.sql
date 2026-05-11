
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_type text not null default 'medicine' check (scan_type in ('medicine','prescription')),
  medicine_name text,
  medicine_name_urdu text,
  dosage text,
  dosage_urdu text,
  frequency text,
  frequency_urdu text,
  warnings text,
  warnings_urdu text,
  food_interactions text,
  food_interactions_urdu text,
  is_dangerous boolean default false,
  prescription_data jsonb,
  doctor_notes text,
  doctor_notes_urdu text,
  created_at timestamptz not null default now()
);

alter table public.scans enable row level security;

create policy "scans_select_own" on public.scans for select using (auth.uid() = user_id);
create policy "scans_insert_own" on public.scans for insert with check (auth.uid() = user_id);
create policy "scans_update_own" on public.scans for update using (auth.uid() = user_id);
create policy "scans_delete_own" on public.scans for delete using (auth.uid() = user_id);

create index scans_user_created_idx on public.scans(user_id, created_at desc);

create table public.symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pain_level int check (pain_level between 0 and 10),
  sleep_hours numeric(3,1),
  mood text check (mood in ('happy','okay','sad')),
  notes text,
  notes_urdu text,
  created_at timestamptz not null default now()
);

alter table public.symptoms enable row level security;

create policy "symptoms_select_own" on public.symptoms for select using (auth.uid() = user_id);
create policy "symptoms_insert_own" on public.symptoms for insert with check (auth.uid() = user_id);
create policy "symptoms_update_own" on public.symptoms for update using (auth.uid() = user_id);
create policy "symptoms_delete_own" on public.symptoms for delete using (auth.uid() = user_id);

create index symptoms_user_created_idx on public.symptoms(user_id, created_at desc);
