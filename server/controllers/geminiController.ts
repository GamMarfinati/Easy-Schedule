import { Request, Response } from 'express';
import { GoogleGenAI, Type } from "@google/genai";

const DAYS_OF_WEEK = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
];

interface Schedule {
    [day: string]: {
        [timeSlot: string]: {
            grade: string;
            subject: string;
            teacherName: string;
        } | null;
    };
}

// --- Helper Functions ---

const transformFlatScheduleToNested = (flatSchedule: any[], timeSlots: string[]): Schedule => {
    const nestedSchedule: Schedule = {};
    for (const day of DAYS_OF_WEEK) {
        nestedSchedule[day] = {};
        for (const slot of timeSlots) {
            nestedSchedule[day][slot] = null;
        }
    }

    for (const item of flatSchedule) {
        if (item && item.day && item.timeSlot) {
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

const validateGeneratedSchedule = (scheduleData: any): void => {
    if (typeof scheduleData !== 'object' || scheduleData === null) return;
    for (const day in scheduleData) {
        const daySchedule = scheduleData[day];
        if (typeof daySchedule !== 'object' || daySchedule === null) continue;

        const teacherBookingsForDay = new Map<string, Set<string>>();
        const gradeBookingsForDay = new Map<string, Set<string>>();

        for (const time in daySchedule) {
            const slots = Array.isArray(daySchedule[time]) ? daySchedule[time] : [daySchedule[time]];
            for (const slot of slots) {
                if (typeof slot !== 'object' || slot === null || !slot.grade || !slot.teacherName) continue;
                if (!teacherBookingsForDay.has(slot.teacherName)) teacherBookingsForDay.set(slot.teacherName, new Set());
                if (teacherBookingsForDay.get(slot.teacherName)!.has(time)) throw new Error(`Conflito de agendamento: O professor '${slot.teacherName}' está agendado para mais de uma aula no mesmo horário (${day}, ${time}).`);
                teacherBookingsForDay.get(slot.teacherName)!.add(time);

                if (!gradeBookingsForDay.has(slot.grade)) gradeBookingsForDay.set(slot.grade, new Set());
                if (gradeBookingsForDay.get(slot.grade)!.has(time)) throw new Error(`Conflito de agendamento: A turma '${slot.grade}' está agendada para mais de uma aula no mesmo horário (${day}, ${time}).`);
                gradeBookingsForDay.get(slot.grade)!.add(time);
            }
        }
    }
};

// --- Main Controller ---

export const generateScheduleAI = async (req: Request, res: Response) => {
    try {
        const { teachers, timeSlots } = req.body;

        if (!teachers || !timeSlots || !Array.isArray(teachers) || !Array.isArray(timeSlots)) {
            return res.status(400).json({ error: 'Dados de entrada inválidos.' });
        }

        const cleanedTeachers = teachers.map(({ id, name, subject, availabilityDays, classAssignments }: any) => ({
            name,
            subject,
            availabilityDays,
            classAssignments: classAssignments.map(({ id: assignmentId, grade, classCount }: any) => ({ grade, classCount }))
        }));

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                schedule: { type: Type.ARRAY, description: "Lista de aulas.", items: { type: Type.OBJECT, properties: { day: { type: Type.STRING }, timeSlot: { type: Type.STRING }, grade: { type: Type.STRING }, subject: { type: Type.STRING }, teacherName: { type: Type.STRING } }, required: ['day', 'timeSlot', 'grade', 'subject', 'teacherName'] } },
                error: { type: Type.STRING, description: "Mensagem de erro.", nullable: true },
            },
        };

        const prompt = `
            Você é um especialista em coordenação pedagógica. Sua tarefa é criar uma grade horária semanal sem conflitos com base nas informações dos professores e nas restrições fornecidas.
            Restrições:
            1. Semana letiva: ${DAYS_OF_WEEK.join(', ')}.
            2. Períodos do dia: ${timeSlots.join(', ')}. Não aloque aulas em períodos de pausa (ex: "Intervalo").
            3. Um professor só pode dar uma aula de cada vez.
            4. Uma turma só pode ter uma aula de cada vez.
            5. Aloque professores apenas em seus dias de disponibilidade.
            6. Cumpra exatamente o número de aulas para cada turma.
            7. Evite aulas duplas (geminadas) se possível.
            Formato da Resposta: Objeto JSON válido com a chave "schedule" (sucesso) ou "error" (falha).
            Informações dos Professores: ${JSON.stringify(cleanedTeachers, null, 2)}
            Crie a grade horária. Sua resposta DEVE SER APENAS o objeto JSON.`;

        // Updated API Key Check including GOOGLE_API_KEY
        const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: "API_KEY_MISSING: A variável de ambiente GOOGLE_API_KEY não foi configurada no servidor." });
        }

        const geminiAI = new GoogleGenAI({ apiKey: API_KEY });
        const response = await geminiAI.models.generateContent({
            model: "gemini-2.0-flash-lite-preview-02-05", // Using the preview version as 'lite' generic alias might not be live yet
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                // @ts-ignore
                responseSchema: responseSchema,
            }
        });

        const text = response?.text;
        if (!text || text.trim() === '') {
            return res.status(500).json({ error: "A IA retornou uma resposta vazia." });
        }

        const result = JSON.parse(text.trim());

        if (result.error) {
            return res.status(400).json({ error: `A IA detectou um conflito: ${result.error}` });
        }

        if (!result.schedule) {
            return res.status(500).json({ error: "A IA retornou uma resposta válida, mas sem a grade horária." });
        }

        const schedule = transformFlatScheduleToNested(result.schedule, timeSlots);
        validateGeneratedSchedule(schedule);

        return res.status(200).json({ schedule });

    } catch (error) {
        console.error("Erro na função de geração de grade (AI):", error);

        let errorMessage = "Erro interno do servidor ao gerar a grade.";
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("permission denied") || message.includes("api has not been used")) {
                errorMessage = "API_PERMISSION_DENIED: A API Gemini não foi ativada no projeto Google Cloud associado a esta chave.";
                return res.status(403).json({ error: errorMessage });
            }
            if (message.includes("json")) {
                errorMessage = "A IA gerou uma resposta com JSON inválido.";
            }
        }

        return res.status(500).json({ error: errorMessage });
    }
};
