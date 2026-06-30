// catalogos.js — seeds parametrizáveis (referência IN 05/2017, calibráveis pela Belfort)

// Produtividade em m² por servente por jornada (1 passada). Faixa min/ref/max.
export const TIPOS_AMBIENTE = [
  { id: 'piso_frio',   nome: 'Piso frio / administrativa', categoria: 'seco',    classe: 'piso_frio',  prod_min: 500,  prod_ref: 600,  prod_max: 800,  criticidade: 3, base_insumo: 'ocupante_dia', tipo_piso: 'frio' },
  { id: 'sanitario',   nome: 'Sanitários',                categoria: 'molhado', classe: 'sanitario',  prod_min: 200,  prod_ref: 300,  prod_max: 400,  criticidade: 5, base_insumo: 'ocupante_dia', tipo_piso: 'frio' },
  { id: 'copa',        nome: 'Copa / cozinha',            categoria: 'molhado', classe: 'copa',       prod_min: 300,  prod_ref: 400,  prod_max: 500,  criticidade: 4, base_insumo: 'ambiente',     tipo_piso: 'frio' },
  { id: 'circulacao',  nome: 'Circulação / hall',         categoria: 'seco',    classe: 'circulacao', prod_min: 700,  prod_ref: 900,  prod_max: 1200, criticidade: 2, base_insumo: 'ambiente',     tipo_piso: 'frio' },
  { id: 'escada',      nome: 'Escadas',                   categoria: 'seco',    classe: 'escada',     prod_min: 300,  prod_ref: 400,  prod_max: 600,  criticidade: 2, base_insumo: 'ambiente',     tipo_piso: 'frio' },
  { id: 'carpete',     nome: 'Área acarpetada',           categoria: 'seco',    classe: 'carpete',    prod_min: 500,  prod_ref: 600,  prod_max: 800,  criticidade: 3, base_insumo: 'ambiente',     tipo_piso: 'carpete' },
  { id: 'vidro',       nome: 'Vidros / esquadrias',       categoria: 'seco',    classe: 'vidro',      prod_min: 110,  prod_ref: 220,  prod_max: 300,  criticidade: 1, base_insumo: 'm2',          tipo_piso: 'vidro' },
  { id: 'externa',     nome: 'Área externa pavimentada',  categoria: 'seco',    classe: 'externa',    prod_min: 1000, prod_ref: 1200, prod_max: 1800, criticidade: 1, base_insumo: 'm2',          tipo_piso: 'externo' },
];

// execucoes_mes: base 22 dias úteis/mês. fator = execucoes_mes / 22.
export const FREQUENCIAS = [
  { id: '3xdia',     nome: '3x ao dia',  execucoes_mes: 66 },
  { id: '2xdia',     nome: '2x ao dia',  execucoes_mes: 44 },
  { id: 'diaria',    nome: 'Diária',     execucoes_mes: 22 },
  { id: '3xsem',     nome: '3x/semana',  execucoes_mes: 13 },
  { id: '2xsem',     nome: '2x/semana',  execucoes_mes: 9 },
  { id: 'semanal',   nome: 'Semanal',    execucoes_mes: 4.33 },
  { id: 'quinzenal', nome: 'Quinzenal',  execucoes_mes: 2.17 },
  { id: 'mensal',    nome: 'Mensal',     execucoes_mes: 1 },
];
export const ORDEM_FREQ = ['3xdia','2xdia','diaria','3xsem','2xsem','semanal','quinzenal','mensal'];

// Jornadas legais (CLT / CCT asseio). horas_jornada = horas por dia trabalhado.
export const JORNADAS = [
  { id: '8h',    nome: '44h/sem — 8h/dia',       horas_jornada: 8,    dias_mes: 22 },
  { id: '733h',  nome: '44h/sem — 7h20/dia',     horas_jornada: 7.33, dias_mes: 26 },
  { id: '12x36', nome: '12x36',                  horas_jornada: 12,   dias_mes: 15 },
  { id: '6h',    nome: '36h/sem — 6h/dia',       horas_jornada: 6,    dias_mes: 26 },
];

// Estratégias: produtividade | posto | throughput
export const FUNCOES = [
  { id: 'asg',          nome: 'ASG / Limpeza',  estrategia: 'produtividade' },
  { id: 'recepcionista',nome: 'Recepcionista',  estrategia: 'posto' },
  { id: 'secretaria',   nome: 'Secretária',     estrategia: 'posto' },
  { id: 'concierge',    nome: 'Concierge',      estrategia: 'posto' },
  { id: 'copeira',      nome: 'Copeira',        estrategia: 'posto',      por: 'copa' },
  { id: 'barista',      nome: 'Barista',        estrategia: 'throughput', unidade: 'xícaras/h' },
  { id: 'cozinheiro',   nome: 'Cozinheiro',     estrategia: 'throughput', unidade: 'refeições/dia' },
  { id: 'garcom',       nome: 'Garçom',         estrategia: 'throughput', unidade: 'covers/turno' },
];

// Capacidade padrão por estratégia throughput (calibrável)
export const CAPACIDADE_THROUGHPUT = {
  barista:    { capacidade: 40,  janela: 'por hora de pico' },
  cozinheiro: { capacidade: 100, janela: 'refeições por turno' },
  garcom:     { capacidade: 25,  janela: 'covers por turno' },
};

