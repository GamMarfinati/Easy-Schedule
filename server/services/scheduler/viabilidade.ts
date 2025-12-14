/**
 * Validação de Viabilidade - Detecta problemas ANTES de gerar a grade
 * 
 * Este módulo analisa se os dados de entrada são matematicamente viáveis
 * e fornece sugestões claras para o usuário resolver problemas.
 */

// Presets de configuração de horários
export interface PresetHorario {
  id: string;
  nome: string;
  descricao: string;
  aulasSemanais: number;
  aulasPorDia: number;
  slots: string[];
}

export const PRESETS_HORARIOS: PresetHorario[] = [
  {
    id: 'padrao-30',
    nome: '30 aulas/semana (6 por dia)',
    descricao: 'Configuração padrão - 6 aulas por dia, 5 dias',
    aulasSemanais: 30,
    aulasPorDia: 6,
    slots: [
      "07:15-08:05",
      "08:05-08:55",
      "09:10-10:00",
      "10:00-10:50",
      "11:05-11:55",
      "11:55-12:45"
    ]
  },
  {
    id: 'estendido-35',
    nome: '35 aulas/semana (7 por dia)',
    descricao: 'Manhã completa + 1 período extra',
    aulasSemanais: 35,
    aulasPorDia: 7,
    slots: [
      "07:15-08:05",
      "08:05-08:55",
      "09:10-10:00",
      "10:00-10:50",
      "11:05-11:55",
      "11:55-12:45",
      "12:45-13:35"
    ]
  },
  {
    id: 'integral-40',
    nome: '40 aulas/semana (8 por dia)',
    descricao: 'Período integral básico',
    aulasSemanais: 40,
    aulasPorDia: 8,
    slots: [
      "07:15-08:05",
      "08:05-08:55",
      "09:10-10:00",
      "10:00-10:50",
      "11:05-11:55",
      "11:55-12:45",
      "14:00-14:50",
      "14:50-15:40"
    ]
  },
  {
    id: 'integral-45',
    nome: '45 aulas/semana (9 por dia)',
    descricao: 'Período integral estendido',
    aulasSemanais: 45,
    aulasPorDia: 9,
    slots: [
      "07:15-08:05",
      "08:05-08:55",
      "09:10-10:00",
      "10:00-10:50",
      "11:05-11:55",
      "11:55-12:45",
      "14:00-14:50",
      "14:50-15:40",
      "15:55-16:45"
    ]
  },
  {
    id: 'integral-50',
    nome: '50 aulas/semana (10 por dia)',
    descricao: 'Período integral completo',
    aulasSemanais: 50,
    aulasPorDia: 10,
    slots: [
      "07:15-08:05",
      "08:05-08:55",
      "09:10-10:00",
      "10:00-10:50",
      "11:05-11:55",
      "11:55-12:45",
      "14:00-14:50",
      "14:50-15:40",
      "15:55-16:45",
      "16:45-17:35"
    ]
  }
];

// Interface para dados de entrada
interface ClassAssignment {
  grade: string;
  classCount: number;
}

interface Teacher {
  name: string;
  subject: string;
  availabilityDays: string[];
  classAssignments: ClassAssignment[];
}

// Resultado da análise de viabilidade
export interface AnaliseViabilidade {
  viavel: boolean;
  problemas: ProblemaViabilidade[];
  estatisticas: EstatisticasGrade;
  sugestoes: string[];
  presetRecomendado: PresetHorario | null;
}

export interface ProblemaViabilidade {
  tipo: 'CRITICO' | 'ALERTA' | 'INFO';
  categoria: 'CAPACIDADE' | 'DISPONIBILIDADE' | 'BILOCACAO' | 'DISTRIBUICAO';
  mensagem: string;
  detalhes?: string;
}

export interface EstatisticasGrade {
  totalAulas: number;
  totalTurmas: number;
  slotsDisponiveis: number;
  aulasPorTurma: Record<string, number>;
  ocupacaoPercentual: number;
  professorMaisOcupado: { nome: string; aulas: number };
  turmaComMaisAulas: { nome: string; aulas: number };
}

