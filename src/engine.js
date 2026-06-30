// engine.js — motor de dimensionamento (puro, testável)
import { TIPOS_AMBIENTE, FREQUENCIAS, JORNADAS, ORDEM_FREQ, CAPACIDADE_THROUGHPUT, EQUIPAMENTOS, INSUMOS } from './catalogos.js';

const byId = (arr, id) => arr.find(x => x.id === id);
const execucoesMes = (freqId) => byId(FREQUENCIAS, freqId).execucoes_mes;

// ---- Estratégia PRODUTIVIDADE (ASG / limpeza) -------------------------------
// serventes de um ambiente = (area/prod) * (execucoes_mes / 22) por unidade.
function serventesAmbiente(amb, prodKey = 'prod_ref') {
  const tipo = byId(TIPOS_AMBIENTE, amb.tipo_ambiente_id);
  const prod = tipo[prodKey];
  const fator = execucoesMes(amb.frequencia_id) / 22;
  return (amb.area_m2 / prod) * fator * (amb.qtd || 1);
}

// Deslocamento explícito -> serventes equivalentes.
// viagens_dia * tempo_viagem_min, penalidade sem elevador.
function serventesDeslocamento(pavimentos, jornada, cfg = {}) {
  const tempoViagem = cfg.tempo_viagem_min ?? 4;      // min por viagem (escada)
  const viagensDia = cfg.viagens_dia ?? 6;            // idas/vindas com material por dia
  const penaltSemElevador = cfg.penalidade_sem_elevador ?? 1.8;
  let total = 0;
  for (const p of pavimentos) {
    const fator = p.tem_elevador ? 1 : penaltSemElevador;
    const minDia = viagensDia * tempoViagem * fator * Math.max(1, p.distancia_vertical || 1);
    total += (minDia / 60) / jornada.horas_jornada; // serventes equivalentes
  }
  return total;
}

// MODO LOCAL: dimensiona ASG a partir do prédio.
export function dimensionarLimpeza(pavimentos, jornadaId, opts = {}) {
  const jornada = byId(JORNADAS, jornadaId);
  const prodKey = opts.prodKey || 'prod_ref';
  const limiarFreq = opts.limiar_pavimento || 'diaria'; // trava 1 ASG/pavimento >= limiar
  const limiarIdx = ORDEM_FREQ.indexOf(limiarFreq);

  let serventesProd = 0;
  let pavimentosTravados = 0;
  const detalhe = [];

  for (const p of pavimentos) {
    let svPav = 0;
    let travaPav = false;
    for (const amb of p.ambientes) {
      const sv = serventesAmbiente(amb, prodKey);
      svPav += sv;
      const tipo = byId(TIPOS_AMBIENTE, amb.tipo_ambiente_id);
      const freqIdx = ORDEM_FREQ.indexOf(amb.frequencia_id);
      if (freqIdx <= limiarIdx) travaPav = true; // freq igual/maior que limiar
      detalhe.push({ pavimento: p.andar, tipo: tipo.nome, serventes: +sv.toFixed(2) });
    }
    serventesProd += svPav;
    if (travaPav) pavimentosTravados += 1;
  }

  const deslocamento = serventesDeslocamento(pavimentos, jornada, opts.deslocamento);
  const teorico = serventesProd + deslocamento;
  const headcount = Math.max(Math.ceil(teorico), pavimentosTravados);

  return {
    estrategia: 'produtividade',
    serventes_produtivos: +serventesProd.toFixed(2),
    serventes_deslocamento: +deslocamento.toFixed(2),
    teorico: +teorico.toFixed(2),
    pavimentos_travados: pavimentosTravados,
    headcount,
    motivo_arredondamento: headcount === pavimentosTravados && pavimentosTravados > Math.ceil(teorico)
      ? 'Mínimo de 1 ASG por pavimento (frequência >= limiar)'
      : 'Teto do dimensionamento por produtividade',
    detalhe,
  };
}

