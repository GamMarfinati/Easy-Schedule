
export interface ClassAssignment {
  id: string;
  grade: string;
  classCount: number;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  availabilityDays: string[];
  classAssignments: ClassAssignment[];
}

export interface ScheduleSlot {
  grade: string;
  subject: string;
  teacherName: string;
}

export type Schedule = {
  [day: string]: {
    [timeSlot: string]: ScheduleSlot | null;
  };
};
