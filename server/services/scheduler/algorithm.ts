import { ScheduleInput, ScheduleSolution, Lesson, TimeSlot, Teacher, ClassGroup, Subject, Conflict } from './types.js';

// Helper to compare slots
const isSameSlot = (a: TimeSlot, b: TimeSlot) => a.day === b.day && a.period === b.period;

export class GeneticScheduler {
  private input: ScheduleInput;
  private domains: Map<string, TimeSlot[]>;
  private variables: {
    id: string;
    classId: string;
    subject: Subject;
    teacherId: string;
    durationIndex: number;
  }[];

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
    const assignment: Map<string, TimeSlot> = new Map();
    const solutions: ScheduleSolution[] = [];
    
    // Safety: 2.5 seconds max to allow HTTP response overhead before 524 error
    const startTime = Date.now();
    const timeLimit = 2500; 

    // We use a counter to avoid checking Date.now() every single micro-iteration (expensive)
    let ops = 0;

    const backtrack = (index: number): boolean => {
      // Optimization: Check time only every 50 operations to save CPU cycles
      if (ops++ % 50 === 0) {
        if (Date.now() - startTime > timeLimit) {
            throw new Error('TIMEOUT'); // Force immediate exit, preserving 'assignment' state
        }
      }

      if (index === this.variables.length) {
        solutions.push(this.buildSolution(assignment));
        return true;
      }

      const variable = this.variables[index];
      const domain = this.domains.get(variable.id) || [];

      // Simple heuristic: just try slots
      for (const slot of domain) {
        if (this.isValid(variable, slot, assignment)) {
          assignment.set(variable.id, slot);
          if (backtrack(index + 1)) return true;
          assignment.delete(variable.id);
        }
      }

      return false;
    };

    try {
      backtrack(0);
    } catch (e) {
      // If TIMEOUT error is caught, we immediately use whatever is in 'assignment'
      // This is the "Best Partial Solution" found so far.
      console.warn("Generating partial solution due to timeout.");
      return [this.fillPartialSolution(assignment)];
    }

    if (solutions.length === 0) {
      return [this.fillPartialSolution(assignment)];
    }

