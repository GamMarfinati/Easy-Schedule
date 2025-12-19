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
  private totalLessonsByTeacher = new Map<string, number>();
  private totalLessonsByClass = new Map<string, number>();

  constructor(input: ScheduleInput) {
    this.input = input;
    this.totalLessonsByTeacher = this.buildTotalLessonsByTeacher();
    this.totalLessonsByClass = this.buildTotalLessonsByClass();
  }

  public generate(): ScheduleSolution[] {
    const requests = this.expandRequests();
    const availabilityMap = this.buildAvailabilityMap();

    const schedule: Lesson[] = [];
    const teacherBusy = new Set<string>();
    const classBusy = new Set<string>();
    const teacherDayPeriods = new Map<string, Map<string, number[]>>();
    const classDayPeriods = new Map<string, Map<string, number[]>>();
    const teacherLessonsScheduled = new Map<string, number>();
    const classLessonsScheduled = new Map<string, number>();

    let nodesExplored = 0;
    const success = this.backtrack(
      0,
      requests,
      schedule,
      teacherBusy,
      classBusy,
      availabilityMap,
      teacherDayPeriods,
      classDayPeriods,
      teacherLessonsScheduled,
      classLessonsScheduled,
      () => {
        nodesExplored++;
        return nodesExplored <= this.maxNodes;
      }
    );

    if (!success) {
      return [];
    }

    const score = this.calculateFitness(schedule);
    return [{ schedule, score }];
  }

  private buildTotalLessonsByTeacher(): Map<string, number> {
    const totals = new Map<string, number>();
    this.input.classes.forEach(cls => {
      cls.subjects.forEach(subject => {
        totals.set(subject.teacher_id, (totals.get(subject.teacher_id) ?? 0) + subject.hours_per_week);
      });
    });
    return totals;
  }

  private buildTotalLessonsByClass(): Map<string, number> {
    const totals = new Map<string, number>();
    this.input.classes.forEach(cls => {
      const total = cls.subjects.reduce((sum, subject) => sum + subject.hours_per_week, 0);
      totals.set(cls.id, total);
    });
    return totals;
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
    teacherDayPeriods: Map<string, Map<string, number[]>>,
    classDayPeriods: Map<string, Map<string, number[]>>,
    teacherLessonsScheduled: Map<string, number>,
    classLessonsScheduled: Map<string, number>,
    budgetCheck: () => boolean
  ): boolean {
    if (idx >= requests.length) {
      return true;
    }

    if (!budgetCheck()) return false;

    const req = requests[idx];
    const slots = availability.get(req.teacher_id) || [];
    const orderedSlots = this.orderSlotsForRequest(
      req,
      slots,
      teacherDayPeriods,
      classDayPeriods,
      teacherLessonsScheduled,
      classLessonsScheduled
    );

    for (const slot of orderedSlots) {
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
      this.addPeriod(teacherDayPeriods, req.teacher_id, slot.day, slot.period);
      this.addPeriod(classDayPeriods, req.class_id, slot.day, slot.period);
      teacherLessonsScheduled.set(req.teacher_id, (teacherLessonsScheduled.get(req.teacher_id) ?? 0) + 1);
      classLessonsScheduled.set(req.class_id, (classLessonsScheduled.get(req.class_id) ?? 0) + 1);

      if (
        this.backtrack(
          idx + 1,
          requests,
          schedule,
          teacherBusy,
          classBusy,
          availability,
          teacherDayPeriods,
          classDayPeriods,
          teacherLessonsScheduled,
          classLessonsScheduled,
          budgetCheck
        )
      ) {
        return true;
      }

      // undo
      schedule.pop();
      teacherBusy.delete(teacherKey);
      classBusy.delete(classKey);
      this.removePeriod(teacherDayPeriods, req.teacher_id, slot.day, slot.period);
      this.removePeriod(classDayPeriods, req.class_id, slot.day, slot.period);
      teacherLessonsScheduled.set(req.teacher_id, (teacherLessonsScheduled.get(req.teacher_id) ?? 1) - 1);
      classLessonsScheduled.set(req.class_id, (classLessonsScheduled.get(req.class_id) ?? 1) - 1);
    }

    return false;
  }

  private orderSlotsForRequest(
    req: LessonRequest,
    slots: TimeSlot[],
    teacherDayPeriods: Map<string, Map<string, number[]>>,
    classDayPeriods: Map<string, Map<string, number[]>>,
    teacherLessonsScheduled: Map<string, number>,
    classLessonsScheduled: Map<string, number>
  ): TimeSlot[] {
    const teacherDays = teacherDayPeriods.get(req.teacher_id) || new Map<string, number[]>();
    const classDays = classDayPeriods.get(req.class_id) || new Map<string, number[]>();
    const teacherTotal = this.totalLessonsByTeacher.get(req.teacher_id) ?? 0;
    const classTotal = this.totalLessonsByClass.get(req.class_id) ?? 0;
    const teacherScheduled = teacherLessonsScheduled.get(req.teacher_id) ?? 0;
    const classScheduled = classLessonsScheduled.get(req.class_id) ?? 0;

    const scored = slots.map(slot => {
      const teacherPeriods = teacherDays.get(slot.day) || [];
      const classPeriods = classDays.get(slot.day) || [];
      const teacherGapDelta = this.gapDelta(teacherPeriods, slot.period);
      const classGapDelta = this.gapDelta(classPeriods, slot.period);
      const teacherNewDay = teacherPeriods.length === 0 ? 1 : 0;
      const classNewDay = classPeriods.length === 0 ? 1 : 0;
      const teacherRemainingAfter = Math.max(0, teacherTotal - (teacherScheduled + 1));
      const classRemainingAfter = Math.max(0, classTotal - (classScheduled + 1));
      const teacherSingleDayPenalty =
        teacherNewDay && teacherRemainingAfter === 0 && teacherTotal > 1 ? 3 : 0;
      const classSingleDayPenalty =
        classNewDay && classRemainingAfter === 0 && classTotal > 1 ? 1 : 0;

      const penalty =
        teacherGapDelta * 3 +
        classGapDelta * 1 +
        teacherNewDay * 4 +
        classNewDay * 1 +
        teacherSingleDayPenalty +
        classSingleDayPenalty;

      return { slot, penalty };
    });

    return scored
      .sort((a, b) => {
        if (a.penalty !== b.penalty) return a.penalty - b.penalty;
        if (a.slot.day !== b.slot.day) return a.slot.day.localeCompare(b.slot.day);
        return a.slot.period - b.slot.period;
      })
      .map(item => item.slot);
  }

  private gapDelta(periods: number[], newPeriod: number): number {
    if (periods.length === 0) return 0;
    const before = this.gapCount(periods);
    const next = [...periods, newPeriod].sort((a, b) => a - b);
    const after = this.gapCount(next);
    return after - before;
  }

  private gapCount(periods: number[]): number {
    if (periods.length <= 1) return 0;
    const sorted = [...periods].sort((a, b) => a - b);
    let gaps = 0;
    for (let i = 1; i < sorted.length; i++) {
      gaps += Math.max(0, sorted[i] - sorted[i - 1] - 1);
    }
    return gaps;
  }

  private addPeriod(
    map: Map<string, Map<string, number[]>>,
    id: string,
    day: string,
    period: number
  ): void {
    const dayMap = map.get(id) || new Map<string, number[]>();
    const periods = dayMap.get(day) || [];
    periods.push(period);
    dayMap.set(day, periods);
    map.set(id, dayMap);
  }

  private removePeriod(
    map: Map<string, Map<string, number[]>>,
    id: string,
    day: string,
    period: number
  ): void {
    const dayMap = map.get(id);
    if (!dayMap) return;
    const periods = dayMap.get(day);
    if (!periods) return;
    const index = periods.indexOf(period);
    if (index >= 0) {
      periods.splice(index, 1);
    }
    if (periods.length === 0) {
      dayMap.delete(day);
    } else {
      dayMap.set(day, periods);
    }
    if (dayMap.size === 0) {
      map.delete(id);
    } else {
      map.set(id, dayMap);
    }
  }

  private calculateFitness(schedule: Lesson[]): number {
    // Simple heuristic: fewer gaps for teachers and balanced distribution
    const teacherDayPeriods = new Map<string, Map<string, number[]>>();
    const classDayPeriods = new Map<string, Map<string, number[]>>();
    schedule.forEach(lesson => {
      const teacherMap = teacherDayPeriods.get(lesson.teacher_id) || new Map<string, number[]>();
      const periods = teacherMap.get(lesson.day) || [];
      periods.push(lesson.period);
      teacherMap.set(lesson.day, periods);
      teacherDayPeriods.set(lesson.teacher_id, teacherMap);

      const classMap = classDayPeriods.get(lesson.class_id) || new Map<string, number[]>();
      const classPeriods = classMap.get(lesson.day) || [];
      classPeriods.push(lesson.period);
      classMap.set(lesson.day, classPeriods);
      classDayPeriods.set(lesson.class_id, classMap);
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

    classDayPeriods.forEach(dayMap => {
      dayMap.forEach(periods => {
        periods.sort((a, b) => a - b);
        let gaps = 0;
        for (let i = 1; i < periods.length; i++) {
          gaps += Math.max(0, periods[i] - periods[i - 1] - 1);
        }
        score -= gaps;
      });
    });

    return Math.max(0, score);
  }
}
