import { ScheduleInput, ScheduleSolution, Lesson, TimeSlot, Teacher, ClassGroup, Subject } from './types.js';

// Helper to compare slots
const isSameSlot = (a: TimeSlot, b: TimeSlot) => a.day === b.day && a.period === b.period;

export class GeneticScheduler {
  private input: ScheduleInput;
  private domains: Map<string, TimeSlot[]>; // variable ID -> valid slots
  private variables: {
    id: string;
    classId: string;
    subject: Subject;
    teacherId: string;
    durationIndex: number; // 0 for 1st hour, 1 for 2nd, etc.
  }[];

  constructor(input: ScheduleInput) {
    this.input = input;
    this.variables = [];
    this.domains = new Map();
    this.initializeVariables();
  }

  // Initialize variables (lessons to be scheduled)
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

    // Initialize domains based on teacher availability
    this.variables.forEach(variable => {
      const teacher = this.input.teachers.find(t => t.id === variable.teacherId);
      if (teacher) {
        // Teacher availability is the initial domain
        // We also need to respect the periods defined in input
        const validSlots = teacher.disponibility.filter(d =>
            this.input.days.includes(d.day) && d.period <= this.input.periods
        );
        this.domains.set(variable.id, validSlots);
      } else {
        // If no teacher found (shouldn't happen), assume all slots? Or empty?
        // Assuming empty to be safe/strict
        this.domains.set(variable.id, []);
      }
    });

    // Sort variables by MRV (Minimum Remaining Values) heuristic could be good,
    // but for now, we just stick to the order or maybe sort by degree (most constrained first).
    // Let's sort by domain size (smallest first).
    this.variables.sort((a, b) => {
      const lenA = this.domains.get(a.id)?.length || 0;
      const lenB = this.domains.get(b.id)?.length || 0;
      return lenA - lenB;
    });
  }

  public generate(): ScheduleSolution[] {
    const assignment: Map<string, TimeSlot> = new Map();
    const solutions: ScheduleSolution[] = [];

    // We want to find at least one valid solution.
    // We can try to find optimal ones later, but first: STRICT VALIDITY.

    // Using a timeout to prevent infinite loops in impossible scenarios
    const startTime = Date.now();
    const timeLimit = 30000; // 30 seconds max

    const backtrack = (index: number): boolean => {
      if (Date.now() - startTime > timeLimit) return false;

      if (index === this.variables.length) {
        // All assigned!
        solutions.push(this.buildSolution(assignment));
        return true; // Return true to stop at first solution
      }

      const variable = this.variables[index];
      const domain = this.domains.get(variable.id) || [];

      // Value Ordering LCV (Least Constraining Value) - Optional
      // For now, random shuffle to get variety if we run multiple times
      // or just iterate.
      const shuffledDomain = [...domain].sort(() => Math.random() - 0.5);

      for (const slot of shuffledDomain) {
        if (this.isValid(variable, slot, assignment)) {
          assignment.set(variable.id, slot);

          // Forward Checking could go here to prune domains of future variables
          // but strict checking inside isValid is simpler for now.

          if (backtrack(index + 1)) return true;

          assignment.delete(variable.id);
        }
      }

      return false;
    };

    backtrack(0);

    if (solutions.length === 0) {
      // Fallback: Return empty or partial?
      // User requested strict adherence. If strict fails, maybe we return what we have?
      // Or we just return empty array.
      return [];
    }

    return solutions;
  }

  private isValid(
    currentVar: typeof this.variables[0],
    slot: TimeSlot,
    assignment: Map<string, TimeSlot>
  ): boolean {
    // Check against all currently assigned variables
    for (const [varId, assignedSlot] of assignment.entries()) {
      // 1. Check strict time overlap
      if (isSameSlot(assignedSlot, slot)) {
        // Find the variable object for this assigned varId
        const assignedVar = this.variables.find(v => v.id === varId);
        if (!assignedVar) continue;

        // Constraint A: Teacher Conflict
        if (assignedVar.teacherId === currentVar.teacherId) {
          return false;
        }

        // Constraint B: Class Conflict
        if (assignedVar.classId === currentVar.classId) {
          return false;
        }
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

    return {
      score: 100, // Strict solution is perfect by definition of constraints
      schedule: lessons
    };
  }
}
