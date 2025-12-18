import { ScheduleInput, ScheduleSolution, Lesson, TimeSlot, Teacher, ClassGroup, Subject, Conflict } from './types.js';

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
    let bestAssignment: Map<string, TimeSlot> = new Map();

    // We want to find at least one valid solution.
    // We can try to find optimal ones later, but first: STRICT VALIDITY.

    // Using a timeout to prevent infinite loops in impossible scenarios
    const startTime = Date.now();
    const timeLimit = 3000; // 3 seconds max (Requirement: "strict execution time limit")

    const backtrack = (index: number): boolean => {
      // Update best assignment found so far (maximize number of assigned variables)
      if (assignment.size > bestAssignment.size) {
        bestAssignment = new Map(assignment);
      }

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
      // Fallback: Use best partial assignment and fill the rest with conflicts
      return [this.fillPartialSolution(bestAssignment)];
    }

    return solutions;
  }

  private fillPartialSolution(assignment: Map<string, TimeSlot>): ScheduleSolution {
    // We start with the valid assignment we have so far
    // and try to assign the rest, minimizing conflicts
    const finalAssignment = new Map(assignment);

    // Identify unassigned variables
    const unassignedVars = this.variables.filter(v => !finalAssignment.has(v.id));

    // Construct all possible slots (ignoring teacher constraints for now)
    const allSlots: TimeSlot[] = [];
    for (const day of this.input.days) {
      for (let p = 1; p <= this.input.periods; p++) {
        allSlots.push({ day, period: p });
      }
    }

    // Assign remaining variables
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
          if (assignedVar && assignedVar.classId === variable.classId && assignedVar.day === slot.day) {
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
                  score -= 1000; // HUGE bonus for filling a hole! Increased from -500 to ensure it beats conflict penalties if needed or effectively forcing usage
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
          // Prefer earlier slots slightly to avoid random evening classes if morning is empty?
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

  private buildSolutionWithConflicts(assignment: Map<string, TimeSlot>): ScheduleSolution {
    const lessons: Lesson[] = [];
    const allConflicts: Conflict[] = [];

    assignment.forEach((slot, varId) => {
      const v = this.variables.find(variable => variable.id === varId);
      if (!v) return;

      let lessonConflict: Conflict | undefined;

      // 1. Check Availability Conflict
      // Re-check if slot is in domain
      const validDomain = this.domains.get(v.id) || [];
      const isAvailable = validDomain.some(d => isSameSlot(d, slot));

      if (!isAvailable) {
         lessonConflict = {
             type: 'teacher_unavailable',
             message: 'Professor indisponível neste horário'
         };
      }

      // 2. Check Double Booking (Teacher) & Class Overlap
      // We need to check against OTHER assignments in this built solution
      // But this is O(N^2). Since N is small (<1000 usually), it's fine.
      // Iterate over lessons added so far? No, assignment map is complete.

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

      if (lessonConflict) {
          allConflicts.push(lessonConflict);
      }

      lessons.push({
        day: slot.day,
        period: slot.period,
        class_id: v.classId,
        subject: v.subject.name,
        teacher_id: v.teacherId,
        conflict: lessonConflict
      });
    });

    // Score is lower because of conflicts.
    // We can calculate score based on conflict count.
    const score = Math.max(0, 100 - (allConflicts.length * 5));

    return {
      score,
      schedule: lessons,
      conflicts: allConflicts
    };
  }
}
