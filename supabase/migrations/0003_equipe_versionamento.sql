-- 0003_equipe_versionamento.sql — Dimensiona Facilities
-- Premissa: Supabase Auth (auth.uid()). Posse por EQUIPE (workspace).
-- Versionamento imutável de dimensionamentos via snapshot JSONB (payload completo do config).
-- Substitui as tabelas normalizadas pavimentos/ambientes/cargos_dimensionamento (vazias)
-- por dimensionamento_versoes.payload. RLS ancorada em membership de workspace.

-- ============================ EQUIPE ============================
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_por uuid not null default auth.uid(),
  created_at timestamptz default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid,                 -- preenchido quando o convite é aceito
  email text,                   -- alvo do convite (antes do aceite)
  papel text not null default 'membro' check (papel in ('owner','admin','membro')),
  status text not null default 'convidado' check (status in ('ativo','convidado')),
  created_at timestamptz default now(),
  unique (workspace_id, user_id),
  unique (workspace_id, email)
);
create index if not exists idx_wm_user on workspace_members(user_id) where status = 'ativo';

-- helpers SECURITY DEFINER (evitam recursão de RLS em workspace_members)
create or replace function fn_is_member(ws uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from workspace_members m
                 where m.workspace_id = ws and m.user_id = uid and m.status = 'ativo');
$$;

create or replace function fn_is_owner(ws uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from workspace_members m
                 where m.workspace_id = ws and m.user_id = uid and m.status = 'ativo'
                       and m.papel in ('owner','admin'));
$$;

