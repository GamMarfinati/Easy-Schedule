import { GoogleGenAI, Type } from "@google/genai";
import { Teacher, Schedule } from "../types";
import { DAYS_OF_WEEK } from "../constants";

/**
 * Transforms a flat array of schedule items from the Gemini API into the nested
 * object structure the application's UI components expect.
 * @param flatSchedule The array of schedule items from the API.
 * @param timeSlots The list of defined time slots for a day.
 * @returns A nested Schedule object.
 */
const transformFlatScheduleToNested = (flatSchedule: any[], timeSlots: string[]): Schedule => {
    // Initialize the schedule with all slots as null for all days of the week.
    const nestedSchedule: Schedule = {};
    for (const day of DAYS_OF_WEEK) {
        nestedSchedule[day] = {};
        for (const slot of timeSlots) {
            nestedSchedule[day][slot] = null;
        }
    }

    // Populate the schedule with the class data from the flat array.
    for (const item of flatSchedule) {
        if (item && item.day && item.timeSlot) {
            // Ensure the day and timeSlot from the AI exist in our definitions to prevent errors.
            if (nestedSchedule[item.day] && nestedSchedule[item.day].hasOwnProperty(item.timeSlot)) {
                 nestedSchedule[item.day][item.timeSlot] = {
                    grade: item.grade,
                    subject: item.subject,
                    teacherName: item.teacherName,
                };
            }
        }
    }
    return nestedSchedule;
};


/**
 * Validates the generated schedule to ensure there are no logical conflicts,
 * such as a teacher or a grade being in two places at once.
 * This acts as a safeguard against the AI potentially generating a faulty schedule.
 * @param scheduleData The raw, parsed JSON data from the Gemini API.
 * @throws An error if a conflict is detected.
 */
const validateGeneratedSchedule = (scheduleData: any): void => {
    if (typeof scheduleData !== 'object' || scheduleData === null) {
        return; // Not a valid schedule object to validate.
    }

    // This validation checks if a specific teacher or a specific grade is booked more than once at the same time on any given day.
    for (const day in scheduleData) {
        const daySchedule = scheduleData[day];
        if (typeof daySchedule !== 'object' || daySchedule === null) continue;

        const teacherBookingsForDay = new Map<string, Set<string>>(); // teacherName -> Set of times
        const gradeBookingsForDay = new Map<string, Set<string>>(); // grade -> Set of times

        // Aggregate all bookings for the day to check for duplicates.
        for (const time in daySchedule) {
            // The AI might return a single object or an array. We handle both.
            const slots = Array.isArray(daySchedule[time]) ? daySchedule[time] : [daySchedule[time]];
            for (const slot of slots) {
                if (typeof slot !== 'object' || slot === null || !slot.grade || !slot.teacherName) continue;

                // Check for teacher conflict (same teacher, same time)
                if (!teacherBookingsForDay.has(slot.teacherName)) {
                    teacherBookingsForDay.set(slot.teacherName, new Set());
                }
                const teacherTimes = teacherBookingsForDay.get(slot.teacherName)!;
                if (teacherTimes.has(time)) {
                    throw new Error(`Conflito de agendamento: O professor '${slot.teacherName}' está agendado para mais de uma aula no mesmo horário (${day}, ${time}).`);
                }
                teacherTimes.add(time);

                // Check for grade conflict (same grade, same time)
                if (!gradeBookingsForDay.has(slot.grade)) {
                    gradeBookingsForDay.set(slot.grade, new Set());
                }
                const gradeTimes = gradeBookingsForDay.get(slot.grade)!;
                if (gradeTimes.has(time)) {
                    throw new Error(`Conflito de agendamento: A turma '${slot.grade}' está agendada para mais de uma aula no mesmo horário (${day}, ${time}).`);
                }
                gradeTimes.add(time);
            }
        }
    }
};


