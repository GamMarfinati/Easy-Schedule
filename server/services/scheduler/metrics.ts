
import { Schedule } from '../../../types.js';

export interface ScheduleQualityMetrics {
  totalGaps: number;
  singleClassDays: number;
  availability: string;
  totalLessons: number;
}

export const calculateMetrics = (schedule: any, teachers: any[]): ScheduleQualityMetrics => {
  let totalGaps = 0;
  let singleClassDays = 0;
  let totalLessons = 0;

  // Itera sobre cada professor na grade
  Object.entries(schedule).forEach(([teacherName, days]: [string, any]) => {
    if (teacherName === 'metadata') return;

    Object.values(days).forEach((classes: any) => {
      if (!Array.isArray(classes)) return;

      // Conta aulas no dia
      const lessons = classes.filter(c => c !== null && c.turma); 
      const dailyCount = lessons.length;
      
      if (dailyCount > 0) {
        totalLessons += dailyCount;
        if (dailyCount === 1) singleClassDays++;
      }

      // Conta janelas
      // Mapeia para indices ocupados: [0, 1, 3] (aula na 1ª, 2ª e 4ª -> buraco na 3ª)
      const occupiedIndices = classes
        .map((c, i) => (c && c.turma ? i : -1))
        .filter(i => i !== -1);
      
      if (occupiedIndices.length > 1) {
        for (let i = 0; i < occupiedIndices.length - 1; i++) {
          // Se a distância entre uma aula e outra for > 1, tem janela
          if (occupiedIndices[i+1] - occupiedIndices[i] > 1) {
            totalGaps += (occupiedIndices[i+1] - occupiedIndices[i] - 1);
          }
        }
      }
    });
  });

  return {
    totalGaps,
    singleClassDays,
    availability: '100%', // Simplificado para este fix
    totalLessons
  };
};
