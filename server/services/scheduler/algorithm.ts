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
      const validDomain = this.domains.get(variable.id) || [];
      
      // EMERGENCY MODE: Just pick the first valid slot from teacher's domain. 
      // Don't check for conflicts. The 'buildSolutionWithConflicts' will mark them later.
      if (validDomain.length > 0) {
        finalAssignment.set(variable.id, validDomain[0]);
      } else {
        // If teacher has NO availability, just pick the first slot of the week.
        finalAssignment.set(variable.id, allSlots[0]);
      }
    }

    return this.buildSolutionWithConflicts(finalAssignment);
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

      // 2. Double Booking Check (Only check against OTHER entries)
      if (!lessonConflict) {
        for (let i = 0; i < entries.length; i++) {
            if (i === index) continue; // Skip self
            const [otherVarId, otherSlot] = entries[i];
            
            if (isSameSlot(slot, otherSlot)) {
                const otherV = this.variables.find(variable => variable.id === otherVarId);
                if (otherV) {
                    if (otherV.teacherId === v.teacherId) {
                        lessonConflict = { type: 'double_booking', message: 'Professor em duas turmas' };
                        break;
                    }
                    if (otherV.classId === v.classId) {
                         lessonConflict = { type: 'class_overlap', message: 'Choque de horário na turma' };
                         break;
                    }
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
