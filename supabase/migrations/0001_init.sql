-- 0001_init.sql — Dimensiona Facilities · schema + seeds
-- Aplicar no Supabase Studio (ou via MCP). RLS por workspace no padrão erpleilao.

-- ===================== CATÁLOGOS =====================
create table if not exists tipos_ambiente (
  id text primary key,
  nome text not null,
  categoria text check (categoria in ('seco','molhado')),
  classe text not null,
  prod_min numeric, prod_ref numeric, prod_max numeric,   -- m²/servente/jornada
  criticidade int check (criticidade between 1 and 5),
  base_insumo text check (base_insumo in ('ocupante_dia','ambiente','m2')),
  tipo_piso text not null
);

create table if not exists frequencias (
  id text primary key, nome text not null, execucoes_mes numeric not null, ordem int not null
);

create table if not exists jornadas (
  id text primary key, nome text not null, horas_jornada numeric not null, dias_mes int not null
);

create table if not exists funcoes (
  id text primary key, nome text not null,
  estrategia text check (estrategia in ('produtividade','posto','throughput')),
  meta jsonb default '{}'::jsonb
);

create table if not exists equipamentos (
  id text primary key, nome text not null, rendimento_m2h numeric, pisos text[], qtd_disp int,
  workspace_id uuid
);

create table if not exists insumos (
  id text primary key, nome text not null,
  base text check (base in ('ocupante_dia','ambiente','m2')), consumo numeric, unidade text
);

create table if not exists pops_biblioteca (
  id uuid primary key default gen_random_uuid(),
  funcao_id text references funcoes(id),
  atividade text not null, frequencia_id text references frequencias(id),
  objetivo text, materiais text[], epis text[], passos text[], responsavel text
);

-- ===================== DIMENSIONAMENTOS =====================
create table if not exists dimensionamentos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  cliente text, modo text check (modo in ('local','time_fixo')),
  jornada_id text references jornadas(id),
  ocupantes int, time_fixo int, limiar_pavimento text references frequencias(id),
  criado_por uuid default auth.uid(), created_at timestamptz default now()
);

create table if not exists pavimentos (
  id uuid primary key default gen_random_uuid(),
  dimensionamento_id uuid references dimensionamentos(id) on delete cascade,
  andar text, tem_elevador boolean default true, distancia_vertical int default 1
);

create table if not exists ambientes (
  id uuid primary key default gen_random_uuid(),
  pavimento_id uuid references pavimentos(id) on delete cascade,
  tipo_ambiente_id text references tipos_ambiente(id),
  area_m2 numeric not null, qtd int default 1,
  frequencia_id text references frequencias(id)
);

create table if not exists cargos_dimensionamento (
  id uuid primary key default gen_random_uuid(),
  dimensionamento_id uuid references dimensionamentos(id) on delete cascade,
  funcao_id text references funcoes(id),
  postos int, cobertura text, escala text, demanda numeric
);

-- ===================== SEEDS =====================
insert into tipos_ambiente (id,nome,categoria,classe,prod_min,prod_ref,prod_max,criticidade,base_insumo,tipo_piso) values
 ('piso_frio','Piso frio / administrativa','seco','piso_frio',500,600,800,3,'ocupante_dia','frio'),
 ('sanitario','Sanitários','molhado','sanitario',200,300,400,5,'ocupante_dia','frio'),
 ('copa','Copa / cozinha','molhado','copa',300,400,500,4,'ambiente','frio'),
 ('circulacao','Circulação / hall','seco','circulacao',700,900,1200,2,'ambiente','frio'),
 ('escada','Escadas','seco','escada',300,400,600,2,'ambiente','frio'),
 ('carpete','Área acarpetada','seco','carpete',500,600,800,3,'ambiente','carpete'),
 ('vidro','Vidros / esquadrias','seco','vidro',110,220,300,1,'m2','vidro'),
 ('externa','Área externa pavimentada','seco','externa',1000,1200,1800,1,'m2','externo')
on conflict (id) do nothing;

insert into frequencias (id,nome,execucoes_mes,ordem) values
 ('3xdia','3x ao dia',66,0),('2xdia','2x ao dia',44,1),('diaria','Diária',22,2),
 ('3xsem','3x/semana',13,3),('2xsem','2x/semana',9,4),('semanal','Semanal',4.33,5),
 ('quinzenal','Quinzenal',2.17,6),('mensal','Mensal',1,7)
on conflict (id) do nothing;

insert into jornadas (id,nome,horas_jornada,dias_mes) values
 ('8h','44h/sem — 8h/dia',8,22),('733h','44h/sem — 7h20/dia',7.33,26),
 ('12x36','12x36',12,15),('6h','36h/sem — 6h/dia',6,26)
on conflict (id) do nothing;

insert into funcoes (id,nome,estrategia,meta) values
 ('asg','ASG / Limpeza','produtividade','{}'),
 ('recepcionista','Recepcionista','posto','{}'),
 ('secretaria','Secretária','posto','{}'),
 ('concierge','Concierge','posto','{}'),
 ('copeira','Copeira','posto','{"por":"copa"}'),
 ('barista','Barista','throughput','{"unidade":"xícaras/h","capacidade":40}'),
 ('cozinheiro','Cozinheiro','throughput','{"unidade":"refeições/dia","capacidade":100}'),
 ('garcom','Garçom','throughput','{"unidade":"covers/turno","capacidade":25}')
on conflict (id) do nothing;

insert into insumos (id,nome,base,consumo,unidade) values
 ('papel_hig','Papel higiênico (rolo)','ocupante_dia',0.10,'rolo'),
 ('papel_toa','Papel toalha (folha)','ocupante_dia',4,'folha'),
 ('sabonete','Sabonete líquido','ocupante_dia',3,'ml'),
 ('saco_lixo','Saco de lixo','ambiente',2,'saco'),
 ('desinf','Desinfetante','m2',0.5,'ml'),
 ('detergente','Detergente','m2',0.3,'ml')
on conflict (id) do nothing;

-- NOTA: habilitar RLS antes de produção, padrão:
-- workspace_id in (select id from workspaces where criado_por = auth.uid())
