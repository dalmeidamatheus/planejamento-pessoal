create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "own select" on public.user_data;
drop policy if exists "own insert" on public.user_data;
drop policy if exists "own update" on public.user_data;
drop policy if exists "own delete" on public.user_data;

create policy "own select" on public.user_data for select using (auth.uid() = user_id);
create policy "own insert" on public.user_data for insert with check (auth.uid() = user_id);
create policy "own update" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own delete" on public.user_data for delete using (auth.uid() = user_id);

create table if not exists public.price_watch (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  url text,
  last_price numeric,
  last_checked timestamptz,
  last_error text,
  history jsonb not null default '[]'::jsonb,
  primary key (user_id, item_id)
);

alter table public.price_watch enable row level security;
drop policy if exists "own select" on public.price_watch;
drop policy if exists "own delete" on public.price_watch;
create policy "own select" on public.price_watch for select using (auth.uid() = user_id);
create policy "own delete" on public.price_watch for delete using (auth.uid() = user_id);

-- Anexos de notas e tarefas (imagens, vídeos, PDFs…): bucket privado, cada usuário só acessa a própria pasta <user_id>/
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false) on conflict (id) do nothing;

drop policy if exists "attachments select" on storage.objects;
drop policy if exists "attachments insert" on storage.objects;
drop policy if exists "attachments update" on storage.objects;
drop policy if exists "attachments delete" on storage.objects;
create policy "attachments select" on storage.objects for select using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachments insert" on storage.objects for insert with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachments update" on storage.objects for update using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "attachments delete" on storage.objects for delete using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
