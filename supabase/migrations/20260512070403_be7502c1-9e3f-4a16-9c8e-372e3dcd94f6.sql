ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS scan_group_id uuid;
CREATE INDEX IF NOT EXISTS scans_scan_group_id_idx ON public.scans(scan_group_id);