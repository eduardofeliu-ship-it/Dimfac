-- 0002_rls.sql — Dimensiona Facilities · Row Level Security
--
-- PREMISSAS (ajustar na fase 2 se mudarem):
--   1. Autenticação via Supabase Auth  -> a posse usa auth.uid().
--      Se o app usar outro provedor (ex.: Firebase), auth.uid() será null no
--      client e as policias de posse bloquearão tudo via publishable key. Nesse
--      caso, trocar por verificação de JWT/claim equivalente.
--   2. Não há tabela `workspaces` neste schema. A posse é por
--      `criado_por = auth.uid()` em `dimensionamentos`, herdada pelas filhas.
--      Para multi-workspace real, criar `workspaces` + membership e migrar as
--      policias para `workspace_id in (...)`.
--
-- Modelo:
--   * CATÁLOGOS (referência)      -> leitura pública (anon+auth), escrita só autenticado.
--   * DADOS DE CLIENTE            -> tudo restrito ao dono (criado_por = auth.uid()).
--   * EQUIPAMENTOS (inventário)   -> restrito a autenticado (sem coluna de dono; refinar na fase 2).
--
-- Idempotente: drop policy if exists antes de cada create.

-- ============================================================
-- CATÁLOGOS — leitura pública, escrita autenticada
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['tipos_ambiente','frequencias','jornadas','funcoes','insumos','pops_biblioteca']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%1$s_public_read" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s_auth_write" on public.%1$I;', t);
    -- leitura para qualquer papel (anon + authenticated)
    execute format('create policy "%1$s_public_read" on public.%1$I for select using (true);', t);
    -- escrita (insert/update/delete) só para autenticados
    execute format('create policy "%1$s_auth_write" on public.%1$I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================
-- EQUIPAMENTOS — inventário da empresa: só autenticado
-- ============================================================
alter table public.equipamentos enable row level security;
drop policy if exists "equipamentos_auth_all" on public.equipamentos;
create policy "equipamentos_auth_all" on public.equipamentos
  for all to authenticated using (true) with check (true);

-- ============================================================
-- DADOS DE CLIENTE — restrito ao dono (auth.uid())
-- ============================================================

-- dimensionamentos: dono direto via criado_por
alter table public.dimensionamentos enable row level security;
drop policy if exists "dimensionamentos_owner_all" on public.dimensionamentos;
create policy "dimensionamentos_owner_all" on public.dimensionamentos
  for all to authenticated
  using (criado_por = auth.uid())
  with check (criado_por = auth.uid());

-- pavimentos: posse herdada do dimensionamento pai
alter table public.pavimentos enable row level security;
drop policy if exists "pavimentos_owner_all" on public.pavimentos;
create policy "pavimentos_owner_all" on public.pavimentos
  for all to authenticated
  using (exists (
    select 1 from public.dimensionamentos d
    where d.id = pavimentos.dimensionamento_id and d.criado_por = auth.uid()))
  with check (exists (
    select 1 from public.dimensionamentos d
    where d.id = pavimentos.dimensionamento_id and d.criado_por = auth.uid()));

-- ambientes: posse herdada via pavimento -> dimensionamento
alter table public.ambientes enable row level security;
drop policy if exists "ambientes_owner_all" on public.ambientes;
create policy "ambientes_owner_all" on public.ambientes
  for all to authenticated
  using (exists (
    select 1 from public.pavimentos p
    join public.dimensionamentos d on d.id = p.dimensionamento_id
    where p.id = ambientes.pavimento_id and d.criado_por = auth.uid()))
  with check (exists (
    select 1 from public.pavimentos p
    join public.dimensionamentos d on d.id = p.dimensionamento_id
    where p.id = ambientes.pavimento_id and d.criado_por = auth.uid()));

-- cargos_dimensionamento: posse herdada do dimensionamento pai
alter table public.cargos_dimensionamento enable row level security;
drop policy if exists "cargos_owner_all" on public.cargos_dimensionamento;
create policy "cargos_owner_all" on public.cargos_dimensionamento
  for all to authenticated
  using (exists (
    select 1 from public.dimensionamentos d
    where d.id = cargos_dimensionamento.dimensionamento_id and d.criado_por = auth.uid()))
  with check (exists (
    select 1 from public.dimensionamentos d
    where d.id = cargos_dimensionamento.dimensionamento_id and d.criado_por = auth.uid()));
