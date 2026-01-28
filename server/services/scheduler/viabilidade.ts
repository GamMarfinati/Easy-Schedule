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
      "1ª Aula",
      "2ª Aula",
      "3ª Aula",
      "Intervalo",
      "4ª Aula",
      "5ª Aula",
      "6ª Aula"
    ]
  },
  {
    id: 'estendido-35',
    nome: '35 aulas/semana (7 por dia)',
    descricao: 'Manhã completa + 1 período extra',
    aulasSemanais: 35,
    aulasPorDia: 7,
    slots: [
      "1ª Aula",
      "2ª Aula",
      "3ª Aula",
      "Intervalo",
      "4ª Aula",
      "5ª Aula",
      "6ª Aula",
      "7ª Aula"
    ]
  },
  {
    id: 'integral-40',
    nome: '40 aulas/semana (8 por dia)',
    descricao: 'Período integral básico',
    aulasSemanais: 40,
    aulasPorDia: 8,
    slots: [
      "1ª Aula",
      "2ª Aula",
      "3ª Aula",
      "Intervalo",
      "4ª Aula",
      "5ª Aula",
      "6ª Aula",
      "Almoço",
      "7ª Aula",
      "8ª Aula"
    ]
  },
  {
    id: 'integral-45',
    nome: '45 aulas/semana (9 por dia)',
    descricao: 'Período integral estendido',
    aulasSemanais: 45,
    aulasPorDia: 9,
    slots: [
      "1ª Aula",
      "2ª Aula",
      "3ª Aula",
      "Intervalo",
      "4ª Aula",
      "5ª Aula",
      "6ª Aula",
      "Almoço",
      "7ª Aula",
      "8ª Aula",
      "9ª Aula"
    ]
  },
  {
    id: 'integral-50',
    nome: '50 aulas/semana (10 por dia)',
    descricao: 'Período integral completo',
    aulasSemanais: 50,
    aulasPorDia: 10,
    slots: [
      "1ª Aula",
      "2ª Aula",
      "3ª Aula",
      "Intervalo",
      "4ª Aula",
      "5ª Aula",
      "6ª Aula",
      "Almoço",
      "7ª Aula",
      "8ª Aula",
      "9ª Aula",
      "10ª Aula"
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
  availability?: Record<string, number[]>; // Granular availability support
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
  
  // Lista de professores com problemas para exibir no relatório
  const professoresComProblema: { nome: string; subject: string; aulas: number; slots: number; dias: string[]; diasNecessarios: number; turmas: number }[] = [];
  
  // Mapa auxiliar para normalização de dias
  const dayNormalization: Record<string, string> = {
    'segunda-feira': 'Seg', 'seg': 'Seg',
    'terça-feira': 'Ter', 'ter': 'Ter',
    'quarta-feira': 'Qua', 'qua': 'Qua',
    'quinta-feira': 'Qui', 'qui': 'Qui',
    'sexta-feira': 'Sex', 'sex': 'Sex'
  };

  teachers.forEach(teacher => {
    const diasDisponiveis = teacher.availabilityDays.length;
    
    // Calcular capacidade REAL (Considerando granularidade)
    let slotsProf = 0;
    
    teacher.availabilityDays.forEach(day => {
       const shortDay = dayNormalization[day.toLowerCase()];
       if (shortDay && teacher.availability && teacher.availability[shortDay]) {
          // Se tiver restrição granular, conta apenas os slots marcados com '1'
          const slotsDoDia = teacher.availability[shortDay].filter(s => s === 1).length;
          slotsProf += slotsDoDia;
       } else {
          // Se não tiver restrição granular, assume dia cheio
          slotsProf += numSlotsDia;
       }
    });

    const numTurmas = teacher.classAssignments.length;
    
    let totalAulasProf = 0;
    teacher.classAssignments.forEach(a => totalAulasProf += a.classCount);
    
    // Calcular quantos dias o professor precisaria estar disponível (estimativa)
    const diasNecessarios = Math.ceil(totalAulasProf / numSlotsDia);
    
    // REGRA 1: Slots insuficientes (crítico)
    if (totalAulasProf > slotsProf) {
      const diasFaltando = diasNecessarios - diasDisponiveis;
      const todosDias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
      const diasIndisponiveis = todosDias.filter(d => !teacher.availabilityDays.includes(d));
      
      problemas.push({
        tipo: 'CRITICO',
        categoria: 'DISPONIBILIDADE',
        mensagem: `${teacher.name} (${teacher.subject}): precisa de ${totalAulasProf} slots de aula, mas só tem ${slotsProf} slots livres (${diasDisponiveis} dias selecionados).`,
        detalhes: `Cálculo: (Dias × Aulas/Dia) - Bloqueios. Faltam ${totalAulasProf - slotsProf} slots. Libere mais horários ou dias.`
      });
      
      professoresComProblema.push({
        nome: teacher.name,
        subject: teacher.subject,
        aulas: totalAulasProf,
        slots: slotsProf,
        dias: teacher.availabilityDays,
        diasNecessarios,
        turmas: numTurmas
      });
    } 
    // REGRA 2: Professor em múltiplas turmas com poucos dias (crítico)
    // Um professor com N turmas precisa de pelo menos N dias para evitar bilocação
    // Ex: 3 turmas = precisa de pelo menos 3 dias de disponibilidade
    // REGRA 2: REMOVIDA
    // A verificação de "dias < turmas" era falha (falso positivo).
    // A capacidade já é garantida pela Regra 1 (TotalSlotsNeeded > TotalSlotsAvailable).
    // Se o professor tem 10 turmas de 1 aula, e 2 dias de 5 slots (10 slots), é viável.
    // A regra antiga bloquearia (2 dias < 10 turmas), o que está errado.
    
    // REGRA 2b (Adaptação): Verificar densidade Alta
    if (numTurmas >= 2 && (totalAulasProf / diasDisponiveis) > (numSlotsDia * 0.8)) {
       // Apenas um alerta se estiver MUITO apertado (ex: 90% ocupado em poucos dias)
       // Deixa passar, mas avisa.
    }
    // REGRA 2b: Mesmo com dias suficientes, verificar se há aulas demais por dia
    // Ex: 12 aulas em 3 dias = 4 aulas/dia, mas se tem 3 turmas = risco alto
    else if (numTurmas >= 2 && (totalAulasProf / diasDisponiveis) > (numSlotsDia * 0.6)) {
      const aulasPorDia = Math.ceil(totalAulasProf / diasDisponiveis);
      problemas.push({
        tipo: 'ALERTA',
        categoria: 'DISPONIBILIDADE',
        mensagem: `${teacher.name} (${teacher.subject}): ${numTurmas} turmas com ~${aulasPorDia} aulas/dia - risco de conflitos.`,
        detalhes: `RECOMENDAÇÃO: Adicione mais dias de disponibilidade para distribuir melhor as aulas entre turmas.`
      });
    }
    // REGRA 3: Alta ocupação (alerta)
    else if (totalAulasProf > slotsProf * 0.8) {
      const ocupacao = Math.round((totalAulasProf / slotsProf) * 100);
      problemas.push({
        tipo: 'ALERTA',
        categoria: 'DISPONIBILIDADE',
        mensagem: `${teacher.name} (${teacher.subject}): ${ocupacao}% da capacidade ocupada (${totalAulasProf} aulas em ${slotsProf} slots).`,
        detalhes: `ATENÇÃO: Alta ocupação pode dificultar a distribuição. Considere adicionar mais 1 dia de disponibilidade.`
      });
    }
    // REGRA 4: Múltiplas turmas com poucos dias relativos (alerta)
    else if (numTurmas >= 2 && diasDisponiveis <= 3 && totalAulasProf > slotsProf * 0.5) {
      problemas.push({
        tipo: 'ALERTA',
        categoria: 'DISPONIBILIDADE',
        mensagem: `${teacher.name} (${teacher.subject}): ${numTurmas} turmas com apenas ${diasDisponiveis} dias - risco de conflitos.`,
        detalhes: `RECOMENDAÇÃO: Adicione mais 1-2 dias para flexibilizar a distribuição entre turmas.`
      });
    }
  });

  // =====================================================
  // VERIFICAÇÃO 3: RISCO DE BILOCAÇÃO
  // =====================================================
  
  // Verificar se o mesmo professor leciona em múltiplas turmas
  const profMultiplasTurmas: Record<string, { turmas: Set<string>; dias: string[]; subject: string }> = {};
  
  teachers.forEach(teacher => {
    const key = teacher.name;
    if (!profMultiplasTurmas[key]) {
      profMultiplasTurmas[key] = { 
        turmas: new Set(), 
        dias: teacher.availabilityDays,
        subject: teacher.subject
      };
    }
    teacher.classAssignments.forEach(a => {
      profMultiplasTurmas[key].turmas.add(a.grade);
    });
  });

  Object.entries(profMultiplasTurmas).forEach(([prof, data]) => {
    if (data.turmas.size > 1) {
      const turmasArr = Array.from(data.turmas);
      let totalAulasSimultaneas = 0;
      
      // Coletar aulas por turma para análise detalhada
      const aulasPorTurmaProf: Record<string, number> = {};
      
      teachers
        .filter(t => t.name === prof)
        .forEach(t => {
          t.classAssignments.forEach(a => {
            totalAulasSimultaneas += a.classCount;
            aulasPorTurmaProf[a.grade] = (aulasPorTurmaProf[a.grade] || 0) + a.classCount;
          });
        });

      const diasDisponiveisProf = data.dias.length;
      
      // Recalcular slots exatos para verificação de bilocação
      let slotsDispProf = 0;
      teachers.filter(t => t.name === prof).forEach(t => {
           // Re-use logic or simply assume 'teacher' outer var is enough if names are unique, 
           // but 'teachers' passed to function might have duplicates if data structure changes.
           // Assuming 'teacher' from outer loop is the correct reference for availability.
           // We'll reuse the logic from above but since we are inside a different loop, we need to be careful.
           // Actually, 'data' comes from 'profMultiplasTurmas' which aggregates... wait.
           // Let's look up the teacher object again to be safe.
           const tObj = teachers.find(tr => tr.name === prof);
           if (tObj) {
              tObj.availabilityDays.forEach(day => {
                  const shortDay = dayNormalization[day.toLowerCase()];
                  if (shortDay && tObj.availability && tObj.availability[shortDay]) {
                      slotsDispProf += tObj.availability[shortDay].filter(s => s === 1).length;
                  } else {
                      slotsDispProf += numSlotsDia;
                  }
              });
           }
      });
      
      // NOVA VERIFICAÇÃO: Para professores em múltiplas turmas, 
      // cada aula de cada turma precisa de um slot ÚNICO
      // O professor não pode dar aula para 2 turmas ao mesmo tempo!
      const maxAulasMesmoDia = Math.max(...Object.values(aulasPorTurmaProf));
      const numTurmas = data.turmas.size;
      
      // Se o professor dá 4 aulas para a turma A e 4 para a turma B,
      // ele precisa de 8 slots únicos, não 4 slots compartilhados!
      if (totalAulasSimultaneas > slotsDispProf) {
        // Encontrar quais dias NÃO estão disponíveis para sugerir
        const todosDias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
        const diasIndisponiveis = todosDias.filter(d => !data.dias.includes(d));
        const diasNecessarios = Math.ceil(totalAulasSimultaneas / numSlotsDia);
        const diasFaltando = diasNecessarios - diasDisponiveisProf;
        
        problemas.push({
          tipo: 'CRITICO',
          categoria: 'BILOCACAO',
          mensagem: `${prof} (${data.subject}): leciona em ${numTurmas} turmas com ${totalAulasSimultaneas} aulas total, mas só disponibilizou ${slotsDispProf} horários.`,
          detalhes: diasIndisponiveis.length > 0 
            ? `SOLUÇÃO: Adicione ${diasFaltando} dia(s) como ${diasIndisponiveis.slice(0, Math.min(diasFaltando, 3)).join(', ')}, OU reduza a carga horária.`
            : `SOLUÇÃO: Reduza a carga horária em ${totalAulasSimultaneas - slotsDispProf} aulas, OU divida entre mais professores.`
        });
      } 
      // NOVA VERIFICAÇÃO: Bilocação por distribuição
      // Um professor com N turmas precisa de slots suficientes para NÃO dar aula para 2 turmas simultaneamente
      // Se ele dá muitas aulas por turma por dia, há risco de bilocação
      else {
        // Calcular se é possível distribuir as aulas sem bilocação
        // Cada turma precisa de seus próprios slots únicos por dia
        const maxAulasPorTurmaSomaDia = Math.max(...Object.values(aulasPorTurmaProf));
        
        // Verificar se em algum dia não há slots suficientes para todas as turmas
        // Se o professor tem 5 aulas para turma A e 4 para turma B, 
        // ele precisa de slots suficientes por dia para acomodar ambas alternadamente
        const aulasPorDiaNecessarias = Math.ceil(totalAulasSimultaneas / diasDisponiveisProf);
        
        if (aulasPorDiaNecessarias > numSlotsDia) {
          const todosDias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
          const diasIndisponiveis = todosDias.filter(d => !data.dias.includes(d));
          const diasNecessarios = Math.ceil(totalAulasSimultaneas / numSlotsDia);
          const diasFaltando = diasNecessarios - diasDisponiveisProf;
          
          problemas.push({
            tipo: 'CRITICO',
            categoria: 'BILOCACAO',
            mensagem: `${prof} (${data.subject}): precisa dar ${aulasPorDiaNecessarias} aulas/dia para ${numTurmas} turmas, mas só há ${numSlotsDia} períodos/dia.`,
            detalhes: diasIndisponiveis.length > 0
              ? `SOLUÇÃO: Adicione mais ${diasFaltando} dia(s) de disponibilidade (${diasIndisponiveis.slice(0, 2).join(', ')}) para distribuir melhor.`
              : `SOLUÇÃO: Reduza a carga horária ou divida entre mais professores.`
          });
        }
        // ALERTA: Mesmo quando cabe, verificar se há alta ocupação
        else if (totalAulasSimultaneas > slotsDispProf * 0.7) {
          // Alta ocupação com múltiplas turmas = alto risco de conflito
          problemas.push({
            tipo: 'ALERTA',
            categoria: 'BILOCACAO',
            mensagem: `${prof} (${data.subject}): alta ocupação (${Math.round(totalAulasSimultaneas/slotsDispProf*100)}%) em ${numTurmas} turmas - risco de conflitos.`,
            detalhes: `RECOMENDAÇÃO: Adicione mais 1-2 dias de disponibilidade para flexibilizar a distribuição.`
          });
        }
      }
    }
  });

  // =====================================================
  // VERIFICAÇÃO 4: DISTRIBUIÇÃO POR DIA (Corrigida)
  // =====================================================
  
  // Verificar se há professores com poucos dias que precisam dar muitas aulas por dia
  // A lógica anterior estava calculando errado a média.
  teachers.forEach(teacher => {
    const diasDisponiveis = teacher.availabilityDays.length;
    let totalAulasDoProf = 0; // Nome único para evitar colisão de escopo
    teacher.classAssignments.forEach(a => totalAulasDoProf += a.classCount);
    
    if (diasDisponiveis > 0) {
      // Se um professor tem 15 aulas e 2 dias disponíveis, média é 7.5 aulas/dia
      // Se numSlotsDia for 5, isso é impossível (7.5 > 5)
      const aulasPorDiaNecessarias = Math.ceil(totalAulasDoProf / diasDisponiveis);
      
      if (aulasPorDiaNecessarias > numSlotsDia) {
        problemas.push({
          tipo: 'CRITICO',
          categoria: 'DISTRIBUICAO',
          mensagem: `${teacher.name} (${teacher.subject}) precisaria dar ~${aulasPorDiaNecessarias} aulas/dia para cumprir a carga, mas só há ${numSlotsDia} períodos/dia.`,
          detalhes: `Cálculo: ${totalAulasDoProf} aulas / ${diasDisponiveis} dias = ${aulasPorDiaNecessarias.toFixed(1)} aulas/dia (Max: ${numSlotsDia}). Solução: Adicione mais dias.`
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
      sugestoes.push(`📅 OPÇÃO 1: Mude para "${presetNecessario.nome}" (${presetNecessario.aulasPorDia} períodos/dia) para comportar até ${presetNecessario.aulasSemanais} aulas/semana por turma.`);
    } else {
      sugestoes.push(`📅 OPÇÃO 1: A carga horária excede o máximo suportado (${PRESETS_HORARIOS[PRESETS_HORARIOS.length - 1].aulasSemanais} aulas). Reduza disciplinas.`);
    }
    sugestoes.push(`✂️ OPÇÃO 2: Reduza a carga horária de algumas disciplinas para caber no período atual.`);
  }

  if (problemasCriticos.some(p => p.categoria === 'DISPONIBILIDADE')) {
    // Encontrar professores com problemas específicos
    const profsComProblema = problemasCriticos
      .filter(p => p.categoria === 'DISPONIBILIDADE')
      .map(p => p.mensagem.split(':')[0])
      .slice(0, 3);
    
    sugestoes.push(`👨‍🏫 PROFESSORES COM DISPONIBILIDADE INSUFICIENTE: ${profsComProblema.join(', ')}.`);
    sugestoes.push(`📆 SOLUÇÃO: Edite estes professores e adicione mais dias de disponibilidade, OU reduza suas aulas.`);
  }

  if (problemasCriticos.some(p => p.categoria === 'BILOCACAO')) {
    const profsComBilocacao = problemasCriticos
      .filter(p => p.categoria === 'BILOCACAO')
      .map(p => p.mensagem.split(':')[0])
      .slice(0, 3);
    
    sugestoes.push(`🔄 PROFESSORES EM MÚLTIPLAS TURMAS: ${profsComBilocacao.join(', ')}.`);
    sugestoes.push(`⏰ SOLUÇÃO: Aumente a disponibilidade destes professores para cobrir todas as turmas sem conflito.`);
  }

  if (problemasCriticos.some(p => p.categoria === 'DISTRIBUICAO')) {
    sugestoes.push(`📊 DISTRIBUIÇÃO: Alguns professores precisam dar mais aulas/dia do que o período comporta. Adicione mais dias.`);
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
