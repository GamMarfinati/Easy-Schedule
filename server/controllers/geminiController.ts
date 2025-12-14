import { Request, Response } from 'express';
import { GoogleGenAI, Type } from "@google/genai";
import { 
    validarGrade, 
    converterParaRegras, 
    converterParaAulas, 
    gerarPromptCorrecao,
    ValidacaoResultado,
    ProfessorRegra,
    Aula
} from '../services/scheduler/validator.js';
import { runGeneticScheduler } from '../services/scheduler/adapter.js';

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

// Configurações do Loop de Auto-Correção
const MAX_RETRY_ATTEMPTS = 5; // Aumentado para dar mais chances de auto-correção
const AI_MODEL = "gemini-2.0-flash"; // Modelo otimizado para velocidade e precisão
const AI_TEMPERATURE = 0.1; // Baixa temperatura para respostas mais determinísticas

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

/**
 * Gera o System Instruction otimizado para forçar JSON estruturado
 */
const buildSystemInstruction = () => `
Você é um sistema especializado em geração de quadros de horários escolares.
Sua ÚNICA função é gerar grades horárias em formato JSON válido e matematicamente correto.

REGRAS CRÍTICAS (VIOLAÇÃO = FALHA):
1. Você DEVE respeitar EXATAMENTE o número de aulas especificado para cada professor/turma
2. Um professor NUNCA pode estar em duas turmas ao mesmo tempo (bilocação é impossível)
3. Uma turma NUNCA pode ter duas aulas simultâneas
4. Professores só podem ser alocados em seus dias disponíveis
5. Sua resposta DEVE SER APENAS JSON válido, sem texto adicional

ANTES de gerar a resposta, VERIFIQUE internamente:
- Contagem de aulas por professor por turma
- Ausência de conflitos de horário
- Respeito aos dias de disponibilidade
`;

/**
 * Gera o prompt principal com contexto completo
 */
const buildMainPrompt = (cleanedTeachers: any[], timeSlots: string[], allGrades: string[]) => `
TAREFA: Criar uma grade horária semanal completa para TODAS as turmas simultaneamente.

📅 ESTRUTURA DA SEMANA:
- Dias letivos: ${DAYS_OF_WEEK.join(', ')}
- Períodos/Horários: ${timeSlots.join(', ')}
- Turmas a contemplar: ${allGrades.join(', ')}

👨‍🏫 DADOS DOS PROFESSORES (RESPEITE EXATAMENTE):
${JSON.stringify(cleanedTeachers, null, 2)}

⚠️ INSTRUÇÕES MATEMÁTICAS:
Para cada professor listado acima:
- classCount indica QUANTAS aulas ele deve ter naquela turma
- Exemplo: se classCount=5, esse professor DEVE aparecer EXATAMENTE 5 vezes nessa turma
- availabilityDays são os ÚNICOS dias onde ele pode dar aula

📋 FORMATO DE RESPOSTA OBRIGATÓRIO:
{
  "schedule": [
    {
      "day": "Segunda-feira",
      "timeSlot": "${timeSlots[0] || '08:00-08:50'}",
      "grade": "Nome da Turma",
      "subject": "Nome da Disciplina",
      "teacherName": "Nome do Professor"
    }
  ]
}

GERE A GRADE AGORA. Responda APENAS com o JSON.
`;

/**
 * Gera o prompt de correção após erro de validação
 */
const buildCorrectionPrompt = (
    errosTexto: string, 
    cleanedTeachers: any[], 
    previousSchedule: any[],
    timeSlots: string[],
    allGrades: string[]
) => `
⚠️ SUA GRADE ANTERIOR CONTÉM ERROS QUE PRECISAM SER CORRIGIDOS!

${errosTexto}

📊 GRADE ANTERIOR (COM ERROS):
${JSON.stringify(previousSchedule.slice(0, 10), null, 2)}
... (${previousSchedule.length} itens no total)

📋 DADOS ORIGINAIS DOS PROFESSORES (REFERÊNCIA):
${JSON.stringify(cleanedTeachers, null, 2)}

📅 ESTRUTURA:
- Dias: ${DAYS_OF_WEEK.join(', ')}
- Horários: ${timeSlots.join(', ')}
- Turmas: ${allGrades.join(', ')}

GERE UMA NOVA GRADE CORRIGIDA. Responda APENAS com o JSON no mesmo formato.
`;

