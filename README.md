# Dimensiona · Facilities (v1)

Ferramenta interna de dimensionamento de equipe, insumos, equipamentos e POPs para facilities,
com base cadastral de clientes/locais, equipe (workspaces) e dimensionamentos versionados.

## Rodar local

```bash
npm install
npm run dev      # http://localhost:5173
```

Requer `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY` (publishable).

## Arquitetura
- **Motor** (`src/engine.js`): 3 estratégias — produtividade (ASG, IN 05/2017), posto (recepção/secretária/concierge/copeira), throughput (barista/cozinheiro/garçom). Modo local e modo time-fixo (cascata de criticidade).
- **Cadastro**: cliente (empresa) → local (edifício/unidade, com template físico) → dimensionamento.
- **Versionamento**: cada save é uma versão imutável (snapshot JSONB). Listar/restaurar versões.
- **Equipe**: workspaces + membros (convite por email). RLS por membership.
- **Auth**: Supabase Auth (email/senha).

## Banco (Supabase)
Migrations em `supabase/migrations/` (0001→0005). RLS ancorada em `fn_is_member`.
RPCs: `fn_criar_workspace`, `fn_reivindicar_convites`, `fn_criar_dimensionamento`, `fn_salvar_versao`.

## Pendências de calibração (Belfort)
- Índices de produtividade reais; limiar de trava por pavimento; consumos de insumos; inventário de equipamentos.
