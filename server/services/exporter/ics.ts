import * as ics from 'ics';
import { ScheduleSolution } from '../scheduler/types.js';

export const generateICS = (schedule: ScheduleSolution, orgName: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const events: ics.EventAttributes[] = schedule.schedule.map(lesson => {
      // Map day string to next occurrence date (simplified)
      // In a real app, we'd calculate the actual dates for the semester
      // For now, we'll just create a recurring rule or single events for next week
      
      const dayMap: Record<string, number> = { 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5 };
      const today = new Date();
      const currentDay = today.getDay(); // 0=Sun, 1=Mon
      const targetDay = dayMap[lesson.day];
      
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7; // Next week occurrence
      
      const date = new Date(today);
      date.setDate(today.getDate() + daysUntil);
      
      // Assume period 1 starts at 07:00 and lasts 50min
      const startHour = 7 + Math.floor((lesson.period - 1)); // Simplified logic
      
      return {
        start: [date.getFullYear(), date.getMonth() + 1, date.getDate(), startHour, 0],
        duration: { minutes: 50 },
        title: `${lesson.subject} (${lesson.class_id})`,
        description: `Professor: ${lesson.teacher_id}`,
        location: orgName,
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
        organizer: { name: orgName, email: 'admin@horaprofe.com.br' },
      };
    });

    ics.createEvents(events, (error, value) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(value || '');
    });
  });
};