// --- Main Controller ---

export const generateScheduleAI = async (req: Request, res: Response) => {
    try {
        const { teachers, timeSlots } = req.body;

        if (!teachers || !timeSlots || !Array.isArray(teachers) || !Array.isArray(timeSlots)) {
            return res.status(400).json({ error: 'Dados de entrada inválidos.' });
        }

        // Preparar dados dos professores (remover IDs para o prompt)
        const cleanedTeachers = teachers.map(({ id, name, subject, availabilityDays, classAssignments }: any) => ({
            name,
            subject,
            availabilityDays,
            classAssignments: classAssignments.map(({ id: assignmentId, grade, classCount }: any) => ({ grade, classCount }))
        }));

        // Extrair todas as turmas únicas
        const allGrades = [...new Set(
            teachers.flatMap((t: any) => t.classAssignments.map((a: any) => a.grade))
        )] as string[];

        // Converter para regras de validação
        const regrasValidacao: ProfessorRegra[] = converterParaRegras(cleanedTeachers);

        // Schema de resposta para o Gemini
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                schedule: { 
                    type: Type.ARRAY, 
                    description: "Lista completa de aulas da semana.", 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            day: { type: Type.STRING, description: "Dia da semana" }, 
                            timeSlot: { type: Type.STRING, description: "Horário da aula" }, 
                            grade: { type: Type.STRING, description: "Nome da turma" }, 
                            subject: { type: Type.STRING, description: "Nome da disciplina" }, 
                            teacherName: { type: Type.STRING, description: "Nome do professor" } 
                        }, 
                        required: ['day', 'timeSlot', 'grade', 'subject', 'teacherName'] 
                    } 
                },
                error: { type: Type.STRING, description: "Mensagem de erro se impossível gerar.", nullable: true },
            },
        };

        // Verificar API Key
        const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: "API_KEY_MISSING: A variável de ambiente GOOGLE_API_KEY não foi configurada no servidor." });
        }

        const geminiAI = new GoogleGenAI({ apiKey: API_KEY });

        // ============================================================
        // LOOP DE AUTO-CORREÇÃO AGENTIC
        // ============================================================
        let currentSchedule: any[] = [];
        let validationResult: ValidacaoResultado = { valido: false, erros: [] };
        let attempts = 0;
        let lastError = '';

        console.log(`[Scheduler] Iniciando geração para ${allGrades.length} turmas, ${teachers.length} professores`);

        while (!validationResult.valido && attempts < MAX_RETRY_ATTEMPTS) {
            attempts++;
            console.log(`[Scheduler] Tentativa ${attempts}/${MAX_RETRY_ATTEMPTS}`);

            try {
                // Construir prompt apropriado
                const prompt = attempts === 1 
                    ? buildMainPrompt(cleanedTeachers, timeSlots, allGrades)
                    : buildCorrectionPrompt(lastError, cleanedTeachers, currentSchedule, timeSlots, allGrades);

                // Chamar Gemini
                const response = await geminiAI.models.generateContent({
                    model: AI_MODEL,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        // @ts-ignore
                        responseSchema: responseSchema,
                        temperature: AI_TEMPERATURE,
                        systemInstruction: buildSystemInstruction(),
                    }
                });

                const text = response?.text;
                if (!text || text.trim() === '') {
                    lastError = "A IA retornou uma resposta vazia.";
                    console.log(`[Scheduler] Erro: ${lastError}`);
                    continue;
                }

                const result = JSON.parse(text.trim());

                if (result.error) {
                    lastError = `A IA indicou impossibilidade: ${result.error}`;
                    console.log(`[Scheduler] IA reportou erro: ${result.error}`);
                    continue;
                }

                if (!result.schedule || !Array.isArray(result.schedule)) {
                    lastError = "A IA retornou resposta válida, mas sem a grade horária.";
                    console.log(`[Scheduler] Erro: ${lastError}`);
                    continue;
                }

                currentSchedule = result.schedule;

                // ============================================================
                // VALIDAÇÃO ALGORÍTMICA (O "FISCAL")
                // ============================================================
                const aulasUnificadas: Aula[] = converterParaAulas(currentSchedule);
                validationResult = validarGrade(aulasUnificadas, regrasValidacao);

                if (!validationResult.valido) {
                    lastError = gerarPromptCorrecao(validationResult);
                    console.log(`[Scheduler] Validação falhou com ${validationResult.erros.length} erros:`);
                    validationResult.erros.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
                } else {
                    console.log(`[Scheduler] ✅ Grade válida gerada na tentativa ${attempts}`);
                    if (validationResult.estatisticas) {
                        console.log(`[Scheduler] Estatísticas: ${validationResult.estatisticas.totalAulasGeradas} aulas geradas`);
                    }
                }

            } catch (parseError) {
                console.error(`[Scheduler] Erro de parsing na tentativa ${attempts}:`, parseError);
                lastError = `Erro ao processar resposta da IA: ${parseError instanceof Error ? parseError.message : 'JSON inválido'}`;
            }
        }

        // ============================================================
        // RESULTADO FINAL - IA BEM SUCEDIDA
        // ============================================================
        if (validationResult.valido) {
            // Transformar para formato nested e retornar
            const schedule = transformFlatScheduleToNested(currentSchedule, timeSlots);

            return res.status(200).json({ 
                schedule,
                metadata: {
                    method: 'ai',
                    attempts,
                    totalLessons: validationResult.estatisticas?.totalAulasGeradas,
                    generatedAt: new Date().toISOString()
                }
            });
        }

        // ============================================================
        // FALLBACK: ALGORITMO GENÉTICO
        // ============================================================
        console.log(`[Scheduler] ⚠️ IA falhou após ${MAX_RETRY_ATTEMPTS} tentativas. Tentando algoritmo genético...`);

        try {
            const geneticResult = runGeneticScheduler(teachers, timeSlots, {
                populationSize: 150,
                generations: 300,
                maxAttempts: 3
            });

            if (geneticResult.success && geneticResult.schedule) {
                console.log(`[Scheduler] ✅ Algoritmo genético gerou grade válida na tentativa ${geneticResult.attempts}!`);
                console.log(`[Scheduler] Score: ${geneticResult.bestScore}`);

                const schedule = transformFlatScheduleToNested(geneticResult.schedule, timeSlots);

                return res.status(200).json({ 
                    schedule,
                    metadata: {
                        method: 'genetic',
                        aiAttempts: MAX_RETRY_ATTEMPTS,
                        geneticAttempts: geneticResult.attempts,
                        totalLessons: geneticResult.validationResult?.estatisticas?.totalAulasGeradas,
                        bestScore: geneticResult.bestScore,
                        generatedAt: new Date().toISOString()
                    }
                });
            }

            // Ambos falharam
            console.log(`[Scheduler] ❌ Algoritmo genético também falhou após ${geneticResult.attempts} tentativas`);
            
            // Combinar erros da IA e do algoritmo genético
            const allErrors = [
                ...(validationResult.erros || []),
                ...(geneticResult.validationResult?.erros || [])
            ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 10); // Remover duplicatas e limitar

            return res.status(422).json({ 
                error: `Não foi possível gerar uma grade válida. Tentativas: IA (${MAX_RETRY_ATTEMPTS}), Genético (${geneticResult.attempts}).`,
                details: allErrors.slice(0, 5),
                suggestion: "As restrições podem ser muito conflitantes. Tente: 1) Ampliar dias disponíveis dos professores, 2) Reduzir carga horária, ou 3) Dividir em menos turmas."
            });

        } catch (geneticError) {
            console.error("[Scheduler] Erro no algoritmo genético:", geneticError);
            
            // Retornar erro da IA original
            return res.status(422).json({ 
                error: `Não foi possível gerar uma grade válida após ${MAX_RETRY_ATTEMPTS} tentativas.`,
                details: validationResult.erros.slice(0, 5),
                suggestion: "Verifique se as restrições de disponibilidade e carga horária são compatíveis."
            });
        }

    } catch (error) {
        console.error("[Scheduler] Erro crítico na função de geração de grade (AI):", error);

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
