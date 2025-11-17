import { GoogleGenAI } from "@google/genai";
import { Teacher, Schedule } from "../types";

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
    // FIX: Clean teacher data to remove frontend-specific UUIDs before sending to the AI.
    // This reduces prompt complexity and prevents potential model confusion with irrelevant data.
    const cleanedTeachers = teachers.map(({ id, name, subject, availabilityDays, classAssignments }) => ({
        name,
        subject,
        availabilityDays,
        classAssignments: classAssignments.map(({ id: assignmentId, grade, classCount }) => ({
            grade,
            classCount
        }))
    }));

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
        - O resultado DEVE ser um objeto JSON válido.
        - As chaves de nível superior devem ser os dias da semana: "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira".
        - Cada dia deve ser um objeto onde as chaves são os períodos definidos: ${timeSlots.map(t => `"${t}"`).join(', ')}.
        - O valor para cada período de aula deve ser um objeto com as chaves "grade", "subject", e "teacherName".
        - O valor para períodos que não são de aula (como intervalos ou almoço) ou horários vagos deve ser \`null\`.
        - Exemplo para um horário preenchido: \`"1ª Aula": {"grade": "1º Ano EM", "subject": "Português", "teacherName": "Maria Souza"}\`
        - Exemplo para um horário vago ou intervalo: \`"Intervalo": null\`

        **Regra de Falha:**
        - Se for impossível criar uma grade que satisfaça TODAS as restrições, em vez da grade, retorne um objeto JSON com uma única chave "error" contendo uma string que descreva o conflito específico encontrado.
        - Exemplo de erro: \`{"error": "Não foi possível alocar todas as aulas de Maria Souza (Português) para o 1º Ano EM devido à falta de horários disponíveis."}\`

        **IMPORTANTE:** Sua resposta DEVE CONTER APENAS o objeto JSON, seja a grade completa ou o objeto de erro. Não inclua texto explicativo, markdown (como \`\`\`json\`), ou qualquer outra coisa fora do JSON.

        **Informações dos Professores:**
        ${JSON.stringify(cleanedTeachers, null, 2)}

        Crie a grade horária completa agora.
    `;

    try {
        // AI Studio Integration: Check for API key selection before making a call.
        const hasApiKey = await window.aistudio.hasSelectedApiKey();
        if (!hasApiKey) {
            // Throw a specific error for the UI to handle and prompt for key selection.
            throw new Error("API_KEY_NOT_SELECTED");
        }
        
        // The API key is injected into process.env by the environment after selection.
        const API_KEY = process.env.API_KEY;
        if (!API_KEY) {
            // Fallback error if the key isn't available after selection.
            throw new Error("A chave de API foi selecionada, mas não está disponível no ambiente. Tente recarregar a página.");
        }
        
        // Per guidance, create a new instance for each request to ensure the latest key is used.
        const geminiAI = new GoogleGenAI({ apiKey: API_KEY });
        
        const response = await geminiAI.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                thinkingConfig: { thinkingBudget: 32768 }
            },
        });

        const text = response.text.trim();
        
        // Robust JSON extraction logic
        let jsonString = text;
        const markdownMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (markdownMatch && markdownMatch[1]) {
            jsonString = markdownMatch[1].trim();
        }

        const firstBracket = jsonString.indexOf('{');
        const firstSquareBracket = jsonString.indexOf('[');
        
        let start = -1;
        if (firstBracket === -1) {
            start = firstSquareBracket;
        } else if (firstSquareBracket === -1) {
            start = firstBracket;
        } else {
            start = Math.min(firstBracket, firstSquareBracket);
        }

        if (start === -1) {
            console.error("No JSON object or array found in Gemini response. Raw response:", text);
            throw new Error("A IA retornou uma resposta vazia ou em formato inesperado. Por favor, tente gerar novamente.");
        }
        
        const lastBracket = jsonString.lastIndexOf('}');
        const lastSquareBracket = jsonString.lastIndexOf(']');
        const end = Math.max(lastBracket, lastSquareBracket);
        
        if (end === -1) {
             console.error("Malformed JSON in Gemini response. Raw response:", text);
             throw new Error("A IA retornou uma resposta em formato inesperado. Por favor, tente gerar novamente.");
        }

        jsonString = jsonString.substring(start, end + 1);

        try {
            const result = JSON.parse(jsonString);
            
            if (result.error) {
                throw new Error(`A IA detectou um conflito de agendamento: ${result.error}`);
            }

            // Validate the schedule for logical conflicts before accepting it.
            validateGeneratedSchedule(result);

            const schedule = result as Schedule;
            return schedule;
        } catch (jsonError) {
             console.error("Failed to parse or validate JSON from Gemini response. Cleaned JSON string:", jsonString, "Original response:", text, "Error:", jsonError);
             if (jsonError instanceof Error && (jsonError.message.startsWith("A IA detectou") || jsonError.message.includes("Conflito de agendamento"))) {
                throw jsonError;
             }
             throw new Error("A IA gerou uma resposta, mas o formato do JSON é inválido ou contém conflitos internos. Por favor, tente gerar novamente.");
        }

    } catch (error) {
        console.error("Error generating schedule with Gemini:", error);
        if (error instanceof Error) {
            // Handle specific errors to guide the user.
            if (error.message.includes("API_KEY_NOT_SELECTED")) {
                 throw error; // Re-throw for the UI to handle.
            }
            // If the key is invalid or revoked, prompt the user to select a new one.
            if (error.message.includes("Requested entity was not found")) {
                throw new Error("API_KEY_NOT_SELECTED");
            }
             // Re-throw our other custom, more specific errors to be displayed in the UI.
            if (error.message.includes("conflito") || error.message.includes("formato inesperado") || error.message.includes("JSON é inválido")) {
                 throw error;
            }
        }
        // Throw a generic error for other API or network issues
        throw new Error("Não foi possível gerar a grade horária. Verifique a conexão e os dados dos professores e tente novamente.");
    }
};