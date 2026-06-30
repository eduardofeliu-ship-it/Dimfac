-- 0008_revoke_anon.sql — Dimensiona Facilities
-- O Supabase concede EXECUTE diretamente ao papel `anon` (não só via PUBLIC),
-- então o revoke de `public` da 0007 não removeu o acesso do anon. Aqui revogamos
-- explicitamente do `anon`. `authenticated` é mantido (RPCs do app + helpers do RLS).

revoke execute on function fn_is_member(uuid, uuid) from anon;
revoke execute on function fn_is_owner(uuid, uuid) from anon;
revoke execute on function fn_criar_workspace(text) from anon;
revoke execute on function fn_reivindicar_convites() from anon;
revoke execute on function fn_criar_dimensionamento(uuid, uuid, text, jsonb, jsonb) from anon;
revoke execute on function fn_salvar_versao(uuid, jsonb, jsonb, text) from anon;
