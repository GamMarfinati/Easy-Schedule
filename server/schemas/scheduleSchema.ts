import { z } from 'zod';

const TimeSlotSchema = z.object({
  day: z.enum(['seg', 'ter', 'qua', 'qui', 'sex']),
  period: z.number().int().min(1),
});

const TeacherSchema = z.object({
  id: z.string(),
  name: z.string(),
  disponibility: z.array(TimeSlotSchema),
});

const SubjectSchema = z.object({
  name: z.string(),
  teacher_id: z.string(),
  hours_per_week: z.number().int().min(1),
});

const ClassGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.number().int(),
  subjects: z.array(SubjectSchema),
});

const ClassroomSchema = z.object({
  id: z.string(),
  name: z.string(),
  capacity: z.number().int().min(1),
});

export const ScheduleInputSchema = z.object({
  name: z.string().min(3),
  periods: z.number().int().min(1).max(10), // Reasonable limit
  days: z.array(z.string()),
  teachers: z.array(TeacherSchema),
  classes: z.array(ClassGroupSchema),
  classrooms: z.array(ClassroomSchema).optional(),
  preferences: z.object({
    min_gaps: z.boolean().optional(),
    group_labs: z.boolean().optional(),
  }).optional(),
});
