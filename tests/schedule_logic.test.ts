import { describe, it, expect } from 'vitest';
import { GeneticScheduler } from '../server/services/scheduler/algorithm';
import { ScheduleInput, Teacher, ClassGroup, Classroom } from '../server/services/scheduler/types';

describe('Schedule Logic Strictness', () => {
  it('should solve a tight constraint scenario without conflicts', () => {
    // Scenario:
    // T1 available only Mon 1, Mon 2.
    // T2 available only Mon 1, Mon 2.
    // C1 needs T1 (1h) and T2 (1h).
    // C2 needs T1 (1h) and T2 (1h).
    //
    // This forces a "cross" pattern:
    // If C1 has T1 at Mon 1, it MUST have T2 at Mon 2.
    // Then C2 MUST have T1 at Mon 2 and T2 at Mon 1.
    // Any other combination leads to conflicts (Teacher double booked or Class double booked).

    const teachers: Teacher[] = [
      {
        id: 't1',
        name: 'Teacher 1',
        disponibility: [
          { day: 'seg', period: 1 },
          { day: 'seg', period: 2 },
        ],
      },
      {
        id: 't2',
        name: 'Teacher 2',
        disponibility: [
            { day: 'seg', period: 1 },
            { day: 'seg', period: 2 },
        ],
      },
    ];

    const classes: ClassGroup[] = [
      {
        id: 'c1',
        name: 'Class 1',
        year: 1,
        subjects: [
          { name: 'Math', teacher_id: 't1', hours_per_week: 1 },
          { name: 'Hist', teacher_id: 't2', hours_per_week: 1 },
        ],
      },
      {
        id: 'c2',
        name: 'Class 2',
        year: 1,
        subjects: [
            { name: 'Math', teacher_id: 't1', hours_per_week: 1 },
            { name: 'Hist', teacher_id: 't2', hours_per_week: 1 },
        ],
      },
    ];

    const input: ScheduleInput = {
      name: 'Tight Schedule',
      periods: 5,
      days: ['seg', 'ter', 'qua', 'qui', 'sex'],
      teachers,
      classes,
      classrooms: [] as Classroom[],
      preferences: { min_gaps: true, group_labs: false },
    };

    const scheduler = new GeneticScheduler(input);
    const solutions = scheduler.generate();

    // Check if we got any solution
    expect(solutions.length).toBeGreaterThan(0);
    const bestSolution = solutions[0];
    const schedule = bestSolution.schedule;

    // Helper to count conflicts
    const countConflicts = (lessons: any[], key: string) => {
        let conflicts = 0;
        const groups = new Map<string, any[]>();
        lessons.forEach(l => {
            const k = `${l[key]}-${l.day}-${l.period}`;
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k)!.push(l);
        });
        groups.forEach(group => {
            if (group.length > 1) conflicts += group.length - 1;
        });
        return conflicts;
    };

    const teacherConflicts = countConflicts(schedule, 'teacher_id');
    const classConflicts = countConflicts(schedule, 'class_id');

    // Expect STRICT compliance: 0 conflicts
    expect(teacherConflicts).toBe(0);
    expect(classConflicts).toBe(0);

    // Verify all lessons are scheduled
    // 2 classes * 2 subjects = 4 lessons total
    expect(schedule.length).toBe(4);

    // Verify availability is respected
    schedule.forEach(lesson => {
        const teacher = teachers.find(t => t.id === lesson.teacher_id);
        const isAvailable = teacher?.disponibility.some(d => d.day === lesson.day && d.period === lesson.period);
        expect(isAvailable).toBe(true);
    });
  });
});