/**
 * Analisa se os dados são viáveis ANTES de tentar gerar a grade
 */
export function analisarViabilidade(
  teachers: Teacher[],
  timeSlots: string[]
): AnaliseViabilidade {
  const problemas: ProblemaViabilidade[] = [];
  const sugestoes: string[] = [];
  
  const numSlotsDia = timeSlots.length;
  const numDias = 5; // Segunda a Sexta
  const slotsDisponiveis = numSlotsDia * numDias;
  
  // Extrair turmas únicas
  const turmasSet = new Set<string>();
  teachers.forEach(t => {
    t.classAssignments.forEach(a => turmasSet.add(a.grade));
  });
  const turmas = Array.from(turmasSet);
  const totalTurmas = turmas.length;

  // Calcular total de aulas e aulas por turma
  let totalAulas = 0;
  const aulasPorTurma: Record<string, number> = {};
  const aulasPorProfessor: Record<string, number> = {};

  turmas.forEach(t => { aulasPorTurma[t] = 0; });

  teachers.forEach(t => {
    let aulasProf = 0;
    t.classAssignments.forEach(a => {
      totalAulas += a.classCount;
      aulasPorTurma[a.grade] = (aulasPorTurma[a.grade] || 0) + a.classCount;
      aulasProf += a.classCount;
    });
    aulasPorProfessor[t.name] = (aulasPorProfessor[t.name] || 0) + aulasProf;
  });

  // Encontrar professor mais ocupado e turma com mais aulas
  let professorMaisOcupado = { nome: '', aulas: 0 };
  let turmaComMaisAulas = { nome: '', aulas: 0 };

  Object.entries(aulasPorProfessor).forEach(([nome, aulas]) => {
    if (aulas > professorMaisOcupado.aulas) {
      professorMaisOcupado = { nome, aulas };
    }
  });

  Object.entries(aulasPorTurma).forEach(([nome, aulas]) => {
    if (aulas > turmaComMaisAulas.aulas) {
      turmaComMaisAulas = { nome, aulas };
    }
  });

  const ocupacaoPercentual = (turmaComMaisAulas.aulas / slotsDisponiveis) * 100;

  // =====================================================
  // VERIFICAÇÃO 1: CAPACIDADE TOTAL
  // =====================================================
  
  // Verificar cada turma individualmente
  turmas.forEach(turma => {
    const aulasNaTurma = aulasPorTurma[turma];
    if (aulasNaTurma > slotsDisponiveis) {
      problemas.push({
        tipo: 'CRITICO',
        categoria: 'CAPACIDADE',
        mensagem: `A turma "${turma}" precisa de ${aulasNaTurma} aulas/semana, mas só há ${slotsDisponiveis} slots disponíveis.`,
        detalhes: `Excesso de ${aulasNaTurma - slotsDisponiveis} aulas. Cada turma só pode ter até ${slotsDisponiveis} aulas com a configuração atual.`
      });
    } else if (aulasNaTurma > slotsDisponiveis * 0.9) {
      problemas.push({
        tipo: 'ALERTA',
        categoria: 'CAPACIDADE',
        mensagem: `A turma "${turma}" usa ${Math.round((aulasNaTurma / slotsDisponiveis) * 100)}% da capacidade (${aulasNaTurma}/${slotsDisponiveis} slots).`,
        detalhes: `Grade muito cheia dificulta a distribuição sem conflitos.`
      });
    }
  });

  // =====================================================
  // VERIFICAÇÃO 2: DISPONIBILIDADE DE PROFESSORES
  // =====================================================
  
  teachers.forEach(teacher => {
    const diasDisponiveis = teacher.availabilityDays.length;
    const slotsProf = diasDisponiveis * numSlotsDia;
    
    let totalAulasProf = 0;
    teacher.classAssignments.forEach(a => totalAulasProf += a.classCount);
    
    if (totalAulasProf > slotsProf) {
      problemas.push({
        tipo: 'CRITICO',
        categoria: 'DISPONIBILIDADE',
        mensagem: `${teacher.name} (${teacher.subject}) precisa dar ${totalAulasProf} aulas, mas só está disponível para ${slotsProf} slots.`,
        detalhes: `Disponível em ${diasDisponiveis} dias × ${numSlotsDia} períodos = ${slotsProf} slots máximos.`
      });
    } else if (totalAulasProf > slotsProf * 0.8) {
      problemas.push({
        tipo: 'ALERTA',
        categoria: 'DISPONIBILIDADE',
        mensagem: `${teacher.name} (${teacher.subject}) está com ${Math.round((totalAulasProf / slotsProf) * 100)}% da capacidade ocupada.`,
        detalhes: `${totalAulasProf} aulas em ${slotsProf} slots disponíveis pode dificultar a alocação.`
      });
    }
  });

  // =====================================================
  // VERIFICAÇÃO 3: RISCO DE BILOCAÇÃO
  // =====================================================
  
  // Verificar se o mesmo professor leciona em múltiplas turmas
  const profMultiplasTurmas: Record<string, Set<string>> = {};
  
  teachers.forEach(teacher => {
    const key = teacher.name;
    if (!profMultiplasTurmas[key]) {
      profMultiplasTurmas[key] = new Set();
    }
    teacher.classAssignments.forEach(a => {
      profMultiplasTurmas[key].add(a.grade);
    });
  });

  Object.entries(profMultiplasTurmas).forEach(([prof, turmasSet]) => {
    if (turmasSet.size > 1) {
      const turmasArr = Array.from(turmasSet);
      let totalAulasSimultaneas = 0;
      
      teachers
        .filter(t => t.name === prof)
        .forEach(t => {
          t.classAssignments.forEach(a => totalAulasSimultaneas += a.classCount);
        });

      const diasDisponiveisProf = teachers.find(t => t.name === prof)?.availabilityDays.length || 5;
      const slotsDispProf = diasDisponiveisProf * numSlotsDia;

      if (totalAulasSimultaneas > slotsDispProf) {
        problemas.push({
          tipo: 'CRITICO',
          categoria: 'BILOCACAO',
          mensagem: `${prof} leciona em ${turmasSet.size} turmas (${turmasArr.join(', ')}) com ${totalAulasSimultaneas} aulas, mas só tem ${slotsDispProf} slots.`,
          detalhes: `Impossível alocar sem bilocação (estar em duas turmas ao mesmo tempo).`
        });
      }
    }
  });

  // =====================================================
  // VERIFICAÇÃO 4: DISTRIBUIÇÃO POR DIA
  // =====================================================
  
  // Verificar se há professores com poucos dias que precisam dar muitas aulas por dia
  teachers.forEach(teacher => {
    const diasDisponiveis = teacher.availabilityDays.length;
    let totalAulasProf = 0;
    teacher.classAssignments.forEach(a => totalAulasProf += a.classCount);
    
    if (diasDisponiveis > 0) {
      const aulasPorDia = totalAulasProf / diasDisponiveis;
      if (aulasPorDia > numSlotsDia) {
        problemas.push({
          tipo: 'CRITICO',
          categoria: 'DISTRIBUICAO',
          mensagem: `${teacher.name} (${teacher.subject}) precisaria dar ${aulasPorDia.toFixed(1)} aulas/dia, mas só há ${numSlotsDia} períodos/dia.`,
          detalhes: `Com ${diasDisponiveis} dias disponíveis e ${totalAulasProf} aulas, é impossível distribuir.`
        });
      }
    }
  });

  // =====================================================
  // GERAR SUGESTÕES
  // =====================================================
  
  const problemasCriticos = problemas.filter(p => p.tipo === 'CRITICO');
  
  if (problemasCriticos.some(p => p.categoria === 'CAPACIDADE')) {
    // Encontrar preset mínimo necessário
    const maxAulasTurma = Math.max(...Object.values(aulasPorTurma));
    const presetNecessario = PRESETS_HORARIOS.find(p => p.aulasSemanais >= maxAulasTurma);
    
    if (presetNecessario) {
      sugestoes.push(`📅 Altere para "${presetNecessario.nome}" que suporta até ${presetNecessario.aulasSemanais} aulas/semana.`);
    } else {
      sugestoes.push(`📅 Reduza o número de aulas por turma para no máximo ${PRESETS_HORARIOS[PRESETS_HORARIOS.length - 1].aulasSemanais}.`);
    }
    sugestoes.push(`✂️ Ou reduza a carga horária de algumas disciplinas.`);
  }

  if (problemasCriticos.some(p => p.categoria === 'DISPONIBILIDADE')) {
    sugestoes.push(`📆 Amplie os dias disponíveis dos professores com sobrecarga.`);
    sugestoes.push(`👨‍🏫 Ou divida as aulas entre mais professores.`);
  }

  if (problemasCriticos.some(p => p.categoria === 'BILOCACAO')) {
    sugestoes.push(`⏰ Aumente os dias de disponibilidade dos professores que lecionam em múltiplas turmas.`);
    sugestoes.push(`🔄 Ou reduza o número de turmas por professor.`);
  }

  if (problemasCriticos.some(p => p.categoria === 'DISTRIBUICAO')) {
    sugestoes.push(`📊 Aumente os dias de disponibilidade dos professores ou reduza a carga horária.`);
  }

  // Sugestão de preset recomendado
  let presetRecomendado: PresetHorario | null = null;
  const aulaMaxTurma = Math.max(...Object.values(aulasPorTurma));
  
  for (const preset of PRESETS_HORARIOS) {
    if (preset.aulasSemanais >= aulaMaxTurma) {
      presetRecomendado = preset;
      break;
    }
  }

  // Estatísticas
  const estatisticas: EstatisticasGrade = {
    totalAulas,
    totalTurmas,
    slotsDisponiveis,
    aulasPorTurma,
    ocupacaoPercentual,
    professorMaisOcupado,
    turmaComMaisAulas
  };

  return {
    viavel: problemasCriticos.length === 0,
    problemas,
    estatisticas,
    sugestoes,
    presetRecomendado
  };
}

