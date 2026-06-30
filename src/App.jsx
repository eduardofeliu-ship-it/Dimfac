import React, { useMemo, useState } from 'react';
import { TIPOS_AMBIENTE, FREQUENCIAS, JORNADAS, FUNCOES, EQUIPAMENTOS, POPS_BIBLIOTECA } from './catalogos.js';
import {
  dimensionarLimpeza, dimensionarReverso, dimensionarPosto, dimensionarThroughput,
  dimensionarInsumos, dimensionarEquipamentos,
} from './engine.js';

const uid = () => Math.random().toString(36).slice(2, 8);
const novoAmbiente = () => ({ id: uid(), tipo_ambiente_id: 'piso_frio', area_m2: 200, qtd: 1, frequencia_id: 'diaria' });
const novoPavimento = (n) => ({ id: uid(), andar: n, tem_elevador: true, distancia_vertical: 1, ambientes: [novoAmbiente()] });

const STEPS = ['Configuração', 'Edifício', 'Outros cargos', 'Resultado'];

export default function App() {
  const [step, setStep] = useState(0);
  const [modo, setModo] = useState('local');         // 'local' | 'time_fixo'
  const [jornada, setJornada] = useState('8h');
  const [ocupantes, setOcupantes] = useState(200);
  const [timeFixo, setTimeFixo] = useState(4);
  const [limiar, setLimiar] = useState('diaria');
  const [pavimentos, setPavimentos] = useState([
    novoPavimento('Térreo'), { ...novoPavimento('1º'), distancia_vertical: 2 },
  ]);
  const [outros, setOutros] = useState([
    { id: uid(), funcao: 'recepcionista', postos: 1, cobertura: '8h', escala: '8h', demanda: 0 },
  ]);
  const [equipSel, setEquipSel] = useState(EQUIPAMENTOS.map(e => e.id));

  // ---- cálculo reativo ----
  const calc = useMemo(() => {
    const limpeza = modo === 'local'
      ? dimensionarLimpeza(pavimentos, jornada, { limiar_pavimento: limiar })
      : dimensionarReverso(pavimentos, jornada, Number(timeFixo));
    const cargos = outros.map(o => {
      const f = FUNCOES.find(x => x.id === o.funcao);
      if (f.estrategia === 'posto') return { ...o, nome: f.nome, ...dimensionarPosto({ postos: Number(o.postos), cobertura: o.cobertura, escala: o.escala }) };
      if (f.estrategia === 'throughput') return { ...o, nome: f.nome, ...dimensionarThroughput({ funcao: o.funcao, demanda: Number(o.demanda) }) };
      return { ...o, nome: f.nome, headcount: 0 };
    });
    const insumos = dimensionarInsumos(pavimentos, Number(ocupantes));
    const equips = dimensionarEquipamentos(pavimentos, equipSel);
    return { limpeza, cargos, insumos, equips };
  }, [modo, jornada, ocupantes, timeFixo, limiar, pavimentos, outros, equipSel]);

  // ---- mutações ----
  const updPav = (id, patch) => setPavimentos(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));
  const updAmb = (pid, aid, patch) => setPavimentos(ps => ps.map(p => p.id !== pid ? p : { ...p, ambientes: p.ambientes.map(a => a.id === aid ? { ...a, ...patch } : a) }));
  const addAmb = (pid) => setPavimentos(ps => ps.map(p => p.id === pid ? { ...p, ambientes: [...p.ambientes, novoAmbiente()] } : p));
  const rmAmb = (pid, aid) => setPavimentos(ps => ps.map(p => p.id === pid ? { ...p, ambientes: p.ambientes.filter(a => a.id !== aid) } : p));
  const addPav = () => setPavimentos(ps => [...ps, novoPavimento(`${ps.length}º`)]);
  const rmPav = (id) => setPavimentos(ps => ps.filter(p => p.id !== id));
  const updOutro = (id, patch) => setOutros(os => os.map(o => o.id === id ? { ...o, ...patch } : o));
  const addOutro = () => setOutros(os => [...os, { id: uid(), funcao: 'copeira', postos: 1, cobertura: '8h', escala: '8h', demanda: 0 }]);
  const rmOutro = (id) => setOutros(os => os.filter(o => o.id !== id));

  const totalAmbientes = pavimentos.reduce((s, p) => s + p.ambientes.reduce((a, x) => a + Number(x.qtd || 1), 0), 0);
  const totalM2 = pavimentos.reduce((s, p) => s + p.ambientes.reduce((a, x) => a + Number(x.area_m2) * Number(x.qtd || 1), 0), 0);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <h1>Dimensiona<span className="dot">.</span></h1>
          <span className="eyebrow">Facilities · Belfort</span>
        </div>
        <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>v0.1</span>
      </div>

      <div className="steps">
        {STEPS.map((s, i) => (
          <button key={s} className={`step ${step === i ? 'active' : ''}`} onClick={() => setStep(i)}>
            <span className="n">{String(i + 1).padStart(2, '0')}</span>{s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="card">
          <h2>Ponto de partida</h2>
          <p className="sub">O fluxo bifurca aqui: dimensionar pelo local, ou partir de um time fixo e ajustar a frequência.</p>
          <div className="toggle" style={{ marginBottom: 18 }}>
            <button className={modo === 'local' ? 'on' : ''} onClick={() => setModo('local')}>Dimensionar pelo local</button>
            <button className={modo === 'time_fixo' ? 'on' : ''} onClick={() => setModo('time_fixo')}>Partir de time fixo</button>
          </div>
          <div className="grid c3">
            <div>
              <label>Jornada</label>
              <select value={jornada} onChange={e => setJornada(e.target.value)}>
                {JORNADAS.map(j => <option key={j.id} value={j.id}>{j.nome}</option>)}
              </select>
            </div>
            <div>
              <label>Ocupantes do prédio</label>
              <input className="mono" type="number" value={ocupantes} onChange={e => setOcupantes(e.target.value)} />
            </div>
            {modo === 'time_fixo' ? (
              <div>
                <label>Tamanho do time fixo (ASG)</label>
                <input className="mono" type="number" value={timeFixo} onChange={e => setTimeFixo(e.target.value)} />
              </div>
            ) : (
              <div>
                <label>Limiar p/ 1 ASG por pavimento</label>
                <select value={limiar} onChange={e => setLimiar(e.target.value)}>
                  {FREQUENCIAS.map(f => <option key={f.id} value={f.id}>{f.nome} ou maior</option>)}
                </select>
              </div>
            )}
          </div>
          <p className="hint">Produtividade base: referência IN 05/2017 (m²/servente/jornada), calibrável no catálogo.</p>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <h2>Edifício</h2>
          <p className="sub">{pavimentos.length} pavimento(s) · {totalAmbientes} ambiente(s) · {totalM2.toLocaleString('pt-BR')} m²</p>
          {pavimentos.map(p => (
            <div className="pav" key={p.id}>
              <div className="pav-head">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input style={{ width: 110 }} value={p.andar} onChange={e => updPav(p.id, { andar: e.target.value })} />
                  <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', margin: 0 }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={p.tem_elevador} onChange={e => updPav(p.id, { tem_elevador: e.target.checked })} /> elevador
                  </label>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>nível {p.distancia_vertical}</span>
                  <input type="number" style={{ width: 70 }} value={p.distancia_vertical} onChange={e => updPav(p.id, { distancia_vertical: Number(e.target.value) })} />
                </div>
                <button className="x" onClick={() => rmPav(p.id)} title="Remover pavimento">✕</button>
              </div>
              {p.ambientes.map(a => (
                <div className="amb-row" key={a.id}>
                  <div>
                    <label>Tipo de ambiente</label>
                    <select value={a.tipo_ambiente_id} onChange={e => updAmb(p.id, a.id, { tipo_ambiente_id: e.target.value })}>
                      {TIPOS_AMBIENTE.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                  <div><label>Área (m²)</label><input className="mono" type="number" value={a.area_m2} onChange={e => updAmb(p.id, a.id, { area_m2: Number(e.target.value) })} /></div>
                  <div><label>Qtd</label><input className="mono" type="number" value={a.qtd} onChange={e => updAmb(p.id, a.id, { qtd: Number(e.target.value) })} /></div>
                  <div>
                    <label>Frequência</label>
                    <select value={a.frequencia_id} onChange={e => updAmb(p.id, a.id, { frequencia_id: e.target.value })}>
                      {FREQUENCIAS.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                  <button className="x" onClick={() => rmAmb(p.id, a.id)} title="Remover">✕</button>
                </div>
              ))}
              <button className="btn ghost sm" onClick={() => addAmb(p.id)}>+ ambiente</button>
            </div>
          ))}
          <button className="btn gold" onClick={addPav}>+ pavimento</button>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2>Outros cargos</h2>
          <p className="sub">Recepção, secretária, concierge e copeira por posto; barista, cozinheiro e garçom por demanda.</p>
          {outros.map(o => {
            const f = FUNCOES.find(x => x.id === o.funcao);
            return (
              <div className="amb-row" key={o.id} style={{ gridTemplateColumns: '1.3fr 1fr 1fr 1fr auto', marginBottom: 12 }}>
                <div>
                  <label>Função</label>
                  <select value={o.funcao} onChange={e => updOutro(o.id, { funcao: e.target.value })}>
                    {FUNCOES.filter(x => x.estrategia !== 'produtividade').map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
                  </select>
                </div>
                {f.estrategia === 'posto' ? (
                  <>
                    <div><label>Postos</label><input className="mono" type="number" value={o.postos} onChange={e => updOutro(o.id, { postos: e.target.value })} /></div>
                    <div>
                      <label>Cobertura</label>
                      <select value={o.cobertura} onChange={e => updOutro(o.id, { cobertura: e.target.value })}>
                        <option value="8h">8h (1 turno)</option>
                        <option value="24h">24h</option>
                      </select>
                    </div>
                    <div>
                      <label>Escala</label>
                      <select value={o.escala} onChange={e => updOutro(o.id, { escala: e.target.value })}>
                        <option value="8h">8h</option>
                        <option value="12x36">12x36</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div><label>Demanda ({f.unidade})</label><input className="mono" type="number" value={o.demanda} onChange={e => updOutro(o.id, { demanda: e.target.value })} /></div>
                    <div /><div />
                  </>
                )}
                <button className="x" onClick={() => rmOutro(o.id)}>✕</button>
              </div>
            );
          })}
          <button className="btn ghost sm" onClick={addOutro}>+ cargo</button>

          <h2 style={{ marginTop: 24 }}>Equipamentos disponíveis</h2>
          <p className="sub">Selecione o inventário da empresa para o dimensionamento por tipo de piso.</p>
          <div className="grid c3">
            {EQUIPAMENTOS.map(e => (
              <label key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={equipSel.includes(e.id)}
                  onChange={ev => setEquipSel(s => ev.target.checked ? [...s, e.id] : s.filter(x => x !== e.id))} />
                {e.nome} <span className="mono" style={{ color: 'var(--muted)', fontSize: 11 }}>({e.qtd_disp})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 3 && <Resultado calc={calc} modo={modo} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <button className="btn ghost" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>← voltar</button>
        {step < 3
          ? <button className="btn" onClick={() => setStep(s => s + 1)}>avançar →</button>
          : <button className="btn gold" onClick={() => window.print()}>imprimir / PDF</button>}
      </div>
    </div>
  );
}

function Resultado({ calc, modo }) {
  const { limpeza, cargos, insumos, equips } = calc;
  const totalOutros = cargos.reduce((s, c) => s + c.headcount, 0);
  const totalGeral = (modo === 'local' ? limpeza.headcount : 0) + totalOutros;

  return (
    <>
      <div className="card">
        <h2>Resumo do dimensionamento</h2>
        <p className="sub">{modo === 'local' ? 'Modo: dimensionado pelo local' : 'Modo: time fixo com ajuste de frequência'}</p>
        <div className="kpis">
          {modo === 'local' ? (
            <div className="kpi"><div className="v">{limpeza.headcount}</div><div className="l">ASG / Limpeza</div></div>
          ) : (
            <div className="kpi"><div className="v">{limpeza.time_fixo}</div><div className="l">ASG (time fixo)</div></div>
          )}
          <div className="kpi alt"><div className="v">{totalOutros}</div><div className="l">Outros cargos</div></div>
          <div className="kpi alt"><div className="v">{totalGeral}</div><div className="l">Total headcount</div></div>
          {modo === 'local'
            ? <div className="kpi alt"><div className="v">{limpeza.teorico}</div><div className="l">Teórico (svtes)</div></div>
            : <div className="kpi alt"><div className="v">{limpeza.rebaixados}</div><div className="l">Freq. rebaixadas</div></div>}
        </div>
      </div>

      {modo === 'local' ? (
        <div className="card">
          <h2>Limpeza · por produtividade</h2>
          <p className="sub">{limpeza.serventes_produtivos} produtivos + {limpeza.serventes_deslocamento} deslocamento · {limpeza.motivo_arredondamento}</p>
          <table>
            <thead><tr><th>Pavimento</th><th>Ambiente</th><th className="right">Serventes</th></tr></thead>
            <tbody>{limpeza.detalhe.map((d, i) => <tr key={i}><td>{d.pavimento}</td><td>{d.tipo}</td><td className="right mono">{d.serventes}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <h2>Frequência atingida · cascata de criticidade</h2>
          <p className="sub">Time de {limpeza.time_fixo}. Itens críticos preservados; {limpeza.rebaixados} rebaixados.</p>
          <table>
            <thead><tr><th>Pav.</th><th>Ambiente</th><th>Crit.</th><th>Ideal</th><th>Atingida</th><th></th></tr></thead>
            <tbody>{limpeza.resultado.map((r, i) => (
              <tr key={i}>
                <td>{r.pavimento}</td><td>{r.tipo}</td><td className="mono">{r.criticidade}</td>
                <td>{r.freq_ideal}</td><td>{r.freq_atingida}</td>
                <td>{r.rebaixada ? <span className="tag down">rebaixada</span> : <span className="tag ok">mantida</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h2>Outros cargos</h2>
        <table>
          <thead><tr><th>Função</th><th>Estratégia</th><th className="right">Headcount</th></tr></thead>
          <tbody>{cargos.map(c => <tr key={c.id}><td>{c.nome}</td><td className="mono" style={{ color: 'var(--muted)' }}>{c.estrategia}</td><td className="right mono">{c.headcount}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="grid c2">
        <div className="card">
          <h2>Insumos / mês</h2>
          <table>
            <thead><tr><th>Item</th><th className="right">Qtd</th></tr></thead>
            <tbody>{Object.values(insumos).map((i, k) => <tr key={k}><td>{i.nome}</td><td className="right mono">{i.qtd_mes.toLocaleString('pt-BR')} {i.unidade}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="card">
          <h2>Equipamentos</h2>
          <table>
            <thead><tr><th>Item</th><th className="right">Nec.</th><th className="right">Disp.</th><th></th></tr></thead>
            <tbody>{equips.map(e => (
              <tr key={e.id}><td>{e.nome}</td><td className="right mono">{e.necessario}</td><td className="right mono">{e.disponivel}</td>
                <td className="right">{e.deficit > 0 ? <span className="tag def">−{e.deficit}</span> : <span className="tag ok">ok</span>}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <Pops />
    </>
  );
}

function Pops() {
  return (
    <div className="card">
      <h2>POPs · editáveis</h2>
      <p className="sub">Gerados por função, atividade e frequência. Clique para editar o texto antes de exportar.</p>
      {POPS_BIBLIOTECA.map((pop, i) => (
        <div className="pop" key={i}>
          <h3 contentEditable suppressContentEditableWarning>{pop.atividade}</h3>
          <div className="meta">{FUNCOES.find(f => f.id === pop.funcao)?.nome} · responsável: {pop.responsavel}</div>
          <p contentEditable suppressContentEditableWarning><strong>Objetivo:</strong> {pop.objetivo}</p>
          <div><strong>Materiais:</strong> {pop.materiais.map((m, k) => <span className="chip" key={k}>{m}</span>)}</div>
          <div style={{ marginTop: 8 }}><strong>EPIs:</strong> {pop.epis.length ? pop.epis.map((m, k) => <span className="chip" key={k}>{m}</span>) : <span className="hint">—</span>}</div>
          <ol contentEditable suppressContentEditableWarning>{pop.passos.map((s, k) => <li key={k}>{s}</li>)}</ol>
        </div>
      ))}
    </div>
  );
}
