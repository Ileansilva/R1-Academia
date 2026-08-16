-- R1 Academia - schema Supabase
-- Execute no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  months int not null check (months > 0),
  price numeric(10,2) not null default 0,
  benefits text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  birth_date date,
  goal text,
  plan_id uuid not null references public.plans(id),
  start_date date not null,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending','active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  amount numeric(10,2) not null,
  payment_method text not null default 'manual',
  status text not null default 'paid',
  paid_at timestamptz not null default now()
);

create table if not exists public.renewals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  old_due_date date not null,
  new_due_date date not null,
  renewed_at date not null default current_date
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  owner_whatsapp text,
  reminder_days int not null default 5 check (reminder_days between 1 and 30),
  created_at timestamptz not null default now()
);

-- Plano iniciais
insert into public.plans (name, months, price, benefits)
select 'Mensal',1,129.90,array['Acesso completo','Avaliação física','Acompanhamento da equipe']
where not exists(select 1 from public.plans where months=1);

insert into public.plans (name, months, price, benefits)
select 'Trimestral',3,329.90,array['Acesso completo','Acompanhamento de evolução','Condição especial']
where not exists(select 1 from public.plans where months=3);

insert into public.plans (name, months, price, benefits)
select 'Semestral',6,599.90,array['6 meses de acesso','Avaliações periódicas','Condição especial']
where not exists(select 1 from public.plans where months=6);

insert into public.plans (name, months, price, benefits)
select 'Anual',12,999.90,array['12 meses de acesso','Acompanhamento periódico','Maior economia']
where not exists(select 1 from public.plans where months=12);

-- RLS
alter table public.plans enable row level security;
alter table public.students enable row level security;
alter table public.payments enable row level security;
alter table public.renewals enable row level security;
alter table public.settings enable row level security;

-- Público pode ler apenas planos ativos.
drop policy if exists "public read active plans" on public.plans;
create policy "public read active plans" on public.plans for select
using (active = true);

-- Público pode enviar uma matrícula, mas não ler alunos.
drop policy if exists "public create student signup" on public.students;
create policy "public create student signup" on public.students for insert
with check (status = 'pending');

-- Usuários autenticados (proprietário) têm acesso completo.
drop policy if exists "authenticated manage plans" on public.plans;
create policy "authenticated manage plans" on public.plans for all to authenticated using (true) with check (true);

drop policy if exists "authenticated manage students" on public.students;
create policy "authenticated manage students" on public.students for all to authenticated using (true) with check (true);

drop policy if exists "authenticated manage payments" on public.payments;
create policy "authenticated manage payments" on public.payments for all to authenticated using (true) with check (true);

drop policy if exists "authenticated manage renewals" on public.renewals;
create policy "authenticated manage renewals" on public.renewals for all to authenticated using (true) with check (true);

drop policy if exists "authenticated manage settings" on public.settings;
create policy "authenticated manage settings" on public.settings for all to authenticated using (true) with check (true);

-- Público pode ler somente o WhatsApp geral da academia.
drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings for select
using (true);
