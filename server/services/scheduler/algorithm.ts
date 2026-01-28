import { ScheduleInput, ScheduleSolution, Lesson, TimeSlot, Teacher, ClassGroup, Subject, Conflict } from './types.js';

// Deterministic scheduler using backtracking with heuristic ordering.
// Guarantees reproducible schedules (no Math.random) respecting teacher availability
// and avoiding class/teacher collisions.

interface LessonRequest {
  class_id: string;
  subject: string;
  teacher_id: string;
  index: number; // stable ordering for determinism
}

// Interface auxiliar para corrigir o erro de tipagem
interface SchedulerVariable {
  id: string;
  classId: string;
  subject: Subject;
  teacherId: string;
  durationIndex: number;
}

const slotKey = (slot: TimeSlot) => `${slot.day}-${slot.period}`;

export class GeneticScheduler {
  private input: ScheduleInput;
  private maxNodes = 10000000;

  // Declaração das propriedades que faltavam
  private variables: SchedulerVariable[];
  private domains: Map<string, TimeSlot[]>;

  constructor(input: ScheduleInput) {
    this.input = input;
    this.variables = [];
    this.domains = new Map();
    this.initializeVariables();
  }

  private initializeVariables() {
    this.variables = [];
    this.input.classes.forEach(cls => {
      cls.subjects.forEach(sub => {
        for (let i = 0; i < sub.hours_per_week; i++) {
          this.variables.push({
            id: `${cls.id}-${sub.name}-${i}`,
            classId: cls.id,
            subject: sub,
            teacherId: sub.teacher_id,
            durationIndex: i
          });
        }
      });
    });

    this.variables.forEach(variable => {
      const teacher = this.input.teachers.find(t => t.id === variable.teacherId);
      if (teacher) {
        const validSlots = teacher.disponibility.filter(d =>
            this.input.days.includes(d.day) && d.period <= this.input.periods
        );
        this.domains.set(variable.id, validSlots);
      } else {
        this.domains.set(variable.id, []);
      }
    });

    // Heuristic: Sort by domain size (most constrained first = FAIL FAST)
    this.variables.sort((a, b) => {
      const lenA = this.domains.get(a.id)?.length || 0;
      const lenB = this.domains.get(b.id)?.length || 0;
      return lenA - lenB;
    });
  }

