export interface TimeSlot {
  day: string; // 'seg', 'ter', 'qua', 'qui', 'sex'
  period: number; // 1 to periods_per_day
}

export interface Teacher {
  id: string;
  name: string;
  disponibility: TimeSlot[]; // Slots where teacher CAN teach
}

export interface Subject {
  name: string;
  teacher_id: string;
  hours_per_week: number;
}

export interface ClassGroup {
  id: string;
  name: string;
  year: number;
  subjects: Subject[];
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
}

export interface ScheduleInput {
  name: string;
  periods: number;
  days: string[];
  teachers: Teacher[];
  classes: ClassGroup[];
  classrooms: Classroom[];
  preferences: {
    min_gaps: boolean;
    group_labs: boolean;
  };
}

export interface Conflict {
  type: 'double_booking' | 'teacher_unavailable' | 'class_overlap';
  message: string;
}

export interface Lesson {
  day: string;
  period: number;
  class_id: string;
  subject: string;
  teacher_id: string;
  classroom_id?: string;
  conflict?: Conflict;
}

export interface ScheduleSolution {
  score: number;
  schedule: Lesson[];
  conflicts?: Conflict[]; // Optional summary of conflicts
}
