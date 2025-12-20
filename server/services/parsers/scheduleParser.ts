
export const parseGeminiResponse = (text: string) => {
  try {
    // Remove marcadores de código Markdown se houver
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Encontra o primeiro { e o último }
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('Nenhum objeto JSON válido encontrado na resposta.');
    }

    const jsonString = cleanText.substring(firstBrace, lastBrace + 1);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Erro ao fazer parse da resposta do Gemini:', error);
    throw new Error('Falha ao processar o formato da resposta da IA.');
  }
};

interface ScheduleSlot {
  grade: string;
  subject: string;
  teacherName: string;
}

export const transformToFrontendSchedule = (
  aiSchedule: any, 
  timeSlots: string[]
): any => {
  const schedule: any = {};
  
  // Inicializa a estrutura
  // Embora o frontend use [day][slot] = [], aqui vamos construir dinamicamente
  
  Object.entries(aiSchedule).forEach(([teacherName, days]: [string, any]) => {
    Object.entries(days).forEach(([day, slots]: [string, any]) => {
      if (!Array.isArray(slots)) return;

      if (!schedule[day]) schedule[day] = {};

      slots.forEach((slotData: any, index: number) => {
        // Se houver aula neste slot
        if (slotData && slotData.turma) {
          const timeSlotLabel = timeSlots[index];
          
          if (timeSlotLabel) {
            if (!schedule[day][timeSlotLabel]) {
              schedule[day][timeSlotLabel] = [];
            }

            schedule[day][timeSlotLabel].push({
              grade: slotData.turma,
              subject: slotData.disciplina || slotData.turma, // Fallback
              teacherName: teacherName
            });
          }
        }
      });
    });
  });

  return schedule;
};

/**
 * Converte o formato Flat do Determinístico para o Nested do Frontend
 */
export const transformFlatToFrontend = (flatSchedule: any[]): any => {
  const schedule: any = {};

  flatSchedule.forEach(item => {
    if (!schedule[item.day]) {
      schedule[item.day] = {};
    }
    
    if (!schedule[item.day][item.timeSlot]) {
      schedule[item.day][item.timeSlot] = [];
    }

    schedule[item.day][item.timeSlot].push({
      grade: item.grade,
      subject: item.subject,
      teacherName: item.teacherName,
      conflict: item.conflict
    });
  });

  return schedule;
};