export const generateSchedule = async (teachers: Teacher[], timeSlots: string[]): Promise<Schedule> => {
    // Clean teacher data to remove frontend-specific UUIDs before sending to the AI.
    const cleanedTeachers = teachers.map(({ id, name, subject, availabilityDays, classAssignments }) => ({
        name,
        subject,
        availabilityDays,
        classAssignments: classAssignments.map(({ id: assignmentId, grade, classCount }) => ({
            grade,
            classCount
        }))
    }));
    
    // Define the response schema for the AI. This makes the output more reliable.
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            schedule: {
                type: Type.ARRAY,
                description: "A lista de todas as aulas alocadas na grade horária. Ficará vazia se um erro ocorrer.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        day: { type: Type.STRING, description: "O dia da semana (ex: 'Segunda-feira')." },
                        timeSlot: { type: Type.STRING, description: "O período da aula (ex: '1ª Aula')." },
                        grade: { type: Type.STRING, description: "A turma para a qual a aula é (ex: '9º Ano EF')." },
                        subject: { type: Type.STRING, description: "A disciplina da aula (ex: 'Matemática')." },
                        teacherName: { type: Type.STRING, description: "O nome do professor que ministrará a aula." },
                    },
                    required: ['day', 'timeSlot', 'grade', 'subject', 'teacherName'],
                },
            },
            error: {
                type: Type.STRING,
                description: "Uma mensagem de erro descritiva se a grade não puder ser gerada. Será nulo ou ausente em caso de sucesso.",
                nullable: true,
            },
        },
    };

    const prompt = `
        Você é um especialista em coordenação pedagógica. Sua tarefa é criar uma grade horária semanal sem conflitos com base nas informações dos professores e nas restrições fornecidas.

        **Restrições:**
        1. A semana letiva é de Segunda-feira a Sexta-feira.
        2. A grade horária do dia consiste nos seguintes períodos: ${timeSlots.join(', ')}. Alguns períodos podem ser para aulas (ex: "1ª Aula") e outros para pausas (ex: "Intervalo", "Almoço"). Você não deve alocar aulas em períodos designados como pausas.
        3. Um professor só pode dar uma aula de cada vez.
        4. Uma turma específica (ex: '1º Ano EM') só pode ter uma aula de cada vez.
        5. Aloque os professores apenas em seus dias de disponibilidade.
        6. Cumpra exatamente o número de aulas necessárias para cada turma, conforme especificado para cada professor.
        7. Distribua as aulas de um mesmo professor para uma mesma turma em dias diferentes, se possível. Evite aulas duplas (geminadas).

        **Formato da Resposta:**
        - O resultado DEVE ser um objeto JSON válido que corresponda ao esquema fornecido.
        - Em caso de sucesso, retorne um objeto com uma chave "schedule" contendo uma lista de todas as aulas alocadas.
        - Se for impossível criar uma grade que satisfaça TODAS as restrições, retorne um objeto com uma chave "error" contendo uma string que descreva o conflito específico encontrado.

        **Informações dos Professores:**
        ${JSON.stringify(cleanedTeachers, null, 2)}

        Crie a grade horária completa agora. Sua resposta DEVE SER APENAS o objeto JSON.
    `;

    try {
        const hasApiKey = await window.aistudio.hasSelectedApiKey();
        if (!hasApiKey) {
            throw new Error("API_KEY_NOT_SELECTED");
        }
        
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) {
            throw new Error("A chave de API foi selecionada, mas não está disponível no ambiente. Tente recarregar a página.");
        }
        
        const geminiAI = new GoogleGenAI({ apiKey: API_KEY });
        
        const response = await geminiAI.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                thinkingConfig: { thinkingBudget: 32768 }
            }
        });

        const text = response?.text;
        if (!text || typeof text !== 'string' || text.trim() === '') {
            throw new Error("A IA retornou uma resposta vazia ou com formato inesperado. Verifique os dados e tente novamente.");
        }

        let result;
        try {
            result = JSON.parse(text.trim());
        } catch (jsonError) {
            console.error("Falha ao analisar o JSON da resposta da IA:", text);
            throw new Error("A IA gerou uma resposta, mas o formato do JSON é inválido. Por favor, tente gerar novamente.");
        }
        
        if (result.error) {
            throw new Error(`A IA detectou um conflito de agendamento: ${result.error}`);
        }

        if (!result.schedule) {
             throw new Error("A IA retornou uma resposta válida, mas sem a grade horária. Verifique os dados dos professores.");
        }

        const schedule = transformFlatScheduleToNested(result.schedule, timeSlots);
        validateGeneratedSchedule(schedule);
        return schedule;

    } catch (error) {
        console.error("Error generating schedule with Gemini:", error);

        if (error instanceof Error) {
            // Re-throw specific, user-friendly errors we've created inside the try block.
            const userFriendlyErrors = ["API_KEY_NOT_SELECTED", "conflito", "inválido", "inesperado", "sem a grade horária"];
            if (userFriendlyErrors.some(keyword => error.message.includes(keyword))) {
                throw error;
            }
            // Catch the specific API key not found error from the SDK.
            if (error.message.includes("Requested entity was not found")) {
                throw new Error("API_KEY_NOT_SELECTED");
            }
        }
        
        // All other errors (network, internal SDK errors, etc.) get the generic message.
        throw new Error("Não foi possível gerar a grade horária. Verifique a conexão e os dados dos professores e tente novamente.");
    }
};