-- cria workspace + vincula o criador como owner ativo (atômico)
create or replace function fn_criar_workspace(p_nome text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  insert into workspaces (nome, criado_por) values (p_nome, auth.uid()) returning id into ws;
  insert into workspace_members (workspace_id, user_id, email, papel, status)
    values (ws, auth.uid(), (select email from auth.users where id = auth.uid()), 'owner', 'ativo');
  return ws;
end; $$;

-- após login, reivindica convites pendentes pelo email do usuário
create or replace function fn_reivindicar_convites()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update workspace_members
    set user_id = auth.uid(), status = 'ativo'
    where status = 'convidado'
      and lower(email) = lower((select email from auth.users where id = auth.uid()));
  get diagnostics n = row_count;
  return n;
end; $$;

-- ====================== DIMENSIONAMENTO (header) ======================
-- a tabela existente (0001) vira só o cabeçalho do projeto
alter table dimensionamentos add column if not exists nome text;
alter table dimensionamentos add column if not exists updated_at timestamptz default now();
alter table dimensionamentos add column if not exists versao_atual_id uuid;

-- colunas de config migram para a versão (estavam vazias)
alter table dimensionamentos drop column if exists modo;
alter table dimensionamentos drop column if exists jornada_id;
alter table dimensionamentos drop column if exists ocupantes;
alter table dimensionamentos drop column if exists time_fixo;
alter table dimensionamentos drop column if exists limiar_pavimento;

-- FK do workspace (a coluna workspace_id já existe desde a 0001)
alter table dimensionamentos
  drop constraint if exists dimensionamentos_workspace_fk;
alter table dimensionamentos
  add constraint dimensionamentos_workspace_fk
  foreign key (workspace_id) references workspaces(id) on delete cascade;

-- ====================== VERSÕES (snapshot imutável) ======================
create table if not exists dimensionamento_versoes (
  id uuid primary key default gen_random_uuid(),
  dimensionamento_id uuid not null references dimensionamentos(id) on delete cascade,
  versao int not null,
  payload jsonb not null,        -- config completo do dimensionamento
  resumo jsonb,                  -- denormalizado p/ listagem (headcount, m² etc.)
  nota text,
  criado_por uuid default auth.uid(),
  created_at timestamptz default now(),
  unique (dimensionamento_id, versao)
);
alter table dimensionamentos
  drop constraint if exists dimensionamentos_versao_atual_fk;
alter table dimensionamentos
  add constraint dimensionamentos_versao_atual_fk
  foreign key (versao_atual_id) references dimensionamento_versoes(id) on delete set null;

-- cria header + 1ª versão (atômico)
create or replace function fn_criar_dimensionamento(
  p_workspace uuid, p_cliente text, p_nome text, p_payload jsonb, p_resumo jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_dim uuid; v_ver uuid;
begin
  if not fn_is_member(p_workspace, auth.uid()) then raise exception 'sem acesso a este workspace'; end if;
  insert into dimensionamentos (workspace_id, cliente, nome, criado_por)
    values (p_workspace, p_cliente, p_nome, auth.uid()) returning id into v_dim;
  insert into dimensionamento_versoes (dimensionamento_id, versao, payload, resumo, criado_por)
    values (v_dim, 1, p_payload, p_resumo, auth.uid()) returning id into v_ver;
  update dimensionamentos set versao_atual_id = v_ver where id = v_dim;
  return v_dim;
end; $$;

-- grava nova versão e aponta o header (atômico, append-only)
create or replace function fn_salvar_versao(
  p_dimensionamento uuid, p_payload jsonb, p_resumo jsonb, p_nota text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_ws uuid; v_num int; v_id uuid;
begin
  select workspace_id into v_ws from dimensionamentos where id = p_dimensionamento;
  if not fn_is_member(v_ws, auth.uid()) then raise exception 'sem acesso a este workspace'; end if;
  select coalesce(max(versao),0)+1 into v_num from dimensionamento_versoes where dimensionamento_id = p_dimensionamento;
  insert into dimensionamento_versoes (dimensionamento_id, versao, payload, resumo, nota, criado_por)
    values (p_dimensionamento, v_num, p_payload, p_resumo, p_nota, auth.uid()) returning id into v_id;
  update dimensionamentos set versao_atual_id = v_id, updated_at = now() where id = p_dimensionamento;
  return v_id;
end; $$;

-- ====================== DROP das tabelas normalizadas (vazias) ======================
drop table if exists ambientes cascade;
drop table if exists cargos_dimensionamento cascade;
drop table if exists pavimentos cascade;

-- ====================== RLS ======================
-- remove policies antigas de dimensionamentos (nomes da 0002 desconhecidos -> dinâmico)
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='dimensionamentos' loop
    execute format('drop policy if exists %I on public.dimensionamentos', r.policyname);
  end loop;
end $$;

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table dimensionamentos enable row level security;
alter table dimensionamento_versoes enable row level security;

-- workspaces: membros veem; donos editam; criar via with check
create policy ws_select on workspaces for select using (fn_is_member(id, auth.uid()));
create policy ws_insert on workspaces for insert with check (criado_por = auth.uid());
create policy ws_update on workspaces for update using (fn_is_owner(id, auth.uid()));
create policy ws_delete on workspaces for delete using (fn_is_owner(id, auth.uid()));

-- members: membros do mesmo workspace se veem; o próprio convidado vê seu convite; owners gerenciam
create policy wm_select on workspace_members for select
  using (fn_is_member(workspace_id, auth.uid())
         or user_id = auth.uid()
         or lower(email) = lower((auth.jwt() ->> 'email')));
create policy wm_insert on workspace_members for insert with check (fn_is_owner(workspace_id, auth.uid()));
create policy wm_update on workspace_members for update using (fn_is_owner(workspace_id, auth.uid()));
create policy wm_delete on workspace_members for delete using (fn_is_owner(workspace_id, auth.uid()));

-- dimensionamentos: qualquer membro ativo do workspace
create policy dim_all on dimensionamentos for all
  using (fn_is_member(workspace_id, auth.uid()))
  with check (fn_is_member(workspace_id, auth.uid()));

-- versões: herdam a posse do header
create policy ver_all on dimensionamento_versoes for all
  using (exists (select 1 from dimensionamentos d
                 where d.id = dimensionamento_id and fn_is_member(d.workspace_id, auth.uid())))
  with check (exists (select 1 from dimensionamentos d
                 where d.id = dimensionamento_id and fn_is_member(d.workspace_id, auth.uid())));

-- catálogos seguem como na 0002 (leitura pública / referência) — sem alteração aqui.
