/**
 * Adaptador para converter dados do Frontend para o formato do Scheduler
 * e converter a saída de volta para o formato esperado pelo Frontend.
 */

import { ScheduleInput, ScheduleSolution, Lesson, Teacher as GATeacher, ClassGroup, TimeSlot } from './types.js';
import { GeneticScheduler } from './algorithm.js'; // This is now the Strict CSP Solver
import { validarGrade, converterParaRegras, Aula, ProfessorRegra, ValidacaoResultado } from './validator.js';

// Tipos do Frontend (simplificados)
interface FrontendClassAssignment {
  id: string;
  grade: string;
  classCount: number;
}

interface FrontendTeacher {
  id: string;
  name: string;
  subject: string;
  availabilityDays: string[];
  availability?: Record<string, number[]>; // Novo campo JSONB: { 'Seg': [0,1,1...], ... }
  classAssignments: FrontendClassAssignment[];
}

// Mapeamento de dias para formato curto
const DAY_MAP: Record<string, string> = {
  'Segunda-feira': 'seg',
  'Terça-feira': 'ter',
  'Quarta-feira': 'qua',
  'Quinta-feira': 'qui',
  'Sexta-feira': 'sex'
};

const DAY_MAP_REVERSE: Record<string, string> = {
  'seg': 'Segunda-feira',
  'ter': 'Terça-feira',
  'qua': 'Quarta-feira',
  'qui': 'Quinta-feira',
  'sex': 'Sexta-feira'
};

const DAYS_SHORT = ['seg', 'ter', 'qua', 'qui', 'sex'];
const DAYS_FULL = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

const PAUSE_KEYWORDS = ['intervalo', 'almoço', 'almoco', 'recreio', 'pausa', 'lanche'];

/**
 * Returns the indices of time slots that are NOT pauses/intervals.
 */
export function getValidSlotIndices(timeSlots: string[]): number[] {
  return timeSlots.reduce((indices, slot, index) => {
    if (!PAUSE_KEYWORDS.some(keyword => slot.toLowerCase().includes(keyword))) {
      indices.push(index);
    }
    return indices;
  }, [] as number[]);
}

/**
 * Normalizes availability mask by keeping only values corresponding to valid slots.
 * Returns a new availability object where masks align 1:1 with logical periods.
 */
export function normalizeAvailability(
  availability: Record<string, number[]> | undefined,
  validIndices: number[]
): Record<string, number[]> | undefined {
  if (!availability) return undefined;

  const normalized: Record<string, number[]> = {};
  Object.entries(availability).forEach(([day, mask]) => {
    // Map valid indices to create a compacted mask
    // If original mask is shorter or undefined at index, default to 1 (Available)
    const newMask = validIndices.map(index => {
      const val = mask[index];
      return val === undefined ? 1 : val;
    });
    normalized[day] = newMask;
  });
  return normalized;
}

/**
 * Converte dados do formato Frontend para o formato esperado pelo Scheduler
 */
