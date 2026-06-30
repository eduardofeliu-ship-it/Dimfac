-- 0004_clientes_locais.sql — Dimensiona Facilities · base cadastral
-- Hierarquia: cliente (empresa) -> local (edifício/unidade) -> dimensionamento.
-- Tudo escopado por workspace (RLS por membership, igual ao resto).

-- ============================ CLIENTES (empresa) ============================
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  tipo text check (tipo in ('PJ','PF')) default 'PJ',
  razao_social text not null,
  nome_fantasia text,
  documento text,                 -- CNPJ/CPF
  inscricao_estadual text,
  segmento text,                  -- corporativo/varejo/industrial/condominio/saude/educacao
  contato_nome text,
  contato_email text,
  contato_telefone text,
  status text check (status in ('prospect','ativo','inativo')) default 'ativo',
  observacoes text,
  criado_por uuid default auth.uid(),
  created_at timestamptz default now()
);
create index if not exists idx_clientes_ws on clientes(workspace_id);

-- ============================ LOCAIS (edifício/unidade) ============================
create table if not exists locais (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,  -- denormalizado p/ RLS direto
  nome text not null,             -- "Matriz", "Loja Morumbi", "Torre A"
  cep text, logradouro text, numero text, complemento text,
  bairro text, cidade text, uf text,
  area_total_m2 numeric,
  qtd_pavimentos int,
  estrutura jsonb,                -- template físico (pavimentos/ambientes) p/ pré-preencher dimensionamento
  -- bloco contrato (opcional)
  num_contrato text,
  vigencia_inicio date,
  vigencia_fim date,
  gestor_responsavel text,
  criado_por uuid default auth.uid(),
  created_at timestamptz default now()
);
create index if not exists idx_locais_cliente on locais(cliente_id);
create index if not exists idx_locais_ws on locais(workspace_id);

-- ============================ RLS (por equipe) ============================
alter table clientes enable row level security;
alter table locais enable row level security;

create policy cli_all on clientes for all
  using (fn_is_member(workspace_id, auth.uid()))
  with check (fn_is_member(workspace_id, auth.uid()));

create policy loc_all on locais for all
  using (fn_is_member(workspace_id, auth.uid()))
  with check (fn_is_member(workspace_id, auth.uid()));
