/**
 * Adaptador para converter dados do Frontend para o formato do Algoritmo Genético
 * e converter a saída de volta para o formato esperado pelo Frontend.
 */

import { ScheduleInput, ScheduleSolution, Lesson, Teacher as GATeacher, ClassGroup, TimeSlot } from './types.js';
import { GeneticScheduler } from './algorithm.js';
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

/**
 * Converte dados do formato Frontend para o formato esperado pelo GeneticScheduler
 */
export function convertToGeneticInput(
  frontendTeachers: FrontendTeacher[],
  timeSlots: string[]
): ScheduleInput {
  // Filtrar slots de pausa (Intervalo, Almoço, etc.)
  const pauseKeywords = ['intervalo', 'almoço', 'almoco', 'recreio', 'pausa', 'lanche'];
  const validSlots = timeSlots.filter(slot => 
    !pauseKeywords.some(keyword => slot.toLowerCase().includes(keyword))
  );
  
  const numPeriods = validSlots.length;

  // Extrair todas as turmas únicas
  const gradesSet = new Set<string>();
  frontendTeachers.forEach(t => {
    t.classAssignments.forEach(a => gradesSet.add(a.grade));
  });
  const grades = Array.from(gradesSet);

  // Criar professores no formato do algoritmo genético
  const gaTeachers: GATeacher[] = frontendTeachers.map(t => {
    // Converter dias disponíveis para TimeSlots
    const disponibility: TimeSlot[] = [];
    t.availabilityDays.forEach(day => {
      const shortDay = DAY_MAP[day] || day.substring(0, 3).toLowerCase();
      for (let period = 1; period <= numPeriods; period++) {
        disponibility.push({ day: shortDay, period });
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
    validSlotIndices: validSlots.map((_, i) => i),
    validSlotNames: validSlots
  } as ScheduleInput & { validSlotIndices: number[]; validSlotNames: string[] };
}

/**
 * Converte a saída do algoritmo genético para o formato esperado pelo Frontend
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
  const pauseKeywords = ['intervalo', 'almoço', 'almoco', 'recreio', 'pausa', 'lanche'];
  const validSlots = input.validSlotNames || timeSlots.filter(slot => 
    !pauseKeywords.some(keyword => slot.toLowerCase().includes(keyword))
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
      teacherName: teacher?.name || 'Professor Desconhecido'
    };
  });
}

/**
 * Converte a saída do algoritmo genético para Aula[] para validação
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
 * Executa o algoritmo genético com validação integrada
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
} {
  const {
    populationSize = 200,  // Aumentado de 100 para 200
    generations = 500,     // Aumentado de 200 para 500
    maxAttempts = 50       // Aumentado de 3 para 50
  } = options;

  console.log(`[GeneticScheduler] Iniciando com ${frontendTeachers.length} professores`);
  console.log(`[GeneticScheduler] Config: population=${populationSize}, generations=${generations}`);

  // Converter dados
  const gaInput = convertToGeneticInput(frontendTeachers, timeSlots);
  const regras = converterParaRegras(frontendTeachers.map(t => ({
    name: t.name,
    subject: t.subject,
    availabilityDays: t.availabilityDays,
    classAssignments: t.classAssignments.map(a => ({ grade: a.grade, classCount: a.classCount }))
  })));

  let bestSolution: ScheduleSolution | null = null;
  let bestValidation: ValidacaoResultado = { valido: false, erros: [] };
  let bestScore = -Infinity;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[GeneticScheduler] Tentativa ${attempt}/${maxAttempts}`);

    // Criar scheduler com parâmetros configuráveis
    const scheduler = new GeneticSchedulerEnhanced(gaInput, {
      populationSize,
      generations,
      mutationRate: 0.15 + (attempt * 0.05) // Aumenta mutação a cada tentativa
    });

    const solutions = scheduler.generate();

    if (solutions.length === 0) {
      console.log(`[GeneticScheduler] Nenhuma solução gerada na tentativa ${attempt}`);
      continue;
    }

    // Avaliar cada solução com o validador
    for (const solution of solutions) {
      const aulas = convertToValidatorFormat(solution, gaInput, frontendTeachers);
      const validation = validarGrade(aulas, regras);

      if (validation.valido) {
        console.log(`[GeneticScheduler] ✅ Solução válida encontrada na tentativa ${attempt}!`);
        const flatSchedule = convertFromGeneticOutput(solution, gaInput, frontendTeachers, timeSlots);
        return {
          success: true,
          schedule: flatSchedule,
          attempts: attempt,
          bestScore: solution.score,
          validationResult: validation
        };
      }

      // Guardar a melhor solução mesmo inválida
      if (solution.score > bestScore) {
        bestScore = solution.score;
        bestSolution = solution;
        bestValidation = validation;
      }
    }

    console.log(`[GeneticScheduler] Tentativa ${attempt} falhou com ${bestValidation.erros.length} erros`);
  }

  // Retornar melhor solução encontrada (mesmo inválida) para feedback
  console.log(`[GeneticScheduler] ❌ Falha após ${maxAttempts} tentativas`);
  
  return {
    success: false,
    schedule: bestSolution 
      ? convertFromGeneticOutput(bestSolution, gaInput, frontendTeachers, timeSlots)
      : null,
    attempts: maxAttempts,
    bestScore,
    validationResult: bestValidation
  };
}

/**
 * Versão melhorada do GeneticScheduler com parâmetros configuráveis
 * e heurísticas mais inteligentes
 */
class GeneticSchedulerEnhanced {
  private input: ScheduleInput;
  private populationSize: number;
  private generations: number;
  private mutationRate: number;

  constructor(
    input: ScheduleInput, 
    options: { populationSize?: number; generations?: number; mutationRate?: number } = {}
  ) {
    this.input = input;
    this.populationSize = options.populationSize || 100;
    this.generations = options.generations || 200;
    this.mutationRate = options.mutationRate || 0.15;
  }

  public generate(): ScheduleSolution[] {
    let population = this.initializePopulation();
    
    for (let gen = 0; gen < this.generations; gen++) {
      population.sort((a, b) => b.score - a.score);
      
      // Elitism: keep top 15%
      const eliteCount = Math.max(2, Math.floor(this.populationSize * 0.15));
      const newPopulation = population.slice(0, eliteCount);
      
      while (newPopulation.length < this.populationSize) {
        const parent1 = this.selectParent(population);
        const parent2 = this.selectParent(population);
        let child = this.crossover(parent1, parent2);
        
        if (Math.random() < this.mutationRate) {
          child = this.mutate(child);
        }
        
        // Aplicar reparação de conflitos
        child = this.repair(child);
        child.score = this.calculateFitness(child.schedule);
        newPopulation.push(child);
      }
      
      population = newPopulation;
      
      // Early termination se encontrar solução perfeita
      if (population[0].score >= 100) {
        break;
      }
    }

    // Return top 5 unique solutions
    return population.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  private initializePopulation(): ScheduleSolution[] {
    const population: ScheduleSolution[] = [];
    
    for (let i = 0; i < this.populationSize; i++) {
      // Alternar entre geração aleatória e heurística
      const schedule = i % 2 === 0 
        ? this.generateSmartSchedule()
        : this.generateRandomSchedule();
      
      population.push({
        schedule,
        score: this.calculateFitness(schedule)
      });
    }
    
    return population;
  }

  /**
   * Gera uma grade inicial usando heurística (respeita disponibilidade)
   */
  private generateSmartSchedule(): Lesson[] {
    const lessons: Lesson[] = [];
    const occupiedSlots = new Map<string, Set<string>>(); // day-period -> Set<teacher_id | class_id>
    
    // Inicializar mapa de slots ocupados
    this.input.days.forEach(day => {
      for (let p = 1; p <= this.input.periods; p++) {
        occupiedSlots.set(`${day}-${p}`, new Set());
      }
    });

    this.input.classes.forEach(cls => {
      cls.subjects.forEach(sub => {
        const teacher = this.input.teachers.find(t => t.id === sub.teacher_id);
        let assignedCount = 0;

        // Tentar atribuir aulas respeitando disponibilidade E preferindo slots consecutivos
        for (let attempt = 0; attempt < sub.hours_per_week * 10 && assignedCount < sub.hours_per_week; attempt++) {
          // Escolher slot disponível
          const availableSlots = teacher?.disponibility || [];
          
          if (availableSlots.length === 0) {
            // Fallback: slot aleatório se não há disponibilidade
            const day = this.input.days[Math.floor(Math.random() * this.input.days.length)];
            const period = Math.floor(Math.random() * this.input.periods) + 1;
            
            lessons.push({
              day,
              period,
              class_id: cls.id,
              subject: sub.name,
              teacher_id: sub.teacher_id,
            });
            assignedCount++;
            continue;
          }

          // Agrupar slots por dia para preferir consecutivos
          const slotsByDay = new Map<string, { day: string; period: number }[]>();
          availableSlots.forEach(slot => {
            if (!slotsByDay.has(slot.day)) {
              slotsByDay.set(slot.day, []);
            }
            slotsByDay.get(slot.day)!.push(slot);
          });
          
          // Ordenar slots de cada dia por período
          slotsByDay.forEach(slots => slots.sort((a, b) => a.period - b.period));
          
          // Priorizar dias onde já temos aulas deste professor (para agrupar)
          const daysWithLessons = lessons
            .filter(l => l.teacher_id === sub.teacher_id)
            .map(l => l.day);
          
          const dayOrder = [...slotsByDay.keys()].sort((a, b) => {
            const aCount = daysWithLessons.filter(d => d === a).length;
            const bCount = daysWithLessons.filter(d => d === b).length;
            return bCount - aCount; // Dias com mais aulas primeiro
          });
          
          let allocated = false;
          
          for (const targetDay of dayOrder) {
            const daySlots = slotsByDay.get(targetDay) || [];
            
            // Encontrar slots consecutivos aos já alocados neste dia
            const existingPeriods = lessons
              .filter(l => l.teacher_id === sub.teacher_id && l.day === targetDay)
              .map(l => l.period)
              .sort((a, b) => a - b);
            
            // Se já tem aulas neste dia, preferir slot adjacente
            const preferredPeriods: number[] = [];
            if (existingPeriods.length > 0) {
              const minP = Math.min(...existingPeriods);
              const maxP = Math.max(...existingPeriods);
              if (minP > 1) preferredPeriods.push(minP - 1);
              if (maxP < this.input.periods) preferredPeriods.push(maxP + 1);
            }
            
            // Tentar primeiro os slots adjacentes
            for (const slot of daySlots) {
              if (preferredPeriods.includes(slot.period) || preferredPeriods.length === 0) {
                const key = `${slot.day}-${slot.period}`;
                const occupied = occupiedSlots.get(key)!;
                
                if (!occupied.has(sub.teacher_id) && !occupied.has(cls.id)) {
                  lessons.push({
                    day: slot.day,
                    period: slot.period,
                    class_id: cls.id,
                    subject: sub.name,
                    teacher_id: sub.teacher_id,
                  });
                  
                  occupied.add(sub.teacher_id);
                  occupied.add(cls.id);
                  assignedCount++;
                  allocated = true;
                  break;
                }
              }
            }
            
            if (allocated) break;
            
            // Fallback: qualquer slot disponível neste dia
            for (const slot of daySlots) {
              const key = `${slot.day}-${slot.period}`;
              const occupied = occupiedSlots.get(key)!;
              
              if (!occupied.has(sub.teacher_id) && !occupied.has(cls.id)) {
                lessons.push({
                  day: slot.day,
                  period: slot.period,
                  class_id: cls.id,
                  subject: sub.name,
                  teacher_id: sub.teacher_id,
                });
                
                occupied.add(sub.teacher_id);
                occupied.add(cls.id);
                assignedCount++;
                allocated = true;
                break;
              }
            }
            
            if (allocated) break;
          }
        }

        // Preencher aulas faltantes com slots aleatórios
        while (assignedCount < sub.hours_per_week) {
          const day = this.input.days[Math.floor(Math.random() * this.input.days.length)];
          const period = Math.floor(Math.random() * this.input.periods) + 1;
          
          lessons.push({
            day,
            period,
            class_id: cls.id,
            subject: sub.name,
            teacher_id: sub.teacher_id,
          });
          assignedCount++;
        }
      });
    });
    
    return lessons;
  }

  private generateRandomSchedule(): Lesson[] {
    const lessons: Lesson[] = [];
    
    this.input.classes.forEach(cls => {
      cls.subjects.forEach(sub => {
        for (let i = 0; i < sub.hours_per_week; i++) {
          const randomDay = this.input.days[Math.floor(Math.random() * this.input.days.length)];
          const randomPeriod = Math.floor(Math.random() * this.input.periods) + 1;
          
          lessons.push({
            day: randomDay,
            period: randomPeriod,
            class_id: cls.id,
            subject: sub.name,
            teacher_id: sub.teacher_id,
          });
        }
      });
    });
    
    return lessons;
  }

  /**
   * Tenta reparar conflitos na solução
   */
  private repair(solution: ScheduleSolution): ScheduleSolution {
    const schedule = [...solution.schedule];
    const maxRepairs = 50;
    
    for (let i = 0; i < maxRepairs; i++) {
      // Encontrar conflitos
      const conflicts = this.findConflicts(schedule);
      if (conflicts.length === 0) break;
      
      // Tentar mover uma aula conflitante
      const conflictIdx = conflicts[Math.floor(Math.random() * conflicts.length)];
      const lesson = schedule[conflictIdx];
      
      // Encontrar novo slot
      const teacher = this.input.teachers.find(t => t.id === lesson.teacher_id);
      const availableSlots = teacher?.disponibility || [];
      
      if (availableSlots.length > 0) {
        const newSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
        schedule[conflictIdx] = { ...lesson, day: newSlot.day, period: newSlot.period };
      } else {
        // Fallback aleatório
        schedule[conflictIdx] = {
          ...lesson,
          day: this.input.days[Math.floor(Math.random() * this.input.days.length)],
          period: Math.floor(Math.random() * this.input.periods) + 1
        };
      }
    }
    
    return { schedule, score: 0 };
  }

  private findConflicts(schedule: Lesson[]): number[] {
    const conflicts: number[] = [];
    const teacherOccupancy = new Map<string, number>();
    const classOccupancy = new Map<string, number>();
    
    schedule.forEach((lesson, idx) => {
      const teacherKey = `${lesson.teacher_id}-${lesson.day}-${lesson.period}`;
      const classKey = `${lesson.class_id}-${lesson.day}-${lesson.period}`;
      
      if (teacherOccupancy.has(teacherKey) || classOccupancy.has(classKey)) {
        conflicts.push(idx);
      }
      
      teacherOccupancy.set(teacherKey, idx);
      classOccupancy.set(classKey, idx);
    });
    
    return conflicts;
  }

  private calculateFitness(schedule: Lesson[]): number {
    let score = 100;
    
    // Constraint 1: Teacher conflict (same teacher in 2 places at once) - HARD
    const teacherConflicts = this.countConflicts(schedule, 'teacher_id');
    score -= teacherConflicts * 15;

    // Constraint 2: Class conflict (same class has 2 lessons at once) - HARD
    const classConflicts = this.countConflicts(schedule, 'class_id');
    score -= classConflicts * 15;

    // Constraint 3: Teacher availability - MEDIUM
    schedule.forEach(lesson => {
      const teacher = this.input.teachers.find(t => t.id === lesson.teacher_id);
      if (teacher && teacher.disponibility.length > 0) {
        const isAvailable = teacher.disponibility.some(slot => 
          slot.day === lesson.day && slot.period === lesson.period
        );
        if (!isAvailable) score -= 8;
      }
    });

    // Constraint 4: GAPS (janelas) - Penalizar aulas não consecutivas do mesmo professor
    // Agrupa aulas por professor-dia
    const teacherDayLessons = new Map<string, number[]>();
    schedule.forEach(lesson => {
      const key = `${lesson.teacher_id}-${lesson.day}`;
      if (!teacherDayLessons.has(key)) {
        teacherDayLessons.set(key, []);
      }
      teacherDayLessons.get(key)!.push(lesson.period);
    });
    
    // Para cada professor-dia, contar gaps
    let totalGaps = 0;
    teacherDayLessons.forEach((periods, key) => {
      if (periods.length > 1) {
        periods.sort((a, b) => a - b);
        for (let i = 1; i < periods.length; i++) {
          const gap = periods[i] - periods[i-1] - 1;
          if (gap > 0) {
            totalGaps += gap;
          }
        }
      }
    });
    
    // Penalizar gaps: cada período vago custa 5 pontos (aumentado)
    score -= totalGaps * 5;

    // Constraint 5: CONCENTRAÇÃO DE AULAS - Calcular dias MÍNIMOS necessários
    // Se um professor tem 12 aulas e cabem 6/dia, ele deve trabalhar 2 dias, não 5!
    const teacherDayCount = new Map<string, number>();
    const teacherTotalLessons = new Map<string, number>();
    
    schedule.forEach(lesson => {
      const key = `${lesson.teacher_id}-${lesson.day}`;
      teacherDayCount.set(key, (teacherDayCount.get(key) || 0) + 1);
      teacherTotalLessons.set(lesson.teacher_id, (teacherTotalLessons.get(lesson.teacher_id) || 0) + 1);
    });
    
    // Calcular quantos dias cada professor trabalha
    const teacherDays = new Map<string, number>();
    teacherDayCount.forEach((count, key) => {
      const teacherId = key.split('-')[0];
      teacherDays.set(teacherId, (teacherDays.get(teacherId) || 0) + 1);
    });
    
    let concentrationScore = 0;
    const periodsPerDay = this.input.periods; // aulas por dia
    
    teacherTotalLessons.forEach((totalLessons, teacherId) => {
      const actualDays = teacherDays.get(teacherId) || 1;
      // Calcular o número MÍNIMO de dias necessários
      const minDaysNeeded = Math.ceil(totalLessons / periodsPerDay);
      
      // BÔNUS se está usando o mínimo de dias necessário
      if (actualDays === minDaysNeeded) {
        concentrationScore += 15; // Grande bônus por eficiência
      }
      // Pequeno bônus se está usando 1 dia a mais que o mínimo
      else if (actualDays === minDaysNeeded + 1) {
        concentrationScore += 5;
      }
      // PENALIDADE por cada dia extra além do mínimo
      else if (actualDays > minDaysNeeded + 1) {
        const extraDays = actualDays - minDaysNeeded;
        concentrationScore -= extraDays * 8;
      }
    });
    
    score += concentrationScore;
    
    // Constraint 6: Penalizar dias com POUCAS aulas (ainda importante)
    let lowDayPenalty = 0;
    let highDayBonus = 0;
    
    teacherDayCount.forEach((count, key) => {
      // Penalizar dias com apenas 1 aula (muito ruim)
      if (count === 1) {
        lowDayPenalty += 10; // Penalidade MUITO alta
      }
      // Penalizar dias com 2 aulas (ruim)
      else if (count === 2) {
        lowDayPenalty += 5;
      }
      // Bônus para dias cheios (5-6 aulas)
      if (count >= 5) {
        highDayBonus += 5;
      } else if (count >= 4) {
        highDayBonus += 3;
      }
    });
    
    score -= lowDayPenalty;
    score += highDayBonus;

    // Bonus: Distribuição equilibrada de aulas por dia (global da escola)
    const lessonsPerDay = new Map<string, number>();
    schedule.forEach(l => {
      lessonsPerDay.set(l.day, (lessonsPerDay.get(l.day) || 0) + 1);
    });
    
    const values = Array.from(lessonsPerDay.values());
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
      score += Math.max(0, 10 - variance); // Bonus por distribuição equilibrada
    }
    
    // Bonus: Aulas consecutivas do mesmo professor (compactação)
    let consecutiveBonus = 0;
    teacherDayLessons.forEach(periods => {
      if (periods.length > 1) {
        periods.sort((a, b) => a - b);
        for (let i = 1; i < periods.length; i++) {
          if (periods[i] - periods[i-1] === 1) {
            consecutiveBonus += 2; // Bônus por cada par consecutivo
          }
        }
      }
    });
    score += consecutiveBonus;

    return Math.max(0, score);
  }

  private countConflicts(schedule: Lesson[], key: keyof Lesson): number {
    let conflicts = 0;
    const groups = new Map<string, Lesson[]>();

    schedule.forEach(l => {
      const k = `${l[key]}-${l.day}-${l.period}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(l);
    });

    groups.forEach(lessons => {
      if (lessons.length > 1) conflicts += lessons.length - 1;
    });

    return conflicts;
  }

  private selectParent(population: ScheduleSolution[]): ScheduleSolution {
    // Tournament selection with k=5
    const k = 5;
    let best = population[Math.floor(Math.random() * population.length)];
    for (let i = 0; i < k - 1; i++) {
      const contender = population[Math.floor(Math.random() * population.length)];
      if (contender.score > best.score) best = contender;
    }
    return best;
  }

  private crossover(p1: ScheduleSolution, p2: ScheduleSolution): ScheduleSolution {
    // Two-point crossover
    const len = Math.min(p1.schedule.length, p2.schedule.length);
    const point1 = Math.floor(Math.random() * len * 0.33);
    const point2 = Math.floor(len * 0.66 + Math.random() * len * 0.34);
    
    const childSchedule = [
      ...p1.schedule.slice(0, point1),
      ...p2.schedule.slice(point1, point2),
      ...p1.schedule.slice(point2)
    ];
    
    return { schedule: childSchedule, score: 0 };
  }

  private mutate(solution: ScheduleSolution): ScheduleSolution {
    const schedule = [...solution.schedule];
    const numMutations = 1 + Math.floor(Math.random() * 3); // 1-3 mutações
    
    for (let m = 0; m < numMutations; m++) {
      const idx = Math.floor(Math.random() * schedule.length);
      const lesson = schedule[idx];
      
      // Tentar usar disponibilidade do professor
      const teacher = this.input.teachers.find(t => t.id === lesson.teacher_id);
      
      if (teacher && teacher.disponibility.length > 0 && Math.random() < 0.7) {
        const slot = teacher.disponibility[Math.floor(Math.random() * teacher.disponibility.length)];
        schedule[idx] = { ...lesson, day: slot.day, period: slot.period };
      } else {
        schedule[idx] = {
          ...lesson,
          day: this.input.days[Math.floor(Math.random() * this.input.days.length)],
          period: Math.floor(Math.random() * this.input.periods) + 1
        };
      }
    }
    
    return { schedule, score: 0 };
  }
}