export function convertToGeneticInput(
  frontendTeachers: FrontendTeacher[],
  timeSlots: string[]
): ScheduleInput {

  const validIndices = getValidSlotIndices(timeSlots);

  // Filtrar validSlots names for display/reverse mapping
  const validSlots = timeSlots.filter((_, idx) => validIndices.includes(idx));
  
  const numPeriods = validSlots.length;

  // Extrair todas as turmas únicas
  const gradesSet = new Set<string>();
  frontendTeachers.forEach(t => {
    t.classAssignments.forEach(a => gradesSet.add(a.grade));
  });
  const grades = Array.from(gradesSet);

  // Criar professores no formato do algoritmo
  const gaTeachers: GATeacher[] = frontendTeachers.map(t => {
    const disponibility: TimeSlot[] = [];

    // Normalizar mapa de disponibilidade granular (se existir)
    const granularAvailability = new Map<string, number[]>();
    if (t.availability) {
      Object.entries(t.availability).forEach(([dayKey, slotsMask]) => {
        const shortDay = dayKey.toLowerCase().substring(0, 3);
        if (DAYS_SHORT.includes(shortDay)) {
          granularAvailability.set(shortDay, slotsMask);
        }
      });
    }

    // LISTA MESTRE: availabilityDays
    // Para cada dia que o professor diz que trabalha:
    t.availabilityDays.forEach(day => {
       const shortDay = DAY_MAP[day] || day.substring(0, 3).toLowerCase();
       
       // Verificamos se há restrição granular (fine-tuning) para este dia
       if (granularAvailability.has(shortDay)) {
          const slotsMask = granularAvailability.get(shortDay)!;

          // FIX: Iterate through logical periods and map back to original indices
          for (let period = 1; period <= numPeriods; period++) {
             const originalIndex = validIndices[period - 1];
             const isAvailable = slotsMask[originalIndex];

             // Treat undefined as 1 (Available), only 0 is Explicitly Blocked
             if (isAvailable !== 0) {
                disponibility.push({ day: shortDay, period });
             }
          }
       } else {
          // Se NÃO tem restrição granular, assume dia cheio (fallback padrão)
          for (let period = 1; period <= numPeriods; period++) {
             disponibility.push({ day: shortDay, period });
          }
       }
    });

    return {
      id: t.id,
      name: t.name,
      disponibility
    };
  });

  // Criar turmas com suas disciplinas
  const classes: ClassGroup[] = grades.map((grade, idx) => {
    // Para cada turma, encontrar todas as disciplinas e professores
    const subjects = frontendTeachers
      .filter(t => t.classAssignments.some(a => a.grade === grade))
      .map(t => {
        const assignment = t.classAssignments.find(a => a.grade === grade);
        return {
          name: t.subject,
          teacher_id: t.id,
          hours_per_week: assignment?.classCount || 0
        };
      })
      .filter(s => s.hours_per_week > 0);

    return {
      id: `class-${idx}`,
      name: grade,
      year: idx + 1,
      subjects
    };
  });

  return {
    name: 'Grade Horária',
    periods: numPeriods,
    days: DAYS_SHORT,
    teachers: gaTeachers,
    classes,
    classrooms: [], // Não usado no momento
    preferences: {
      min_gaps: true,
      group_labs: false
    },
    // Guardar mapeamento de slots válidos para reconstrução
    validSlotIndices: validIndices,
    validSlotNames: validSlots
  } as ScheduleInput & { validSlotIndices: number[]; validSlotNames: string[] };
}

/**
 * Converte a saída do algoritmo para o formato esperado pelo Frontend
 */
export function convertFromGeneticOutput(
  solution: ScheduleSolution,
  input: ScheduleInput & { validSlotNames?: string[] },
  frontendTeachers: FrontendTeacher[],
  timeSlots: string[]
): any[] {
  // Criar mapa de teacher_id -> nome e disciplina
  const teacherMap = new Map<string, { name: string; subject: string }>();
  frontendTeachers.forEach(t => {
    teacherMap.set(t.id, { name: t.name, subject: t.subject });
  });

  // Criar mapa de class_id -> nome da turma
  const classMap = new Map<string, string>();
  input.classes.forEach(c => {
    classMap.set(c.id, c.name);
  });

  // Filtrar slots de pausa para mapeamento correto
  const validSlots = input.validSlotNames || timeSlots.filter(slot => 
    !PAUSE_KEYWORDS.some(keyword => slot.toLowerCase().includes(keyword))
  );

  // Converter lessons para formato flat
  return solution.schedule.map(lesson => {
    const teacher = teacherMap.get(lesson.teacher_id);
    const gradeName = classMap.get(lesson.class_id);
    const dayFull = DAY_MAP_REVERSE[lesson.day] || lesson.day;
    // Período 1 no algoritmo = primeiro slot válido (não pausa)
    const timeSlot = validSlots[lesson.period - 1] || `Período ${lesson.period}`;

    return {
      day: dayFull,
      timeSlot,
      grade: gradeName,
      subject: lesson.subject,
      teacherName: teacher?.name || 'Professor Desconhecido',
      conflict: lesson.conflict // Pass conflict info to frontend
    };
  });
}