// MODO REVERSO (time fixo -> frequência): cascata de criticidade.
// Aloca o orçamento de serventes na ordem de criticidade; rebaixa o resto.
export function dimensionarReverso(pavimentos, jornadaId, timeFixo, opts = {}) {
  const jornada = byId(JORNADAS, jornadaId);
  const prodKey = opts.prodKey || 'prod_ref';
  const deslocamento = serventesDeslocamento(pavimentos, jornada, opts.deslocamento);
  let budget = timeFixo - deslocamento;

  // achata ambientes e ordena por criticidade desc, depois área desc
  const itens = [];
  for (const p of pavimentos) {
    for (const amb of p.ambientes) {
      const tipo = byId(TIPOS_AMBIENTE, amb.tipo_ambiente_id);
      itens.push({ amb, tipo, pavimento: p.andar });
    }
  }
  itens.sort((a, b) => b.tipo.criticidade - a.tipo.criticidade || b.amb.area_m2 - a.amb.area_m2);

  const resultado = [];
  for (const it of itens) {
    const ideal = it.amb.frequencia_id;
    const idealIdx = ORDEM_FREQ.indexOf(ideal);
    let escolhida = null;
    // tenta a melhor frequência possível a partir da ideal, descendo até caber
    for (let i = idealIdx; i < ORDEM_FREQ.length; i++) {
      const fId = ORDEM_FREQ[i];
      const fator = execucoesMes(fId) / 22;
      const custo = (it.amb.area_m2 / it.tipo[prodKey]) * fator * (it.amb.qtd || 1);
      if (custo <= budget || i === ORDEM_FREQ.length - 1) {
        escolhida = { fId, custo };
        budget -= custo;
        break;
      }
    }
    resultado.push({
      pavimento: it.pavimento,
      tipo: it.tipo.nome,
      criticidade: it.tipo.criticidade,
      freq_ideal: byId(FREQUENCIAS, ideal).nome,
      freq_atingida: byId(FREQUENCIAS, escolhida.fId).nome,
      rebaixada: escolhida.fId !== ideal,
      serventes: +escolhida.custo.toFixed(2),
    });
  }

  return {
    estrategia: 'produtividade_reverso',
    time_fixo: timeFixo,
    serventes_deslocamento: +deslocamento.toFixed(2),
    budget_restante: +Math.max(0, budget).toFixed(2),
    rebaixados: resultado.filter(r => r.rebaixada).length,
    resultado,
  };
}

// ---- Estratégia POSTO (recepção, secretária, concierge, copeira) ------------
export function dimensionarPosto({ postos, cobertura = '8h', escala = '8h' }) {
  const fator = cobertura === '24h' ? (escala === '12x36' ? 2 : 3) : 1;
  const headcount = Math.ceil(postos * fator);
  return { estrategia: 'posto', postos, cobertura, escala, fator_escala: fator, headcount };
}

// ---- Estratégia THROUGHPUT (barista, cozinheiro, garçom) --------------------
export function dimensionarThroughput({ funcao, demanda, capacidade }) {
  const cap = capacidade || CAPACIDADE_THROUGHPUT[funcao]?.capacidade || 1;
  const headcount = Math.ceil(demanda / cap);
  return { estrategia: 'throughput', funcao, demanda, capacidade: cap, headcount };
}

// ---- INSUMOS ----------------------------------------------------------------
export function dimensionarInsumos(pavimentos, ocupantes) {
  const totais = {};
  let totalAmbientes = 0, totalM2 = 0;
  for (const p of pavimentos) for (const amb of p.ambientes) {
    totalAmbientes += (amb.qtd || 1);
    totalM2 += amb.area_m2 * (amb.qtd || 1);
  }
  for (const ins of INSUMOS) {
    let q = 0;
    if (ins.base === 'ocupante_dia') q = ins.consumo * ocupantes * 22;
    else if (ins.base === 'ambiente') q = ins.consumo * totalAmbientes * 22;
    else if (ins.base === 'm2') q = ins.consumo * totalM2;
    totais[ins.id] = { nome: ins.nome, unidade: ins.unidade, qtd_mes: Math.ceil(q) };
  }
  return totais;
}

// ---- EQUIPAMENTOS (por tipo de piso + área) ---------------------------------
export function dimensionarEquipamentos(pavimentos, selecionados = null) {
  const areaPorPiso = {};
  for (const p of pavimentos) for (const amb of p.ambientes) {
    const tipo = byId(TIPOS_AMBIENTE, amb.tipo_ambiente_id);
    areaPorPiso[tipo.tipo_piso] = (areaPorPiso[tipo.tipo_piso] || 0) + amb.area_m2 * (amb.qtd || 1);
  }
  const lista = (selecionados || EQUIPAMENTOS.map(e => e.id))
    .map(id => byId(EQUIPAMENTOS, id))
    .filter(Boolean);
  const out = [];
  for (const eq of lista) {
    const areaAlvo = eq.pisos.reduce((s, piso) => s + (areaPorPiso[piso] || 0), 0);
    if (areaAlvo <= 0) continue;
    // 1 equipamento cobre ~ rendimento_m2h * 6h úteis/dia
    const necessario = Math.max(1, Math.ceil(areaAlvo / (eq.rendimento_m2h * 6)));
    out.push({ id: eq.id, nome: eq.nome, area_alvo_m2: Math.round(areaAlvo), necessario, disponivel: eq.qtd_disp, deficit: Math.max(0, necessario - eq.qtd_disp) });
  }
  return out;
}