/**
 * Formata a análise de viabilidade para resposta da API
 */
export function formatarAnaliseParaResposta(analise: AnaliseViabilidade): {
  error: string;
  details: string[];
  suggestion: string;
  statistics: any;
  recommendedPreset: PresetHorario | null;
} {
  const problemasCriticos = analise.problemas.filter(p => p.tipo === 'CRITICO');
  
  return {
    error: `Não é possível gerar a grade: ${problemasCriticos.length} problema(s) crítico(s) detectado(s).`,
    details: problemasCriticos.map(p => p.mensagem),
    suggestion: analise.sugestoes.join(' '),
    statistics: {
      totalAulas: analise.estatisticas.totalAulas,
      totalTurmas: analise.estatisticas.totalTurmas,
      slotsDisponiveis: analise.estatisticas.slotsDisponiveis,
      ocupacaoPercentual: Math.round(analise.estatisticas.ocupacaoPercentual),
      turmaComMaisAulas: analise.estatisticas.turmaComMaisAulas
    },
    recommendedPreset: analise.presetRecomendado
  };
}

/**
 * Retorna o preset adequado para um número de aulas
 */
export function getPresetParaAulas(aulasNecessarias: number): PresetHorario | null {
  return PRESETS_HORARIOS.find(p => p.aulasSemanais >= aulasNecessarias) || null;
}

/**
 * Retorna todos os presets disponíveis
 */
export function getPresetsDisponiveis(): PresetHorario[] {
  return PRESETS_HORARIOS;
}
