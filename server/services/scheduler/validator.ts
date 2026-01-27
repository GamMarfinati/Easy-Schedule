/**
 * Fiscal de Grade - Serviço de Validação Algorítmica
 * 
 * Este serviço intercepta a resposta da IA ANTES de chegar ao Frontend,
 * garantindo que a grade gerada seja matematicamente correta.
 * 
 * Diferente do modelo de IA que "acha", este fiscal CALCULA.
 */

export interface Aula {
  disciplina: string;
  professor: string;
  dia: string;
  horario: number;    // 1 a N (número do período)
  turma: string;      // "1º Ano EM", "6º Ano EF", etc.
}

export interface ProfessorRegra {
  nome: string;
  disciplina: string;
  cargaHorariaPorTurma: Record<string, number>;  // { "1º Ano EM": 5, "2º Ano EM": 3 }
  diasDisponiveis: string[];
  restricoesGranulares?: Record<string, number[]>; // { "Seg": [1, 1, 0, 0] } (1=Livre, 0=Bloqueado)
}

export interface ValidacaoResultado {
  valido: boolean;
  erros: string[];
  estatisticas?: {
    totalAulasGeradas: number;
    totalAulasEsperadas: number;
    professorComErro: string[];
    turmasSemAula: string[];
  };
}

/**
 * Converte os dados de professores do formato de entrada para regras de validação
 */
export function converterParaRegras(teachers: any[]): ProfessorRegra[] {
  return teachers.map(teacher => {
    const cargaHorariaPorTurma: Record<string, number> = {};
    
    (teacher.classAssignments || []).forEach((assignment: any) => {
      cargaHorariaPorTurma[assignment.grade] = assignment.classCount;
    });

    return {
      nome: teacher.name,
      disciplina: teacher.subject,
      cargaHorariaPorTurma,
      diasDisponiveis: teacher.availabilityDays || [],
      restricoesGranulares: teacher.availability // Passar o objeto cru do frontend
    };
  });
}

/**
 * Converte o formato flat de resposta da IA para o formato unificado de Aula[]
 */
export function converterParaAulas(flatSchedule: any[]): Aula[] {
  return flatSchedule
    .filter(item => item && item.day && item.timeSlot && item.grade && item.subject && item.teacherName)
    .map((item, index) => ({
      disciplina: item.subject,
      professor: item.teacherName,
      dia: item.day,
      horario: extrairNumeroHorario(item.timeSlot, index),
      turma: item.grade
    }));
}

/**
 * Extrai o número do horário a partir do slot de tempo
 * Ex: "08:00-08:50" -> 1, "08:50-09:40" -> 2, etc.
 */