    return solutions;
  }

  // Optimized to be "Dumb and Fast" so we don't timeout AGAIN while filling holes
  private fillPartialSolution(assignment: Map<string, TimeSlot>): ScheduleSolution {
    const finalAssignment = new Map(assignment);
    const unassignedVars = this.variables.filter(v => !finalAssignment.has(v.id));

    // Create a pool of all slots
    const allSlots: TimeSlot[] = [];
    for (const day of this.input.days) {
      for (let p = 1; p <= this.input.periods; p++) {
        allSlots.push({ day, period: p });
      }
    }

    for (const variable of unassignedVars) {
      // In fallback mode, we consider ALL slots to guarantee compactness and full assignment,
      // even if the teacher is unavailable (which adds a penalty score).
      // We rely on calculateSlotScore to prioritize valid slots over invalid ones.

      let bestSlot = allSlots[0];
      let minScore = Infinity;

      for (const slot of allSlots) {
         const score = this.calculateSlotScore(variable, slot, finalAssignment);
         if (score < minScore) {
             minScore = score;
             bestSlot = slot;
         }
      }

      if (bestSlot) {
        finalAssignment.set(variable.id, bestSlot);
      }
    }

    return this.buildSolutionWithConflicts(finalAssignment);
  }

  private calculateSlotScore(
    variable: typeof this.variables[0],
    slot: TimeSlot,
    assignment: Map<string, TimeSlot>
  ): number {
      let score = 0;

      // 1. Teacher Availability (Base Constraint)
      // If slot is not in teacher's domain, penalty
      const validDomain = this.domains.get(variable.id) || [];
      const isAvailable = validDomain.some(d => isSameSlot(d, slot));
      if (!isAvailable) {
          score += 1000;
      }

      // 2. Conflicts with existing assignments
      for (const [varId, assignedSlot] of assignment.entries()) {
          if (isSameSlot(assignedSlot, slot)) {
              const assignedVar = this.variables.find(v => v.id === varId);
              if (!assignedVar) continue;

              // Teacher Double Booking
              if (assignedVar.teacherId === variable.teacherId) {
                  score += 1000;
              }

              // Class Overlap (Critical to avoid if possible)
              if (assignedVar.classId === variable.classId) {
                  score += 5000; // Prefer double booking teacher over double booking class slot
              }
          }
      }

      // 3. Gap Penalty (Compactness)
      // Find all slots assigned to this class on this day
      const classSlotsOnDay: number[] = [];
      for (const [varId, assignedSlot] of assignment.entries()) {
          const assignedVar = this.variables.find(v => v.id === varId);
          // FIX: Use assignedSlot.day instead of assignedVar.day (which doesn't exist)
          if (assignedVar && assignedVar.classId === variable.classId && assignedSlot.day === slot.day) {
              classSlotsOnDay.push(assignedSlot.period);
          }
      }
      classSlotsOnDay.sort((a, b) => a - b);

      if (classSlotsOnDay.length > 0) {
          const minP = classSlotsOnDay[0];
          const maxP = classSlotsOnDay[classSlotsOnDay.length - 1];

          // Check if slot is adjacent
          const isAdjacent = classSlotsOnDay.includes(slot.period - 1) || classSlotsOnDay.includes(slot.period + 1);

          if (isAdjacent) {
              score -= 50; // Bonus for adjacency
          } else {
              // Check if it fills a gap
              if (slot.period > minP && slot.period < maxP) {
                  score -= 1000; // HUGE bonus for filling a hole!
              } else {
                  // It's disjoint (creating a gap)
                  // Distance to nearest block
                  const distMin = Math.abs(slot.period - minP);
                  const distMax = Math.abs(slot.period - maxP);
                  const dist = Math.min(distMin, distMax);

                  if (dist > 1) {
                      score += (dist * 200); // Increased Penalty proportional to distance
                  }
              }
          }
      } else {
          // First lesson of the day for this class.
          // Prefer earlier slots slightly
          score += slot.period * 10;
      }

      return score;
  }

  private countConflicts(
    currentVar: typeof this.variables[0],
    slot: TimeSlot,
    assignment: Map<string, TimeSlot>
  ): number {
    let conflicts = 0;

    // Check overlapping assignments
    for (const [varId, assignedSlot] of assignment.entries()) {
      if (isSameSlot(assignedSlot, slot)) {
        const assignedVar = this.variables.find(v => v.id === varId);
        if (!assignedVar) continue;
        if (assignedVar.teacherId === currentVar.teacherId) conflicts++;
        if (assignedVar.classId === currentVar.classId) conflicts++;
      }
    }

    return conflicts;
  }

  private isValid(
    currentVar: typeof this.variables[0],
    slot: TimeSlot,
    assignment: Map<string, TimeSlot>
  ): boolean {
    for (const [varId, assignedSlot] of assignment.entries()) {
      if (isSameSlot(assignedSlot, slot)) {
        const assignedVar = this.variables.find(v => v.id === varId);
        if (!assignedVar) continue;

        if (assignedVar.teacherId === currentVar.teacherId) return false;
        if (assignedVar.classId === currentVar.classId) return false;
      }
    }
    return true;
  }

  private buildSolution(assignment: Map<string, TimeSlot>): ScheduleSolution {
    const lessons: Lesson[] = [];
    assignment.forEach((slot, varId) => {
      const v = this.variables.find(variable => variable.id === varId);
      if (v) {
        lessons.push({
          day: slot.day,
          period: slot.period,
          class_id: v.classId,
          subject: v.subject.name,
          teacher_id: v.teacherId
        });
      }
    });

    return { score: 100, schedule: lessons };
  }

  private buildSolutionWithConflicts(assignment: Map<string, TimeSlot>): ScheduleSolution {
    const lessons: Lesson[] = [];
    const allConflicts: Conflict[] = [];

    // Conversion to array for easier index checking (O(N^2) loop inside here is unavoidable but runs once)
    const entries = Array.from(assignment.entries());

    entries.forEach(([varId, slot], index) => {
      const v = this.variables.find(variable => variable.id === varId);
      if (!v) return;

      let lessonConflict: Conflict | undefined;

      // 1. Availability Check
      const validDomain = this.domains.get(v.id) || [];
      const isAvailable = validDomain.some(d => isSameSlot(d, slot));
      if (!isAvailable) {
         lessonConflict = { type: 'teacher_unavailable', message: 'Professor indisponível' };
      }

      // 2. Check Double Booking (Teacher) & Class Overlap
      // Prioritize identifying Class Overlap as it is visually more important to fix in grid
      for (const [otherVarId, otherSlot] of assignment.entries()) {
          if (varId === otherVarId) continue;
          if (isSameSlot(slot, otherSlot)) {
              const otherV = this.variables.find(variable => variable.id === otherVarId);
              if (!otherV) continue;

              if (otherV.classId === v.classId) {
                   // Only overwrite if not already set or if previous was just unavailable
                   if (!lessonConflict || lessonConflict.type === 'teacher_unavailable') {
                       lessonConflict = {
                           type: 'class_overlap',
                           message: `Turma tem outra aula agendada: ${otherV.subject.name}`
                       };
                   }
              }

              if (otherV.teacherId === v.teacherId) {
                   if (!lessonConflict || lessonConflict.type === 'teacher_unavailable') {
                       lessonConflict = {
                           type: 'double_booking',
                           message: `Professor agendado também na turma ${otherV.classId} (${otherV.subject.name})`
                       };
                   }
              }
          }
      }

      if (lessonConflict) allConflicts.push(lessonConflict);

      lessons.push({
        day: slot.day,
        period: slot.period,
        class_id: v.classId,
        subject: v.subject.name,
        teacher_id: v.teacherId,
        conflict: lessonConflict
      });
    });

    return {
      score: Math.max(0, 100 - (allConflicts.length * 5)),
      schedule: lessons,
      conflicts: allConflicts
    };
  }
}
