-- 0007_grants.sql — Dimensiona Facilities · hardening de execução das funções
-- As funções são SECURITY DEFINER por necessidade (criam workspace/membros furando RLS).
-- Aqui removemos o EXECUTE do public/anon e concedemos apenas a `authenticated`:
--   * RPCs do app (criar workspace/dimensionamento, salvar versão, reivindicar convite)
--     só fazem sentido para usuário logado.
--   * Helpers fn_is_member/fn_is_owner são chamados DENTRO das policies de RLS, então
--     precisam continuar executáveis por `authenticated` (senão o RLS quebra) — mas não
--     pelo anon.
-- Residual esperado: o linter ainda aponta "authenticated pode executar" (lint 0029)
-- nessas funções; isso é intencional (o app as chama como usuário logado).

-- helpers de RLS: fora do anon, mantidos para authenticated
revoke execute on function fn_is_member(uuid, uuid) from public;
grant  execute on function fn_is_member(uuid, uuid) to authenticated;
revoke execute on function fn_is_owner(uuid, uuid) from public;
grant  execute on function fn_is_owner(uuid, uuid) to authenticated;

-- RPCs do app: exigem login
revoke execute on function fn_criar_workspace(text) from public;
grant  execute on function fn_criar_workspace(text) to authenticated;

revoke execute on function fn_reivindicar_convites() from public;
grant  execute on function fn_reivindicar_convites() to authenticated;

revoke execute on function fn_criar_dimensionamento(uuid, uuid, text, jsonb, jsonb) from public;
grant  execute on function fn_criar_dimensionamento(uuid, uuid, text, jsonb, jsonb) to authenticated;

revoke execute on function fn_salvar_versao(uuid, jsonb, jsonb, text) from public;
grant  execute on function fn_salvar_versao(uuid, jsonb, jsonb, text) to authenticated;