// Fator de escala para postos (quantas pessoas por posto p/ cobrir a jornada do posto)
export const ESCALA_POSTO = {
  '8h':   { cobertura_8h: 1,   cobertura_24h: 3 },
  '12x36':{ cobertura_8h: 1,   cobertura_24h: 2 },
};

// Equipamentos disponíveis na empresa (exemplo — Edu insere o inventário real)
export const EQUIPAMENTOS = [
  { id: 'enceradeira',  nome: 'Enceradeira 350mm',     rendimento_m2h: 400,  pisos: ['frio'],            qtd_disp: 4 },
  { id: 'lavadora',     nome: 'Lavadora automática',   rendimento_m2h: 1500, pisos: ['frio','externo'], qtd_disp: 1 },
  { id: 'aspirador_po', nome: 'Aspirador de pó',       rendimento_m2h: 300,  pisos: ['carpete'],        qtd_disp: 3 },
  { id: 'aspirador_apl',nome: 'Aspirador água/pó',     rendimento_m2h: 250,  pisos: ['frio'],           qtd_disp: 2 },
  { id: 'mop_kit',      nome: 'Conjunto mop balde',    rendimento_m2h: 200,  pisos: ['frio'],           qtd_disp: 12 },
  { id: 'cinto_vidro',  nome: 'Kit limpa-vidros',      rendimento_m2h: 220,  pisos: ['vidro'],          qtd_disp: 6 },
];

// Insumos (consumo calibrável). base: ocupante_dia | ambiente | m2
export const INSUMOS = [
  { id: 'papel_hig',   nome: 'Papel higiênico (rolo)',  base: 'ocupante_dia', consumo: 0.10, unidade: 'rolo' },
  { id: 'papel_toa',   nome: 'Papel toalha (folha)',    base: 'ocupante_dia', consumo: 4,    unidade: 'folha' },
  { id: 'sabonete',    nome: 'Sabonete líquido (ml)',   base: 'ocupante_dia', consumo: 3,    unidade: 'ml' },
  { id: 'saco_lixo',   nome: 'Saco de lixo (un)',       base: 'ambiente',     consumo: 2,    unidade: 'saco' },
  { id: 'desinf',      nome: 'Desinfetante (ml)',       base: 'm2',           consumo: 0.5,  unidade: 'ml' },
  { id: 'detergente',  nome: 'Detergente (ml)',         base: 'm2',           consumo: 0.3,  unidade: 'ml' },
];

// Biblioteca-base de POPs (preenchida com ambientes/frequência do dimensionamento; editável)
export const POPS_BIBLIOTECA = [
  {
    funcao: 'asg', atividade: 'Limpeza e higienização de sanitários',
    objetivo: 'Garantir higienização, reposição de insumos e ausência de odores nos sanitários.',
    materiais: ['Desinfetante', 'Detergente', 'Pano de chão', 'Rodo', 'Saco de lixo'],
    epis: ['Luva nitrílica', 'Bota PVC', 'Óculos de proteção'],
    passos: [
      'Sinalizar a área com placa de piso molhado.',
      'Recolher resíduos e trocar sacos de lixo.',
      'Lavar e desinfetar bacias, mictórios e pias.',
      'Higienizar pisos e rejuntes com desinfetante.',
      'Repor papel higiênico, toalha e sabonete.',
      'Registrar a execução no checklist.',
    ],
    responsavel: 'ASG',
  },
  {
    funcao: 'asg', atividade: 'Conservação de pisos frios (área administrativa)',
    objetivo: 'Manter pisos limpos, secos e sem sujidade durante a jornada.',
    materiais: ['Mop', 'Detergente neutro', 'Pano', 'Saco de lixo'],
    epis: ['Luva', 'Calçado fechado antiderrapante'],
    passos: [
      'Recolher resíduos e esvaziar lixeiras.',
      'Varrer/aspirar a área.',
      'Passar mop úmido com detergente neutro.',
      'Higienizar superfícies de toque.',
      'Conferir e repor sacos de lixo.',
    ],
    responsavel: 'ASG',
  },
  {
    funcao: 'copeira', atividade: 'Serviço de copa',
    objetivo: 'Atender colaboradores e visitantes com café, água e organização da copa.',
    materiais: ['Café', 'Água', 'Louças', 'Detergente'],
    epis: ['Avental', 'Touca'],
    passos: [
      'Higienizar bancadas e utensílios no início do turno.',
      'Preparar e repor café e água.',
      'Atender solicitações de salas/andares.',
      'Lavar e organizar louças.',
      'Repor descartáveis e registrar consumo.',
    ],
    responsavel: 'Copeira',
  },
  {
    funcao: 'recepcionista', atividade: 'Atendimento e controle de acesso',
    objetivo: 'Recepcionar, identificar e direcionar visitantes com cordialidade e segurança.',
    materiais: ['Sistema de visitantes', 'Crachás', 'Telefone'],
    epis: [],
    passos: [
      'Conferir agenda de visitas do dia.',
      'Identificar e registrar visitantes.',
      'Emitir crachá e orientar acesso.',
      'Direcionar chamadas e e-mails.',
      'Registrar ocorrências no livro/sistema.',
    ],
    responsavel: 'Recepcionista',
  },
];