/**
 * Converte a saída do algoritmo para Aula[] para validação
 */
export function convertToValidatorFormat(
  solution: ScheduleSolution,
  input: ScheduleInput,
  frontendTeachers: FrontendTeacher[]
): Aula[] {
  // Criar mapa de teacher_id -> nome
  const teacherMap = new Map<string, string>();
  frontendTeachers.forEach(t => {
    teacherMap.set(t.id, t.name);
  });

  // Criar mapa de class_id -> nome da turma
  const classMap = new Map<string, string>();
  input.classes.forEach(c => {
    classMap.set(c.id, c.name);
  });

  return solution.schedule.map(lesson => ({
    disciplina: lesson.subject,
    professor: teacherMap.get(lesson.teacher_id) || 'Desconhecido',
    dia: DAY_MAP_REVERSE[lesson.day] || lesson.day,
    horario: lesson.period,
    turma: classMap.get(lesson.class_id) || 'Turma Desconhecida'
  }));
}

/**
 * Executa o algoritmo (agora Estrito/CSP) com validação integrada
 */
export function runGeneticScheduler(
  frontendTeachers: FrontendTeacher[],
  timeSlots: string[],
  options: {
    populationSize?: number;
    generations?: number;
    maxAttempts?: number;
  } = {}
): {
  success: boolean;
  schedule: any[] | null;
  attempts: number;
  bestScore: number;
  validationResult: ValidacaoResultado | null;
  conflicts?: any[];
} {
  // Options mostly ignored now as CSP is deterministic (mostly) and strict
  const {
    maxAttempts = 1 // Deterministic, so 1 attempt is usually enough unless we implement randomized ordering
  } = options;

  console.log(`[StrictScheduler] Iniciando com ${frontendTeachers.length} professores`);

  // Pre-calculate valid indices
  const validIndices = getValidSlotIndices(timeSlots);

  // Create normalized teachers for Validator (so restricoesGranulares matches periods)
  const normalizedTeachersForValidator = frontendTeachers.map(t => ({
    ...t, // copy other props
    availability: normalizeAvailability(t.availability, validIndices)
  }));

  // Converter dados
  const input = convertToGeneticInput(frontendTeachers, timeSlots);
  const regras = converterParaRegras(normalizedTeachersForValidator.map(t => ({
    name: t.name,
    subject: t.subject,
    availabilityDays: t.availabilityDays,
    availability: t.availability, // PASSAR A DISPONIBILIDADE NORMALIZADA (já feito no map acima)
    classAssignments: t.classAssignments.map(a => ({ grade: a.grade, classCount: a.classCount }))
  })));

  // Criar scheduler
  const scheduler = new GeneticScheduler(input); // Using Strict CSP Solver now

  const solutions = scheduler.generate();

  if (solutions.length === 0) {
    // Should not happen now as we return partial solutions
    console.log(`[StrictScheduler] Erro inesperado: Nenhuma solução gerada.`);
    return {
      success: false,
      schedule: null,
      attempts: 1,
      bestScore: 0,
      validationResult: { valido: false, erros: ['Erro interno: algoritmo não retornou resultado.'] }
    };
  }

  // Pegar a primeira solução
  const bestSolution = solutions[0];
  const hasConflicts = (bestSolution.conflicts && bestSolution.conflicts.length > 0);

  if (hasConflicts) {
      console.log(`[StrictScheduler] ⚠️ Solução parcial encontrada com ${bestSolution.conflicts?.length} conflitos.`);
  } else {
      console.log(`[StrictScheduler] ✅ Solução perfeita encontrada!`);
  }

  const flatSchedule = convertFromGeneticOutput(bestSolution, input, frontendTeachers, timeSlots);
  
  // Validate just to be sure and get formatted errors if any
  const aulas = convertToValidatorFormat(bestSolution, input, frontendTeachers);
  const validation = validarGrade(aulas, regras);

  return {
    success: true, // Always success now, even with conflicts
    schedule: flatSchedule,
    attempts: 1,
    bestScore: bestSolution.score,
    validationResult: validation,
    conflicts: bestSolution.conflicts
  };
}
