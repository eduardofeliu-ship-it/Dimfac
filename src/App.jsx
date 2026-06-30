import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase.js';
import { SessionProvider, useSession, Login } from './auth.jsx';
import Dimensionador, { PAYLOAD_VAZIO } from './Dimensionador.jsx';
import * as api from './api.js';

export default function App() {
  return <SessionProvider><Root /></SessionProvider>;
}

function Root() {
  const session = useSession();
  if (!session) return <Login />;
  return <Shell session={session} />;
}

function Shell({ session }) {
  const [workspaces, setWorkspaces] = useState(null);
  const [wsId, setWsId] = useState(null);
  const [view, setView] = useState('clientes');

  async function carregarWs() {
    const ws = await api.meusWorkspaces();
    setWorkspaces(ws);
    setWsId(cur => cur || (ws[0] && ws[0].id) || null);
  }
  useEffect(() => { carregarWs(); }, []);

  if (workspaces === null) return <div className="center muted">Carregando equipes…</div>;
  if (workspaces.length === 0) return <CriarEquipe onCriado={carregarWs} email={session.user.email} />;

  const ws = workspaces.find(w => w.id === wsId) || workspaces[0];

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand"><h1>Dimensiona<span className="dot">.</span></h1><span className="eyebrow">Facilities · Belfort</span></div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select value={ws.id} onChange={e => setWsId(e.target.value)} style={{ width: 'auto' }}>
            {workspaces.map(w => <option key={w.id} value={w.id}>{w.nome}</option>)}
          </select>
          <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{session.user.email}</span>
          <button className="btn ghost sm" onClick={() => supabase.auth.signOut()}>sair</button>
        </div>
      </div>
      <div className="steps" style={{ marginBottom: 20 }}>
        {[['clientes', 'Clientes'], ['dimensionamentos', 'Dimensionamentos'], ['equipe', 'Equipe']].map(([k, l]) => (
          <button key={k} className={`step ${view === k ? 'active' : ''}`} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>
      {view === 'clientes' && <Clientes wsId={ws.id} />}
      {view === 'dimensionamentos' && <Dimensionamentos wsId={ws.id} />}
      {view === 'equipe' && <Equipe ws={ws} />}
    </div>
  );
}

function CriarEquipe({ onCriado, email }) {
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  async function criar() {
    setLoading(true);
    try { await api.criarWorkspace(nome || 'Minha equipe'); await onCriado(); }
    finally { setLoading(false); }
  }
  return (
    <div className="center">
      <div className="card" style={{ width: 420, maxWidth: '90vw' }}>
        <h2>Crie sua equipe</h2>
        <p className="sub">Você ({email}) será o owner. Depois pode convidar o time.</p>
        <label>Nome da equipe</label>
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Belfort Comercial" autoFocus />
        <button className="btn" style={{ width: '100%', marginTop: 16 }} disabled={loading} onClick={criar}>{loading ? '…' : 'Criar equipe'}</button>
      </div>
    </div>
  );
}

// ---------------- CLIENTES + LOCAIS ----------------
function Clientes({ wsId }) {
  const [lista, setLista] = useState(null);
  const [edit, setEdit] = useState(null);
  const [aberto, setAberto] = useState(null);

  async function carregar() { setLista(await api.listarClientes(wsId)); }
  useEffect(() => { carregar(); setAberto(null); }, [wsId]);

  if (aberto) return <ClienteDetalhe wsId={wsId} cliente={aberto} onVoltar={() => { setAberto(null); carregar(); }} />;
  if (edit) return <FormCliente cliente={edit} onCancel={() => setEdit(null)} onSalvar={async (c) => { await api.salvarCliente(wsId, c); setEdit(null); carregar(); }} />;

  return (
    <div className="card">
      <div className="card-head"><h2>Clientes</h2><button className="btn sm" onClick={() => setEdit({})}>+ cliente</button></div>
      {lista === null ? <p className="muted">Carregando…</p> : lista.length === 0 ? <Vazio texto="Nenhum cliente ainda. Cadastre o primeiro." /> : (
        <table><thead><tr><th>Cliente</th><th>Segmento</th><th>Status</th><th>Contato</th><th></th></tr></thead>
          <tbody>{lista.map(c => (
            <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setAberto(c)}>
              <td><strong>{c.nome_fantasia || c.razao_social}</strong><br /><span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{c.documento}</span></td>
              <td>{c.segmento || '—'}</td><td><span className={`tag ${c.status === 'ativo' ? 'ok' : 'down'}`}>{c.status}</span></td>
              <td>{c.contato_nome || '—'}</td>
              <td className="right"><button className="btn ghost sm" onClick={e => { e.stopPropagation(); setEdit(c); }}>editar</button></td>
            </tr>))}</tbody></table>
      )}
    </div>
  );
}

const SEGMENTOS = ['corporativo', 'varejo', 'industrial', 'condominio', 'saude', 'educacao'];
function FormCliente({ cliente, onSalvar, onCancel }) {
  const [c, setC] = useState({ tipo: 'PJ', status: 'ativo', ...cliente });
  const set = (k, v) => setC(o => ({ ...o, [k]: v }));
  return (
    <div className="card">
      <div className="card-head"><h2>{c.id ? 'Editar cliente' : 'Novo cliente'}</h2></div>
      <div className="grid c2">
        <div><label>Tipo</label><select value={c.tipo} onChange={e => set('tipo', e.target.value)}><option>PJ</option><option>PF</option></select></div>
        <div><label>Status</label><select value={c.status} onChange={e => set('status', e.target.value)}><option value="prospect">prospect</option><option value="ativo">ativo</option><option value="inativo">inativo</option></select></div>
        <div><label>Razão social *</label><input value={c.razao_social || ''} onChange={e => set('razao_social', e.target.value)} /></div>
        <div><label>Nome fantasia</label><input value={c.nome_fantasia || ''} onChange={e => set('nome_fantasia', e.target.value)} /></div>
        <div><label>{c.tipo === 'PJ' ? 'CNPJ' : 'CPF'}</label><input value={c.documento || ''} onChange={e => set('documento', e.target.value)} /></div>
        <div><label>Inscrição estadual</label><input value={c.inscricao_estadual || ''} onChange={e => set('inscricao_estadual', e.target.value)} /></div>
        <div><label>Segmento</label><select value={c.segmento || ''} onChange={e => set('segmento', e.target.value)}><option value="">—</option>{SEGMENTOS.map(s => <option key={s}>{s}</option>)}</select></div>
        <div><label>Contato</label><input value={c.contato_nome || ''} onChange={e => set('contato_nome', e.target.value)} /></div>
        <div><label>Email contato</label><input value={c.contato_email || ''} onChange={e => set('contato_email', e.target.value)} /></div>
        <div><label>Telefone</label><input value={c.contato_telefone || ''} onChange={e => set('contato_telefone', e.target.value)} /></div>
      </div>
      <label style={{ marginTop: 12 }}>Observações</label>
      <textarea value={c.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={2} />
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn ghost" onClick={onCancel}>cancelar</button>
        <button className="btn" disabled={!c.razao_social} onClick={() => onSalvar(c)}>salvar</button>
      </div>
    </div>
  );
}

function ClienteDetalhe({ wsId, cliente, onVoltar }) {
  const [locais, setLocais] = useState(null);
  const [edit, setEdit] = useState(null);
  const [dimensionar, setDimensionar] = useState(null);

  async function carregar() { setLocais(await api.listarLocais(cliente.id)); }
  useEffect(() => { carregar(); }, [cliente.id]);

  if (dimensionar) return (
    <NovoDimensionamento wsId={wsId} local={dimensionar}
      onVoltar={() => setDimensionar(null)} onCriado={() => { setDimensionar(null); carregar(); }} />
  );
  if (edit) return <FormLocal local={edit} onCancel={() => setEdit(null)}
    onSalvar={async (l) => { await api.salvarLocal(wsId, cliente.id, l); setEdit(null); carregar(); }} />;

  return (
    <div className="card">
      <div className="card-head">
        <div><button className="btn ghost sm" onClick={onVoltar}>← clientes</button>
          <h2 style={{ marginTop: 8 }}>{cliente.nome_fantasia || cliente.razao_social}</h2>
          <p className="sub">Locais deste cliente</p></div>
        <button className="btn sm" onClick={() => setEdit({})}>+ local</button>
      </div>
      {locais === null ? <p className="muted">Carregando…</p> : locais.length === 0 ? <Vazio texto="Nenhum local cadastrado." /> : (
        <table><thead><tr><th>Local</th><th>Cidade/UF</th><th className="right">m²</th><th className="right">Pav.</th><th>Contrato</th><th></th></tr></thead>
          <tbody>{locais.map(l => (
            <tr key={l.id}><td><strong>{l.nome}</strong></td><td>{[l.cidade, l.uf].filter(Boolean).join('/') || '—'}</td>
              <td className="right mono">{l.area_total_m2 || '—'}</td><td className="right mono">{l.qtd_pavimentos || '—'}</td>
              <td>{l.num_contrato || '—'}</td>
              <td className="right" style={{ whiteSpace: 'nowrap' }}>
                <button className="btn ghost sm" onClick={() => setEdit(l)}>editar</button>
                <button className="btn gold sm" style={{ marginLeft: 6 }} onClick={() => setDimensionar({ ...l, cliente_id: cliente.id })}>dimensionar</button>
              </td></tr>))}</tbody></table>
      )}
    </div>
  );
}

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
function FormLocal({ local, onSalvar, onCancel }) {
  const [l, setL] = useState({ ...local });
  const set = (k, v) => setL(o => ({ ...o, [k]: v }));
  return (
    <div className="card">
      <div className="card-head"><h2>{l.id ? 'Editar local' : 'Novo local'}</h2></div>
      <div className="grid c2">
        <div><label>Nome do local *</label><input value={l.nome || ''} onChange={e => set('nome', e.target.value)} placeholder="Matriz, Loja Morumbi…" /></div>
        <div><label>Área total (m²)</label><input className="mono" type="number" value={l.area_total_m2 || ''} onChange={e => set('area_total_m2', Number(e.target.value))} /></div>
        <div><label>CEP</label><input value={l.cep || ''} onChange={e => set('cep', e.target.value)} /></div>
        <div><label>Qtd pavimentos</label><input className="mono" type="number" value={l.qtd_pavimentos || ''} onChange={e => set('qtd_pavimentos', Number(e.target.value))} /></div>
        <div><label>Logradouro</label><input value={l.logradouro || ''} onChange={e => set('logradouro', e.target.value)} /></div>
        <div><label>Número / compl.</label><input value={l.numero || ''} onChange={e => set('numero', e.target.value)} /></div>
        <div><label>Bairro</label><input value={l.bairro || ''} onChange={e => set('bairro', e.target.value)} /></div>
        <div><label>Cidade</label><input value={l.cidade || ''} onChange={e => set('cidade', e.target.value)} /></div>
        <div><label>UF</label><select value={l.uf || ''} onChange={e => set('uf', e.target.value)}><option value="">—</option>{UFS.map(u => <option key={u}>{u}</option>)}</select></div>
      </div>
      <h2 style={{ fontSize: 15, marginTop: 18 }}>Contrato (opcional)</h2>
      <div className="grid c4">
        <div><label>Nº contrato</label><input value={l.num_contrato || ''} onChange={e => set('num_contrato', e.target.value)} /></div>
        <div><label>Vigência início</label><input type="date" value={l.vigencia_inicio || ''} onChange={e => set('vigencia_inicio', e.target.value)} /></div>
        <div><label>Vigência fim</label><input type="date" value={l.vigencia_fim || ''} onChange={e => set('vigencia_fim', e.target.value)} /></div>
        <div><label>Gestor responsável</label><input value={l.gestor_responsavel || ''} onChange={e => set('gestor_responsavel', e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn ghost" onClick={onCancel}>cancelar</button>
        <button className="btn" disabled={!l.nome} onClick={() => onSalvar(l)}>salvar</button>
      </div>
    </div>
  );
}

// ---------------- DIMENSIONAMENTOS ----------------
function NovoDimensionamento({ wsId, local, onVoltar, onCriado }) {
  const inicial = (local.estrutura && local.estrutura.pavimentos)
    ? { ...PAYLOAD_VAZIO(), ...local.estrutura }
    : PAYLOAD_VAZIO();
  const nomePadrao = `${local.nome} — ${new Date().toLocaleDateString('pt-BR')}`;
  async function salvar(payload, resumo) {
    await api.criarDimensionamento(wsId, local.id, nomePadrao, payload, resumo);
    await api.salvarLocal(wsId, local.cliente_id, { id: local.id, estrutura: { pavimentos: payload.pavimentos } });
    await onCriado();
  }
  return <Dimensionador initial={inicial} titulo={nomePadrao} badge={local.estrutura ? 'template do local' : 'novo'} podeNovo onSalvar={salvar} onVoltar={onVoltar} />;
}

function Dimensionamentos({ wsId }) {
  const [lista, setLista] = useState(null);
  const [aberto, setAberto] = useState(null);
  async function carregar() { setLista(await api.listarDimensionamentos(wsId)); }
  useEffect(() => { carregar(); setAberto(null); }, [wsId]);

  if (aberto) return <AbrirDimensionamento dim={aberto} onVoltar={() => { setAberto(null); carregar(); }} />;
  return (
    <div className="card">
      <div className="card-head"><h2>Dimensionamentos</h2><span className="sub" style={{ margin: 0 }}>crie a partir de um local em Clientes</span></div>
      {lista === null ? <p className="muted">Carregando…</p> : lista.length === 0 ? <Vazio texto="Nenhum dimensionamento. Vá em Clientes → local → dimensionar." /> : (
        <table><thead><tr><th>Dimensionamento</th><th>Cliente / Local</th><th className="right">Total HC</th><th>Atualizado</th><th></th></tr></thead>
          <tbody>{lista.map(d => {
            const r = d.dimensionamento_versoes?.resumo || {};
            const cli = d.locais?.clientes?.nome_fantasia || d.locais?.clientes?.razao_social || '—';
            return (
              <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setAberto(d)}>
                <td><strong>{d.nome}</strong></td><td>{cli} · {d.locais?.nome}</td>
                <td className="right mono">{r.total ?? '—'}</td>
                <td className="mono" style={{ fontSize: 12 }}>{new Date(d.updated_at).toLocaleDateString('pt-BR')}</td>
                <td className="right"><button className="btn ghost sm">abrir</button></td>
              </tr>);
          })}</tbody></table>
      )}
    </div>
  );
}

function AbrirDimensionamento({ dim, onVoltar }) {
  const [payload, setPayload] = useState(null);
  const [versoes, setVersoes] = useState([]);
  const [verNum, setVerNum] = useState(null);

  async function carregar() {
    const atual = await api.versaoAtual(dim.id);
    setPayload(atual.dimensionamento_versoes?.payload || PAYLOAD_VAZIO());
    const vs = await api.listarVersoes(dim.id);
    setVersoes(vs);
    setVerNum(vs[0]?.versao);
  }
  useEffect(() => { carregar(); }, [dim.id]);

  async function salvar(p, resumo, nota) { await api.salvarVersao(dim.id, p, resumo, nota); await carregar(); }
  async function restaurar(v) {
    const old = await api.carregarVersao(v.id);
    await api.salvarVersao(dim.id, old.payload, v.resumo || {}, `restaurado da v${v.versao}`);
    await carregar();
  }

  if (!payload) return <p className="muted">Carregando…</p>;
  return (
    <div>
      <Dimensionador key={verNum} initial={payload} titulo={dim.nome} badge={`v${verNum || 1}`} onSalvar={salvar} onVoltar={onVoltar} />
      <div className="card">
        <h2 style={{ fontSize: 16 }}>Versões</h2>
        <table><thead><tr><th>Versão</th><th>Resumo</th><th>Nota</th><th>Data</th><th></th></tr></thead>
          <tbody>{versoes.map(v => (
            <tr key={v.id}><td className="mono">v{v.versao}</td>
              <td className="mono" style={{ fontSize: 12 }}>{v.resumo?.total != null ? `${v.resumo.total} HC · ${(v.resumo.total_m2 || 0).toLocaleString('pt-BR')} m²` : '—'}</td>
              <td>{v.nota || '—'}</td><td className="mono" style={{ fontSize: 12 }}>{new Date(v.created_at).toLocaleString('pt-BR')}</td>
              <td className="right"><button className="btn ghost sm" onClick={() => restaurar(v)}>restaurar</button></td></tr>))}</tbody></table>
      </div>
    </div>
  );
}

// ---------------- EQUIPE ----------------
function Equipe({ ws }) {
  const [lista, setLista] = useState(null);
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState('membro');
  const [erro, setErro] = useState('');
  async function carregar() { setLista(await api.membros(ws.id)); }
  useEffect(() => { carregar(); }, [ws.id]);
  async function convidar() {
    setErro('');
    try { await api.convidarMembro(ws.id, email, papel); setEmail(''); carregar(); }
    catch (e) { setErro(e.message); }
  }
  return (
    <div className="card">
      <div className="card-head"><h2>Equipe · {ws.nome}</h2></div>
      <div className="amb-row" style={{ gridTemplateColumns: '2fr 1fr auto', marginBottom: 16 }}>
        <div><label>Convidar por email</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="pessoa@belfort.com" /></div>
        <div><label>Papel</label><select value={papel} onChange={e => setPapel(e.target.value)}><option value="membro">membro</option><option value="admin">admin</option></select></div>
        <button className="btn" style={{ alignSelf: 'end' }} disabled={!email} onClick={convidar}>convidar</button>
      </div>
      {erro && <p className="hint" style={{ color: 'var(--bad)' }}>{erro}</p>}
      {lista === null ? <p className="muted">Carregando…</p> : (
        <table><thead><tr><th>Email</th><th>Papel</th><th>Status</th><th></th></tr></thead>
          <tbody>{lista.map(m => (
            <tr key={m.id}><td>{m.email || '—'}</td><td className="mono">{m.papel}</td>
              <td><span className={`tag ${m.status === 'ativo' ? 'ok' : 'down'}`}>{m.status}</span></td>
              <td className="right">{m.papel !== 'owner' && <button className="btn ghost sm" onClick={async () => { await api.removerMembro(m.id); carregar(); }}>remover</button>}</td></tr>))}</tbody></table>
      )}
      <p className="hint">Convidados entram ao criar conta com o mesmo email (reivindicação automática no login).</p>
    </div>
  );
}

function Vazio({ texto }) { return <p className="muted" style={{ padding: '12px 0' }}>{texto}</p>; }