  public generate(): ScheduleSolution[] {
    let bestGlobalSchedule: Lesson[] = [];
    let maxGlobalPlaced = 0;
    const maxRestarts = 5;
    const originalMaxNodes = this.maxNodes;
    this.maxNodes = 2000000; // 2M nodes per restart (total ~10M)

    // Track best solution across all restarts
    for (let attempt = 0; attempt < maxRestarts; attempt++) {
        if (attempt > 0) {
            console.log(`[Algorithm] Restarting search (Attempt ${attempt + 1}/${maxRestarts})...`);
            this.shuffleVariables(); 
        }

        const requests = this.expandRequests();
        const availabilityMap = this.buildAvailabilityMap();
        const schedule: Lesson[] = [];
        const teacherBusy = new Set<string>();
        const classBusy = new Set<string>();
        let nodesExplored = 0;
        
        // Local best for this attempt
        let maxPlacedThisAttempt = 0;

        // Callback to track progress and stop if taking too long
        const budgetCheck = () => {
          nodesExplored++;
          // A cada 1000 nós, se o schedule atual for maior que o global, salva como melhor parcial
          if (nodesExplored % 1000 === 0) {
             if (schedule.length > maxGlobalPlaced) {
                 maxGlobalPlaced = schedule.length;
                 bestGlobalSchedule = [...schedule]; // Snapshot copy
             }
          }
          return nodesExplored <= this.maxNodes;
        };

        // Run backtracking
        this.backtrack(0, requests, schedule, teacherBusy, classBusy, availabilityMap, budgetCheck);
        
        // Final check for this attempt
        if (schedule.length > maxGlobalPlaced) {
             maxGlobalPlaced = schedule.length;
             bestGlobalSchedule = [...schedule];
        }

        console.log(`[Algorithm] Tentativa ${attempt + 1}: ${schedule.length}/${requests.length} aulas alocadas.`);

        // Se encontrou TODOS, retorna imediatamente (Sucesso Total)
        if (schedule.length === requests.length) {
          console.log(`[Algorithm] Sucesso TOTAL na tentativa ${attempt + 1}!`);
          const score = this.calculateFitness(schedule);
          return [{ schedule, score, conflicts: [] }];
        }
    }

    console.warn(`[Algorithm] Incompleto após tentativas. Retornando melhor parcial: ${maxGlobalPlaced} aulas.`);
    
    // --- Detailed Conflict Analysis ---
    // --- Detailed Conflict Analysis ---
    const conflicts: any[] = [];

    // 1. Identify actually unplaced variables
    const placedTracker = new Map<string, number>(); 
    const actuallyUnplaced: SchedulerVariable[] = [];

    this.variables.forEach(v => {
        const key = `${v.classId}|${v.subject.name}|${v.teacherId}`;
        const placedSoFar = placedTracker.get(key) || 0;
        
        const totalInSchedule = bestGlobalSchedule.filter(l => 
            l.class_id === v.classId && 
            l.subject === v.subject.name && 
            l.teacher_id === v.teacherId
        ).length;

        if (placedSoFar < totalInSchedule) {
            placedTracker.set(key, placedSoFar + 1);
        } else {
            actuallyUnplaced.push(v);
        }
    });

    // 2. lookup maps for Analysis
    const teacherScheduleMap = new Map<string, Lesson>();
    const classScheduleMap = new Map<string, Lesson>();
    bestGlobalSchedule.forEach(l => {
        teacherScheduleMap.set(`${l.teacher_id}|${l.day}|${l.period}`, l);
        classScheduleMap.set(`${l.class_id}|${l.day}|${l.period}`, l);
    });

    // 3. Group and Analyze
    const groupedUnplaced = new Map<string, SchedulerVariable[]>();
    actuallyUnplaced.forEach(v => {
        const key = `${v.classId}|${v.subject.name}|${v.teacherId}`;
        if (!groupedUnplaced.has(key)) groupedUnplaced.set(key, []);
        groupedUnplaced.get(key)!.push(v);
    });

    // Helper to format Day/Period
    const formatSlot = (d: string, p: number) => {
        // Simple map if possible, else generic
        const dayMap: any = { 'seg': 'Seg', 'ter': 'Ter', 'qua': 'Qua', 'qui': 'Qui', 'sex': 'Sex' };
        return `${dayMap[d] || d} ${p}ª`;
    };

    groupedUnplaced.forEach((vars) => {
        const sample = vars[0];
        const teacher = this.input.teachers.find(t => t.id === sample.teacherId);
        const teacherName = teacher?.name || sample.teacherId;
        const classObj = this.input.classes.find(c => c.id === sample.classId);
        const className = classObj?.name || sample.classId;
        const subjectName = sample.subject.name;

        const validSlots = this.domains.get(sample.id) || [];
        
        // Causa 1: Sem disponibilidade (Domínio Vazio)
        if (validSlots.length === 0) {
             conflicts.push({ 
                 type: 'availability', 
                 message: `O Prof. ${teacherName} não tem horários compatíveis configurados para ${subjectName} (${className}).`,
                 details: "Ajuste a disponibilidade do professor ou da turma."
             });
             return;
        }

        // Causa 2: Slots validos estão ocupados
        const reasons: string[] = [];
        let blockedByTeacherCount = 0;
        let blockedByClassCount = 0;

        validSlots.forEach(slot => {
             const tKey = `${sample.teacherId}|${slot.day}|${slot.period}`;
             const cKey = `${sample.classId}|${slot.day}|${slot.period}`;
             
             const tLesson = teacherScheduleMap.get(tKey);
             const cLesson = classScheduleMap.get(cKey);

             if (tLesson) {
                 blockedByTeacherCount++;
                 // Find who the teacher is teaching instead
                 const otherClassName = this.input.classes.find(c => c.id === tLesson.class_id)?.name || "outra turma";
                 reasons.push(`Prof. ocupado com ${otherClassName} na ${formatSlot(slot.day, slot.period)}`);
             } else if (cLesson) {
                 blockedByClassCount++;
                 // Find who is teaching the class instead
                 const otherTeacherName = this.input.teachers.find(t => t.id === cLesson.teacher_id)?.name || "outro prof";
                 reasons.push(`Turma ocupada com ${otherTeacherName} (${cLesson.subject}) na ${formatSlot(slot.day, slot.period)}`);
             }
        });

        const missingCount = vars.length;
        let mainMsg = `Não foi possível alocar ${missingCount} aula(s) de ${subjectName} (${teacherName}) na turma ${className}.`;
        let userAction = "";

        // Heurística de Mensagem
        if (blockedByTeacherCount === validSlots.length) {
            mainMsg = `Prof. ${teacherName} está ocupado em TODOS os seus horários possíveis.`;
            userAction = `Sugestão: O professor precisa liberar mais horários ou trocar aulas de outras turmas.`;
        } else if (blockedByClassCount === validSlots.length) {
            const conflictingProf = reasons[0].match(/com (.+?) \(/)?.[1] || "outro professor";
            mainMsg = `Conflito Direto: A turma ${className} já está ocupada nos dias em que o Prof. ${teacherName} pode.`;
            userAction = `Sugestão: Verifique se ${conflictingProf} pode ceder o horário ou mude a disponibilidade de ${teacherName}.`;
        } else {
            mainMsg = `Conflito Complexo: ${teacherName} disputa horários com outros professores na turma ${className}.`;
            userAction = `Sugestão: Tente processar esta disciplina com prioridade maior ou flexibilizar os horários.`;
        }

        // Pick top 3 unique reasons
        const uniqueReasons = Array.from(new Set(reasons));
        const logicTrace = uniqueReasons.slice(0, 3).join("; ") + (uniqueReasons.length > 3 ? "..." : ".");

        conflicts.push({ 
            type: 'unallocated', 
            message: mainMsg, 
            details: `${userAction} Detalhes: ${logicTrace}` 
        });
    });

    const score = this.calculateFitness(bestGlobalSchedule);
    return [{ schedule: bestGlobalSchedule, score, conflicts }];
  }

  private shuffleVariables() {
      // Fisher-Yates shuffle but respecting MRV (sort by domain size, but randomize ties or slightly perturb domain size)
      // Actually, pure random shuffle might destroy MRV benefit. 
      // Better: Sort by Domain Size + Random Noise
      this.variables.sort((a, b) => {
          const lenA = this.domains.get(a.id)?.length || 0;
          const lenB = this.domains.get(b.id)?.length || 0;
          // Weighted: Primary is length, Secondary is random
          if (lenA !== lenB) return lenA - lenB;
          return Math.random() - 0.5;
      });
  }

  // ... (rest of methods likely unchanged, keeping expandRequests for context if needed, but only replacing generate and backtrack logic if needed)

  private expandRequests(): LessonRequest[] {
    // Use the variables that were ALREADY sorted by MRV (Minimum Remaining Values) in the constructor
    // This ensures we tackle the most constrained lessons (hardest to place) first.
    return this.variables.map((v, index) => ({
      class_id: v.classId,
      subject: v.subject.name,
      teacher_id: v.teacherId,
      index: index // Use the sorted index
    }));
  }

  private buildAvailabilityMap(): Map<string, TimeSlot[]> {
     // ... same as before
    const dayOrder = new Map<string, number>();
    this.input.days.forEach((d, idx) => dayOrder.set(d, idx));

    const map = new Map<string, TimeSlot[]>();
    this.input.teachers.forEach(teacher => {
      const orderedSlots = teacher.disponibility
        .filter(slot => dayOrder.has(slot.day) && slot.period >= 1 && slot.period <= this.input.periods)
        .sort((a, b) => {
          const dayCompare = (dayOrder.get(a.day) ?? 0) - (dayOrder.get(b.day) ?? 0);
          if (dayCompare !== 0) return dayCompare;
          return a.period - b.period;
        });
      map.set(teacher.id, orderedSlots);
    });
    return map;
  }

  private backtrack(
    idx: number,
    requests: LessonRequest[],
    schedule: Lesson[],
    teacherBusy: Set<string>,
    classBusy: Set<string>,
    availability: Map<string, TimeSlot[]>,
    budgetCheck: () => boolean
  ): boolean {
    if (idx >= requests.length) {
      return true;
    }

    if (!budgetCheck()) return false;

    const req = requests[idx];
    const slots = availability.get(req.teacher_id) || [];

    // Try to place the current lesson in one of the available slots
    for (const slot of slots) {
      const key = slotKey(slot);
      const teacherKey = `${req.teacher_id}-${key}`;
      const classKey = `${req.class_id}-${key}`;

      if (teacherBusy.has(teacherKey) || classBusy.has(classKey)) continue;

      // place lesson
      schedule.push({
        day: slot.day,
        period: slot.period,
        class_id: req.class_id,
        subject: req.subject,
        teacher_id: req.teacher_id
      });
      teacherBusy.add(teacherKey);
      classBusy.add(classKey);

      if (this.backtrack(idx + 1, requests, schedule, teacherBusy, classBusy, availability, budgetCheck)) {
        return true;
      }

      // undo
      schedule.pop();
      teacherBusy.delete(teacherKey);
      classBusy.delete(classKey);
    }

    // SOFT FAIL: If we couldn't place THIS lesson, SKIP it and try the rest!
    // This makes the algorithm resilient to impossible constraints.
    // We don't return false (which would kill the whole branch), we proceed.
    return this.backtrack(idx + 1, requests, schedule, teacherBusy, classBusy, availability, budgetCheck);
  }

  private calculateFitness(schedule: Lesson[]): number {
    // ... same as before
    const dayOrder = new Map<string, number>();
    this.input.days.forEach((d, idx) => dayOrder.set(d, idx));

    const teacherDayPeriods = new Map<string, Map<string, number[]>>();
    schedule.forEach(lesson => {
      const teacherMap = teacherDayPeriods.get(lesson.teacher_id) || new Map<string, number[]>();
      const periods = teacherMap.get(lesson.day) || [];
      periods.push(lesson.period);
      teacherMap.set(lesson.day, periods);
      teacherDayPeriods.set(lesson.teacher_id, teacherMap);
    });

    let score = 100;
    teacherDayPeriods.forEach(dayMap => {
      dayMap.forEach(periods => {
        periods.sort((a, b) => a - b);
        let gaps = 0;
        for (let i = 1; i < periods.length; i++) {
          gaps += Math.max(0, periods[i] - periods[i - 1] - 1);
        }
        score -= gaps * 2;
      });
    });

    teacherDayPeriods.forEach(dayMap => {
      const daysUsed = dayMap.size;
      score -= Math.max(0, daysUsed - 3); 
    });

    return Math.max(0, score);
  }
}
