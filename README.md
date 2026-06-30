# Dimensiona · Facilities (v0.1)

Aplicação de dimensionamento de equipe, insumos, equipamentos e POPs para facilities.

## Como rodar

```bash
npm install
npm run dev      # http://localhost:5173
```

## Arquitetura
- **Motor único, 3 estratégias plugáveis** (`src/engine.js`):
  - `produtividade` — ASG/limpeza (m²/servente/jornada, ref. IN 05/2017)
  - `posto` — recepcionista, secretária, concierge, copeira
  - `throughput` — barista, cozinheiro, garçom
- **Dois pontos de partida**: pelo local, ou por time fixo (cascata de criticidade rebaixa frequências).
- **Deslocamento explícito** + trava de 1 ASG/pavimento acima de um limiar de frequência.
- **Catálogos parametrizáveis** (`src/catalogos.js`): produtividade, frequências, jornadas, funções, insumos, equipamentos, POPs.

## Persistência
`supabase/migrations/0001_init.sql` traz schema + seeds (padrão erpleilao: RLS por workspace).
A v0.1 roda com os catálogos em memória; a fase 2 liga ao Supabase.

## Pendências de calibração (Belfort)
- Índices de produtividade reais (hoje: referência de mercado).
- Limiar de frequência para trava por pavimento (Edu definirá).
- Consumos de insumos e inventário real de equipamentos.
