interface FlatLesson {
  day: string;
  timeSlot: string;
  teacherName: string;
}

interface TeacherAvailability {
  name: string;
  availabilityDays: string[];
}

export interface ScheduleQualityMetrics {
  totalGaps: number;
  singleLessonDays: number;
  availabilityViolations: number;
  adherencePercent: number;
  totalLessons: number;
}

const countGapOccurrences = (periods: number[]): number => {
  if (periods.length <= 1) return 0;
  const sorted = [...periods].sort((a, b) => a - b);
  let gaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > 1) {
      gaps += 1;
    }
  }
  return gaps;
};

export const computeScheduleQuality = (
  flatSchedule: FlatLesson[],
  teachers: TeacherAvailability[],
  timeSlots: string[]
): ScheduleQualityMetrics => {
  const timeSlotIndex = new Map<string, number>(timeSlots.map((slot, idx) => [slot, idx + 1]));
  const teacherAvailability = new Map<string, Set<string>>();
  teachers.forEach(teacher => {
    teacherAvailability.set(teacher.name, new Set(teacher.availabilityDays));
  });

  const teacherDayPeriods = new Map<string, Map<string, number[]>>();
  let availabilityViolations = 0;

  flatSchedule.forEach(lesson => {
    const slotIndex = timeSlotIndex.get(lesson.timeSlot);
    if (!slotIndex) return;

    const dayMap = teacherDayPeriods.get(lesson.teacherName) ?? new Map<string, number[]>();
    const periods = dayMap.get(lesson.day) ?? [];
    periods.push(slotIndex);
    dayMap.set(lesson.day, periods);
    teacherDayPeriods.set(lesson.teacherName, dayMap);

    const availability = teacherAvailability.get(lesson.teacherName);
    if (!availability || !availability.has(lesson.day)) {
      availabilityViolations += 1;
    }
  });

  let totalGaps = 0;
  let singleLessonDays = 0;

  teacherDayPeriods.forEach(dayMap => {
    dayMap.forEach(periods => {
      totalGaps += countGapOccurrences(periods);
      if (periods.length === 1) {
        singleLessonDays += 1;
      }
    });
  });

  const totalLessons = flatSchedule.length;
  const adherencePercent = totalLessons > 0
    ? Math.round(((totalLessons - availabilityViolations) / totalLessons) * 100)
    : 100;

  return {
    totalGaps,
    singleLessonDays,
    availabilityViolations,
    adherencePercent,
    totalLessons
  };
};
