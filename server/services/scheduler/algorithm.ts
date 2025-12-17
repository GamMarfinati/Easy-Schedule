import { ScheduleInput, ScheduleSolution, Lesson, TimeSlot, Subject } from './types.js';

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

  // Optimization: O(1) Constraint Checking
  // Key: `${day}-${period}`
  // Value: Sets of occupied teachers and classes
  private occupied: Map<string, { teachers: Set<string>, classes: Set<string> }>;

  constructor(input: ScheduleInput) {
    this.input = input;
    this.variables = [];
    this.domains = new Map();
    this.occupied = new Map();
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

    // Initialize domains based on teacher availability
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

    // Heuristic Sorting
    // 1. Degree Heuristic: Sort by "difficulty" (e.g. fewer available slots = harder)
    // 2. We can also consider "variable degree" (how many other variables it constraints),
    //    but domain size (MRV) is a good proxy for difficulty here.
    this.variables.sort((a, b) => {
      const lenA = this.domains.get(a.id)?.length || 0;
      const lenB = this.domains.get(b.id)?.length || 0;
      return lenA - lenB;
    });

    // Initialize Occupied Map
    this.input.days.forEach(day => {
      for (let p = 1; p <= this.input.periods; p++) {
        this.occupied.set(`${day}-${p}`, {
          teachers: new Set(),
          classes: new Set()
        });
      }
    });
  }

  public generate(options: { timeout?: number } = {}): ScheduleSolution[] {
    const assignment: Map<string, TimeSlot> = new Map();
    const solutions: ScheduleSolution[] = [];

    // Configurable timeout (default 5s)
    const startTime = Date.now();
    const timeLimit = options.timeout || 5000;
    let timedOut = false;

    // Track best partial solution
    let bestAssignment: Map<string, TimeSlot> = new Map();
    let maxDepth = 0;

    const backtrack = (index: number): boolean => {
      // Check timeout every 100 steps or just every step (Date.now() is cheap enough)
      if (index % 50 === 0) {
        if (Date.now() - startTime > timeLimit) {
            timedOut = true;
            return false;
        }
      }

      if (index > maxDepth) {
        maxDepth = index;
        bestAssignment = new Map(assignment);
      }

      if (index === this.variables.length) {
        solutions.push(this.buildSolution(assignment, true, startTime));
        return true;
      }

      const variable = this.variables[index];
      const domain = this.domains.get(variable.id) || [];

      // Heuristic: Shuffle domain for variety, or order by Least Constraining Value?
      // For speed, just iterating is fine. Random shuffle helps if we restart.
      // Let's stick to simple iteration for deterministic behavior or
      // sort by slot usage (avoid busy slots)?
      // Random shuffle is good to avoid getting stuck in the same bad branch if inputs are similar.
      // But we want strict speed.
      // const shuffledDomain = [...domain].sort(() => Math.random() - 0.5);
      // Let's keep it simple.

      for (const slot of domain) {
        if (this.isValidFast(slot, variable.teacherId, variable.classId)) {
          // DO
          this.assign(variable.id, slot, variable.teacherId, variable.classId, assignment);

          if (backtrack(index + 1)) return true;

          if (timedOut) return false;

          // UNDO
          this.unassign(variable.id, slot, variable.teacherId, variable.classId, assignment);
        }
      }

      return false;
    };

    backtrack(0);

    if (solutions.length > 0) {
      return solutions;
    }

    // If timed out or no complete solution found, return partial
    if (timedOut || bestAssignment.size > 0) {
        // Return partial solution
        return [this.buildSolution(bestAssignment, !timedOut && bestAssignment.size === this.variables.length, startTime)];
    }

    return [];
  }

  // O(1) Constraint Check
  private isValidFast(slot: TimeSlot, teacherId: string, classId: string): boolean {
    const key = `${slot.day}-${slot.period}`;
    const occ = this.occupied.get(key);
    if (!occ) return false; // Should not happen

    if (occ.teachers.has(teacherId)) return false;
    if (occ.classes.has(classId)) return false;

    return true;
  }

  private assign(
    varId: string,
    slot: TimeSlot,
    teacherId: string,
    classId: string,
    assignment: Map<string, TimeSlot>
  ) {
    assignment.set(varId, slot);
    const key = `${slot.day}-${slot.period}`;
    const occ = this.occupied.get(key);
    if (occ) {
        occ.teachers.add(teacherId);
        occ.classes.add(classId);
    }
  }

  private unassign(
    varId: string,
    slot: TimeSlot,
    teacherId: string,
    classId: string,
    assignment: Map<string, TimeSlot>
  ) {
    assignment.delete(varId);
    const key = `${slot.day}-${slot.period}`;
    const occ = this.occupied.get(key);
    if (occ) {
        occ.teachers.delete(teacherId);
        occ.classes.delete(classId);
    }
  }

  private buildSolution(assignment: Map<string, TimeSlot>, complete: boolean, startTime: number): ScheduleSolution {
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

    const score = complete ? 100 : Math.floor((assignment.size / this.variables.length) * 100);

    return {
      score,
      schedule: lessons,
      metadata: {
        complete,
        assignments: assignment.size,
        total: this.variables.length,
        time: Date.now() - startTime
      }
    };
  }
}
