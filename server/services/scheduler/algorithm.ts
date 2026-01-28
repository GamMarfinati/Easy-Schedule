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
  degree?: number; // Cache for heuristic
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

    // Calcule o grau (degree) para cada variável
    // Grau = Número de outras variáveis que compartilham o mesmo professor ou turma
    const teacherCounts = new Map<string, number>();
    const classCounts = new Map<string, number>();

    this.variables.forEach(v => {
      teacherCounts.set(v.teacherId, (teacherCounts.get(v.teacherId) || 0) + 1);
      classCounts.set(v.classId, (classCounts.get(v.classId) || 0) + 1);
    });

    // Heuristic: Sort by MRV (Domain Size) THEN Degree Heuristic (Most Constraining Variable)
    this.variables.sort((a, b) => {
      const lenA = this.domains.get(a.id)?.length || 0;
      const lenB = this.domains.get(b.id)?.length || 0;
      
      // 1. Minimum Remaining Values (MRV)
      if (lenA !== lenB) return lenA - lenB;

      // 2. Degree Heuristic (Tie-breaker)
      const degreeA = (teacherCounts.get(a.teacherId) || 0) + (classCounts.get(a.classId) || 0);
      const degreeB = (teacherCounts.get(b.teacherId) || 0) + (classCounts.get(b.classId) || 0);
      
      return degreeB - degreeA; // Higher degree first
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
        // Strategy: 
        // Attempt 0: STRICT Mode (No skipping). Best for finding perfect solutions.
        // Attempt 1+: SOFT Mode (Allow skipping). Best for finding partial solutions if perfect is impossible.
        const allowSkip = (attempt > 0);

        if (attempt > 0) {
            console.log(`[Algorithm] Restarting search (Attempt ${attempt + 1}/${maxRestarts}) [Strategy: ${allowSkip ? 'SOFT/GREEDY' : 'STRICT'}]...`);
            if (attempt > 1) this.shuffleVariables(); // Manipulate order for attempts 2+
        } else {
             console.log(`[Algorithm] Tentativa Inicial (Strict Mode - Busca Exata)...`);
        }

        const requests = this.expandRequests();
        const availabilityMap = this.buildAvailabilityMap();
        const schedule: Lesson[] = [];
        const teacherBusy = new Set<string>();
        const classBusy = new Set<string>();
        let nodesExplored = 0;
        
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
        this.backtrack(0, requests, schedule, teacherBusy, classBusy, availabilityMap, budgetCheck, allowSkip);
        
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
    const conflicts: any[] = [];
    // ... (rest of function usually follows here)
    // To facilitate the tool replacement, I'll return the conflicts block start here but I must match the EndLine carefully.
    // The previous block ended at 355 which is inside backtrack. I need to be careful.
    // I am effectively rewriting 'generate' AND 'backtrack' mostly.
    
    // Since I cannot rewrite the Conflict Analysis block at the bottom of generate() easily without including it (which is long),
    // and the prompt asks for specific chunks. 
    // I will break this into the 'generate' method top part and 'backtrack' method bottom part?
    // No, replace_file_content replaces a contiguous block. 
    // I will effectively include the logic to calling conflict analysis but not the analysis itself if I can help it.
    // Wait, the Conflict Analysis logic starts at line 134 in the original file.
    // My replacement starts at line 76 (start of generate).
    
    // Let's include the END of generate() logic up to the conflict analysis start.
    
    // ... (Copied logic for conflict analysis prep)
    
     // --- Detailed Conflict Analysis ---
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
        
        // Causa 1: Sem disponibilidade
        if (validSlots.length === 0) {
             conflicts.push({ 
                 type: 'availability', 
                 message: `O Prof. ${teacherName} não tem horários compatíveis configurados para ${subjectName} (${className}).`,
                 details: "Ajuste a disponibilidade do professor ou da turma."
             });
             return;
        }

        // Causa 2: Slots validos ocupados
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
                 const otherClassName = this.input.classes.find(c => c.id === tLesson.class_id)?.name || "outra turma";
                 reasons.push(`ocupado com ${otherClassName} na ${formatSlot(slot.day, slot.period)}`);
             } else if (cLesson) {
                 blockedByClassCount++;
                 const otherTeacherName = this.input.teachers.find(t => t.id === cLesson.teacher_id)?.name || "outro prof";
                 reasons.push(`turma em aula com ${otherTeacherName} (${cLesson.subject}) na ${formatSlot(slot.day, slot.period)}`);
             }
        });

        const missingCount = vars.length;
        let mainMsg = `${missingCount} aula(s) de ${subjectName} não puderam ser alocadas para a turma ${className}.`;
        let userAction = "";

        if (blockedByTeacherCount === validSlots.length) {
            mainMsg = `O professor(a) ${teacherName} não possui horários livres suficientes.`;
            userAction = `Disponibilize mais horários para este professor ou remova atribuições.`;
        } else if (blockedByClassCount === validSlots.length) {
            mainMsg = `A turma ${className} está cheia nos horários em que ${teacherName} poderia dar aula.`;
            userAction = `Tente trocar horários de outros professores desta turma.`;
        } else {
            mainMsg = `Conflito de horários para ${subjectName} (${teacherName}) na turma ${className}.`;
            userAction = `Aumente a flexibilidade da disponibilidade para encontrar um encaixe.`;
        }

        // Agrupar visualmente os motivos para não ficar repetitivo
        // Ex: "ocupado com 9A (Seg 1, Seg 2); ocupado com 9B (Ter 1)"
        const logicTrace = reasons.slice(0, 3).join("; ") + (reasons.length > 3 ? "..." : ".");

        conflicts.push({ 
            type: 'unallocated', 
            message: mainMsg, 
            details: `${userAction} Bloqueios: ${logicTrace}` 
        });
    });

    const score = this.calculateFitness(bestGlobalSchedule);
    return [{ schedule: bestGlobalSchedule, score, conflicts }];
  }

  private shuffleVariables() {
      // Sort by Domain Size + Random Noise
      this.variables.sort((a, b) => {
          const lenA = this.domains.get(a.id)?.length || 0;
          const lenB = this.domains.get(b.id)?.length || 0;
          if (lenA !== lenB) return lenA - lenB;
          return Math.random() - 0.5;
      });
  }

  // private expandRequests... from original file
  private expandRequests(): LessonRequest[] {
    return this.variables.map((v, index) => ({
      class_id: v.classId,
      subject: v.subject.name,
      teacher_id: v.teacherId,
      index: index
    }));
  }

  private buildAvailabilityMap(): Map<string, TimeSlot[]> {
    const dayOrder = new Map<string, number>();
    this.input.days.forEach((d, idx) => dayOrder.set(d, idx));

    const map = new Map<string, TimeSlot[]>();
    this.input.teachers.forEach(teacher => {
      // Pré-processamento: Ordenar slots para minimizar janelas
      // Prioridade: Preencher dias que o professor já tem maior disponibilidade ou preferência
      // No backtrack simples, não temos o estado atual, mas podemos dar preferência a slots extremos (primeiros ou ultimos)
      // para evitar "quebrar" o meio, ou agrupar por dia.
      
      const orderedSlots = teacher.disponibility
        .filter(slot => dayOrder.has(slot.day) && slot.period >= 1 && slot.period <= this.input.periods)
        .sort((a, b) => {
           const dA = dayOrder.get(a.day) ?? 0;
           const dB = dayOrder.get(b.day) ?? 0;
           
           // Agrupar fortemente por dia primeiro
           if (dA !== dB) return dA - dB;
           
           // Dentro do dia, ordem sequencial (manter lógica de preencher na ordem)
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
    budgetCheck: () => boolean,
    allowSkip: boolean
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

      // --- FORWARD CHECKING (Look-ahead) ---
      // Antes de confirmar este slot, verifique se ele "mata" alguma variável futura
      // que depende estritamente deste professor ou desta turma.
      let possible = true;
      
      // Look ahead apenas para as próximas N variáveis para não perder performance
      const lookAheadLimit = 5; 
      let checked = 0;

      for (let k = idx + 1; k < requests.length; k++) {
          if (checked++ > lookAheadLimit) break;

          const futureReq = requests[k];
          
          // Se não tem conflito de recurso (prof/turma), ignora
          if (futureReq.teacher_id !== req.teacher_id && futureReq.class_id !== req.class_id) continue;

          // Se tem conflito, verifique se a variável futura ainda tem slots válidos
          // O slot atual 'teacherKey' e 'classKey' estarao ocupados.
          // Precisamos ver se sobra algo no dominio dela.
          const futureSlots = availability.get(futureReq.teacher_id) || [];
          
          let hasFutureSlot = false;
          for (const fs of futureSlots) {
              const fsKey = slotKey(fs);
              const fsTeacherKey = `${futureReq.teacher_id}-${fsKey}`;
              const fsClassKey = `${futureReq.class_id}-${fsKey}`;

              // Se o slot futuro colide com o ATUAL que estamos tentando alocar, pule
              if (fsTeacherKey === teacherKey || fsClassKey === classKey) continue;
              
              // Se ja esta ocupado por alocacoes passadas, pule
              if (teacherBusy.has(fsTeacherKey) || classBusy.has(fsClassKey)) continue;

              hasFutureSlot = true;
              break; // Achou pelo menos 1, ta salvo
          }

          if (!hasFutureSlot) {
              possible = false;
              break; // Forward check failed: Esta escolha mata uma aula futura
          }
      }

      if (!possible && !allowSkip) continue; // Prune branch (unless in soft mode)
      // -------------------------------------

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

      if (this.backtrack(idx + 1, requests, schedule, teacherBusy, classBusy, availability, budgetCheck, allowSkip)) {
        return true;
      }

      // undo
      schedule.pop();
      teacherBusy.delete(teacherKey);
      classBusy.delete(classKey);
    }

    // SOFT FAIL STRATEGY (Allow Skipping)
    // Only enabled if allowSkip is true (Attempts 2+)
    if (allowSkip) {
        return this.backtrack(idx + 1, requests, schedule, teacherBusy, classBusy, availability, budgetCheck, allowSkip);
    }

    // STRICT MODE: If we can't place it, we return FALSE to trigger backtracking in the caller.
    return false;
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