function extrairNumeroHorario(timeSlot: string, index: number): number {
  // Tenta extrair o número do horário baseado no padrão
  // Retorna o índice + 1 como fallback
  const match = timeSlot.match(/^(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return index + 1;
}

/**
 * FISCAL DE GRADE - Função Principal de Validação
 * 
 * Verifica três regras de negócio fundamentais:
 * 1. Contagem Exata: Sum(aulas_geradas) === carga_horaria_contratada
 * 2. Disponibilidade: dia_alocado IN dias_disponiveis_professor
 * 3. Anti-Colisão: professor_x NÃO pode estar em duas turmas no mesmo horário
 */
export function validarGrade(gradeUnificada: Aula[], regras: ProfessorRegra[]): ValidacaoResultado {
  const erros: string[] = [];
  const professorComErro: Set<string> = new Set();
  const turmasSemAula: Set<string> = new Set();
  
  let totalAulasGeradas = gradeUnificada.length;
  let totalAulasEsperadas = 0;

  // Calcular total esperado
  regras.forEach(prof => {
    Object.values(prof.cargaHorariaPorTurma).forEach(carga => {
      totalAulasEsperadas += carga;
    });
  });

  // =====================================================
  // 1. VALIDAÇÃO DE CARGA HORÁRIA E DISPONIBILIDADE
  // =====================================================
  regras.forEach(prof => {
    Object.keys(prof.cargaHorariaPorTurma).forEach(turma => {
      const cargaAlvo = prof.cargaHorariaPorTurma[turma];
      
      // Encontrar todas as aulas deste professor nesta turma
      const aulasReais = gradeUnificada.filter(aula => 
        aula.professor === prof.nome && aula.turma === turma
      );

      // CHECK 1: Matemática Exata da Carga Horária
      if (aulasReais.length !== cargaAlvo) {
        const diferenca = aulasReais.length - cargaAlvo;
        const direcao = diferenca > 0 ? 'a mais' : 'a menos';
        
        erros.push(
          `ERRO CRÍTICO DE CONTAGEM: ${prof.nome} (${prof.disciplina}) em ${turma} ` +
          `tem ${aulasReais.length} aulas alocadas, mas o correto é EXATAMENTE ${cargaAlvo}. ` +
          `(${Math.abs(diferenca)} ${direcao})`
        );
        professorComErro.add(prof.nome);
        
        if (aulasReais.length === 0) {
          turmasSemAula.add(turma);
        }
      }

      // CHECK 2: Validação de Dias Disponíveis
      aulasReais.forEach(aula => {
        if (!prof.diasDisponiveis.includes(aula.dia)) {
          erros.push(
            `VIOLAÇÃO DE DISPONIBILIDADE: ${prof.nome} foi alocado na ${aula.dia}, ` +
            `mas só está disponível em: ${prof.diasDisponiveis.join(', ')}. ` +
             `Turma: ${turma}, Horário: ${aula.horario}ª aula.`
          );
          professorComErro.add(prof.nome);
        } else if (prof.restricoesGranulares) {
           // Checagem Granular (se o dia for válido, mas o horário for bloqueado)
           // Converter dia 'seg' para chave da restrição 'Seg'
           // ACHAR A CHAVE CORRETA NO OBJETO DE RESTRIÇÃO
           // O formato no banco costuma ser "Seg", "Ter" (Capitalized), mas o aula.dia vem 'seg', 'ter' ou 'Segunda-feira'
           
           // Mapa auxiliar rápido
           const mapaDias: Record<string, string> = {
             'seg': 'Seg', 'ter': 'Ter', 'qua': 'Qua', 'qui': 'Qui', 'sex': 'Sex',
             'segunda-feira': 'Seg', 'terça-feira': 'Ter', 'quarta-feira': 'Qua', 'quinta-feira': 'Qui', 'sexta-feira': 'Sex'
           };

           const chaveDia = mapaDias[aula.dia.toLowerCase()];
           if (chaveDia && prof.restricoesGranulares[chaveDia]) {
              const slots = prof.restricoesGranulares[chaveDia];
              // slots array: 0 ou 1. aula.horario é 1-based index.
              const index = aula.horario - 1;
              
              // console.log(`[DEBUG VALIDATOR] Prof: ${prof.nome}, Dia: ${aula.dia} (${chaveDia}), Horario: ${aula.horario}, Value: ${slots[index]}`);

              if (slots[index] === 0) { // 0 significa BLOQUEADO
                 erros.push(
                   `VIOLAÇÃO DE HORÁRIO: ${prof.nome} não pode dar aula na ${aula.dia} no ${aula.horario}º horário. ` +
                   `Restrição específica definida.`
                 );
                 professorComErro.add(prof.nome);
              }
           }
        }
      });
    });
  });

  // =====================================================
  // 2. VALIDAÇÃO DE BILOCAÇÃO (ANTI-COLISÃO GLOBAL)
  // =====================================================
  // Agrupa por professor + dia + horário para detectar colisões
  const mapaOcupacao = new Map<string, Aula[]>();

  gradeUnificada.forEach(aula => {
    const chave = `${aula.professor}-${aula.dia}-${aula.horario}`;
    
    if (!mapaOcupacao.has(chave)) {
      mapaOcupacao.set(chave, []);
    }
    mapaOcupacao.get(chave)!.push(aula);
  });

  // Verificar cada slot de ocupação
  mapaOcupacao.forEach((aulas, chave) => {
    if (aulas.length > 1) {
      const [professor, dia, horario] = chave.split('-');
      const turmasEnvolvidas = aulas.map(a => a.turma);
      const turmasUnicas = [...new Set(turmasEnvolvidas)];

      if (turmasUnicas.length > 1) {
        erros.push(
          `COLISÃO DE BILOCAÇÃO: ${professor} está alocado SIMULTANEAMENTE em ` +
          `${turmasUnicas.length} turmas diferentes (${turmasUnicas.join(' e ')}) ` +
          `na ${dia}, ${horario}ª aula. Isso é fisicamente impossível!`
        );
        professorComErro.add(professor);
      }
    }
  });

  // =====================================================
  // 3. VALIDAÇÃO DE TURMA (UMA AULA POR VEZ)
  // =====================================================
  const mapaTurmaOcupacao = new Map<string, Aula[]>();

  gradeUnificada.forEach(aula => {
    const chave = `${aula.turma}-${aula.dia}-${aula.horario}`;
    
    if (!mapaTurmaOcupacao.has(chave)) {
      mapaTurmaOcupacao.set(chave, []);
    }
    mapaTurmaOcupacao.get(chave)!.push(aula);
  });

  mapaTurmaOcupacao.forEach((aulas, chave) => {
    if (aulas.length > 1) {
      const [turma, dia, horario] = chave.split('-');
      const professoresEnvolvidos = aulas.map(a => `${a.professor} (${a.disciplina})`);

      erros.push(
        `CONFLITO DE TURMA: A turma ${turma} tem ${aulas.length} aulas agendadas ` +
        `simultaneamente na ${dia}, ${horario}ª aula. ` +
        `Professores: ${professoresEnvolvidos.join(', ')}. Corrija para ter apenas UMA aula por slot.`
      );
    }
  });

  return {
    valido: erros.length === 0,
    erros,
    estatisticas: {
      totalAulasGeradas,
      totalAulasEsperadas,
      professorComErro: Array.from(professorComErro),
      turmasSemAula: Array.from(turmasSemAula)
    }
  };
}

/**
 * Gera um resumo formatado dos erros para enviar de volta à IA
 */
export function gerarPromptCorrecao(resultado: ValidacaoResultado): string {
  if (resultado.valido) {
    return '';
  }

  const header = `⚠️ ERROS DETECTADOS NA GRADE GERADA - CORREÇÃO OBRIGATÓRIA\n`;
  const stats = resultado.estatisticas 
    ? `\n📊 Estatísticas: ${resultado.estatisticas.totalAulasGeradas} aulas geradas vs ${resultado.estatisticas.totalAulasEsperadas} esperadas.\n`
    : '';
  
  const errosFormatados = resultado.erros.map((erro, idx) => `${idx + 1}. ${erro}`).join('\n');
  
  const instrucoes = `
\n📋 INSTRUÇÕES DE CORREÇÃO:
- Revise CADA erro listado acima
- Recalcule a contagem de aulas por professor/turma
- Verifique dias de disponibilidade antes de alocar
- Garanta que NENHUM professor esteja em duas turmas ao mesmo tempo
- Gere uma NOVA grade JSON corrigida

IMPORTANTE: Sua resposta deve ser APENAS o JSON corrigido, seguindo o mesmo schema.`;

  return header + stats + errosFormatados + instrucoes;
}

/**
 * Valida se todas as turmas têm todas as disciplinas necessárias
 */
export function validarCobertura(gradeUnificada: Aula[], regras: ProfessorRegra[]): string[] {
  const avisos: string[] = [];
  
  // Construir mapa de turma -> disciplinas necessárias
  const turmaDisciplinas = new Map<string, Set<string>>();
  
  regras.forEach(prof => {
    Object.keys(prof.cargaHorariaPorTurma).forEach(turma => {
      if (!turmaDisciplinas.has(turma)) {
        turmaDisciplinas.set(turma, new Set());
      }
      turmaDisciplinas.get(turma)!.add(prof.disciplina);
    });
  });

  // Verificar cobertura
  turmaDisciplinas.forEach((disciplinasNecessarias, turma) => {
    const disciplinasAlocadas = new Set(
      gradeUnificada.filter(a => a.turma === turma).map(a => a.disciplina)
    );

    disciplinasNecessarias.forEach(disciplina => {
      if (!disciplinasAlocadas.has(disciplina)) {
        avisos.push(
          `AVISO: A turma ${turma} não tem nenhuma aula de ${disciplina} alocada.`
        );
      }
    });
  });

  return avisos;
}
