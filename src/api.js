// api.js — camada de dados (Supabase). Tudo escopado por workspace via RLS.
import { supabase } from './lib/supabase.js';

// ---------- EQUIPE ----------
export async function meusWorkspaces() {
  // reivindica convites pendentes e retorna workspaces que sou membro
  await supabase.rpc('fn_reivindicar_convites');
  const { data: membros, error } = await supabase
    .from('workspace_members')
    .select('papel, workspaces(id, nome, criado_por)')
    .eq('status', 'ativo');
  if (error) throw error;
  return (membros || []).filter(m => m.workspaces).map(m => ({ ...m.workspaces, papel: m.papel }));
}
export async function criarWorkspace(nome) {
  const { data, error } = await supabase.rpc('fn_criar_workspace', { p_nome: nome });
  if (error) throw error;
  return data;
}
export async function membros(workspaceId) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('id, email, papel, status, user_id')
    .eq('workspace_id', workspaceId)
    .order('created_at');
  if (error) throw error;
  return data;
}
export async function convidarMembro(workspaceId, email, papel = 'membro') {
  const { error } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspaceId, email: email.toLowerCase().trim(), papel, status: 'convidado' });
  if (error) throw error;
}
export async function removerMembro(id) {
  const { error } = await supabase.from('workspace_members').delete().eq('id', id);
  if (error) throw error;
}

// ---------- CLIENTES ----------
export async function listarClientes(workspaceId) {
  const { data, error } = await supabase
    .from('clientes').select('*').eq('workspace_id', workspaceId).order('razao_social');
  if (error) throw error;
  return data;
}
export async function salvarCliente(workspaceId, c) {
  const row = { ...c, workspace_id: workspaceId };
  const q = c.id
    ? supabase.from('clientes').update(row).eq('id', c.id).select().single()
    : supabase.from('clientes').insert(row).select().single();
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
export async function excluirCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw error;
}

// ---------- LOCAIS ----------
export async function listarLocais(clienteId) {
  const { data, error } = await supabase
    .from('locais').select('*').eq('cliente_id', clienteId).order('nome');
  if (error) throw error;
  return data;
}
export async function salvarLocal(workspaceId, clienteId, l) {
  const row = { ...l, workspace_id: workspaceId, cliente_id: clienteId };
  const q = l.id
    ? supabase.from('locais').update(row).eq('id', l.id).select().single()
    : supabase.from('locais').insert(row).select().single();
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
export async function excluirLocal(id) {
  const { error } = await supabase.from('locais').delete().eq('id', id);
  if (error) throw error;
}

// ---------- DIMENSIONAMENTOS + VERSÕES ----------
export async function listarDimensionamentos(workspaceId) {
  const { data, error } = await supabase
    .from('dimensionamentos')
    .select('id, nome, updated_at, local_id, versao_atual_id, locais(nome, clientes(razao_social, nome_fantasia)), dimensionamento_versoes!dimensionamentos_versao_atual_fk(resumo)')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function criarDimensionamento(workspaceId, localId, nome, payload, resumo) {
  const { data, error } = await supabase.rpc('fn_criar_dimensionamento', {
    p_workspace: workspaceId, p_local: localId, p_nome: nome, p_payload: payload, p_resumo: resumo,
  });
  if (error) throw error;
  return data;
}
export async function salvarVersao(dimId, payload, resumo, nota) {
  const { data, error } = await supabase.rpc('fn_salvar_versao', {
    p_dimensionamento: dimId, p_payload: payload, p_resumo: resumo, p_nota: nota || null,
  });
  if (error) throw error;
  return data;
}
export async function listarVersoes(dimId) {
  const { data, error } = await supabase
    .from('dimensionamento_versoes')
    .select('id, versao, resumo, nota, created_at')
    .eq('dimensionamento_id', dimId)
    .order('versao', { ascending: false });
  if (error) throw error;
  return data;
}
export async function carregarVersao(versaoId) {
  const { data, error } = await supabase
    .from('dimensionamento_versoes').select('payload, versao').eq('id', versaoId).single();
  if (error) throw error;
  return data;
}
export async function versaoAtual(dimId) {
  const { data, error } = await supabase
    .from('dimensionamentos')
    .select('nome, local_id, versao_atual_id, dimensionamento_versoes!dimensionamentos_versao_atual_fk(payload)')
    .eq('id', dimId).single();
  if (error) throw error;
  return data;
}
