-- 0005_dimensionamento_local.sql — Dimensiona Facilities
-- Pendura o dimensionamento no local (cliente -> local -> dimensionamento).

alter table dimensionamentos add column if not exists local_id uuid references locais(id) on delete set null;
alter table dimensionamentos drop column if exists cliente;  -- substituído por local_id -> cliente
create index if not exists idx_dim_local on dimensionamentos(local_id);

-- recria fn_criar_dimensionamento incluindo o local
create or replace function fn_criar_dimensionamento(
  p_workspace uuid, p_local uuid, p_nome text, p_payload jsonb, p_resumo jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_dim uuid; v_ver uuid;
begin
  if not fn_is_member(p_workspace, auth.uid()) then raise exception 'sem acesso a este workspace'; end if;
  insert into dimensionamentos (workspace_id, local_id, nome, criado_por)
    values (p_workspace, p_local, p_nome, auth.uid()) returning id into v_dim;
  insert into dimensionamento_versoes (dimensionamento_id, versao, payload, resumo, criado_por)
    values (v_dim, 1, p_payload, p_resumo, auth.uid()) returning id into v_ver;
  update dimensionamentos set versao_atual_id = v_ver where id = v_dim;
  return v_dim;
end; $$;
