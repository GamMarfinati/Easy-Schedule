import { ScheduleInput, ScheduleSolution, Lesson, TimeSlot } from './types.js';

// Deterministic scheduler using backtracking with heuristic ordering.
// Guarantees reproducible schedules (no Math.random) respecting teacher availability
// and avoiding class/teacher collisions.

interface LessonRequest {
  class_id: string;
  subject: string;
  teacher_id: string;
  index: number; // stable ordering for determinism
}

const slotKey = (slot: TimeSlot) => `${slot.day}-${slot.period}`;

export class GeneticScheduler {
  private input: ScheduleInput;
  private maxNodes = 50000;

  constructor(input: ScheduleInput) {
    this.input = input;
  }

  public generate(): ScheduleSolution[] {
    const requests = this.expandRequests();
    const availabilityMap = this.buildAvailabilityMap();

    const schedule: Lesson[] = [];
    const teacherBusy = new Set<string>();
    const classBusy = new Set<string>();

    let nodesExplored = 0;
    const success = this.backtrack(0, requests, schedule, teacherBusy, classBusy, availabilityMap, () => {
      nodesExplored++;
      return nodesExplored <= this.maxNodes;
    });

    if (!success) {
      return [];
    }

    const score = this.calculateFitness(schedule);
    return [{ schedule, score }];
  }

  private expandRequests(): LessonRequest[] {
    const requests: LessonRequest[] = [];
    let counter = 0;

    const orderedClasses = [...this.input.classes].sort((a, b) => a.id.localeCompare(b.id));

    orderedClasses.forEach(cls => {
      const orderedSubjects = [...cls.subjects].sort((a, b) => {
        if (a.hours_per_week !== b.hours_per_week) return b.hours_per_week - a.hours_per_week;
        if (a.teacher_id !== b.teacher_id) return a.teacher_id.localeCompare(b.teacher_id);
        return a.name.localeCompare(b.name);
      });

      orderedSubjects.forEach(subject => {
        for (let i = 0; i < subject.hours_per_week; i++) {
          requests.push({
            class_id: cls.id,
            subject: subject.name,
            teacher_id: subject.teacher_id,
            index: counter++
          });
        }
      });
    });

    // Order by teacher availability (least options first) then by class/id stability
    return requests.sort((a, b) => {
      const availA = this.input.teachers.find(t => t.id === a.teacher_id)?.disponibility.length ?? Infinity;
      const availB = this.input.teachers.find(t => t.id === b.teacher_id)?.disponibility.length ?? Infinity;
      if (availA !== availB) return availA - availB;
      if (a.class_id !== b.class_id) return a.class_id.localeCompare(b.class_id);
      if (a.teacher_id !== b.teacher_id) return a.teacher_id.localeCompare(b.teacher_id);
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      return a.index - b.index;
    });
  }

  private buildAvailabilityMap(): Map<string, TimeSlot[]> {
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

    return false;
  }

  private calculateFitness(schedule: Lesson[]): number {
    // Simple heuristic: fewer gaps for teachers and balanced distribution
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

    // Penalize using too many days for the same teacher
    teacherDayPeriods.forEach(dayMap => {
      const daysUsed = dayMap.size;
      score -= Math.max(0, daysUsed - 3); // prefer concentration but allow up to 3 days without penalty
    });

    return Math.max(0, score);
  }
}
