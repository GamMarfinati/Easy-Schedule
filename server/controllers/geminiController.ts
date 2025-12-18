import { Request, Response } from 'express';
import {
    validarGrade,
    converterParaRegras,
    converterParaAulas,
    ValidacaoResultado,
    ProfessorRegra,
    Aula
} from '../services/scheduler/validator.js';
import {
    analisarViabilidade,
    formatarAnaliseParaResposta,
    PRESETS_HORARIOS
} from '../services/scheduler/viabilidade.js';
import {
    convertFromGeneticOutput,
    convertToGeneticInput
} from '../services/scheduler/adapter.js';
import { GeneticScheduler } from '../services/scheduler/algorithm.js';

const DAYS_OF_WEEK = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
];

interface ScheduleSlot {
    grade: string;
    subject: string;
    teacherName: string;
}

// Cada slot pode ter múltiplas aulas (uma para cada turma)
interface Schedule {
    [day: string]: {
        [timeSlot: string]: ScheduleSlot[];
    };
}

// --- Helper Functions ---

const transformFlatScheduleToNested = (flatSchedule: any[], timeSlots: string[]): Schedule => {
    const nestedSchedule: Schedule = {};
    for (const day of DAYS_OF_WEEK) {
        nestedSchedule[day] = {};
        for (const slot of timeSlots) {
            nestedSchedule[day][slot] = []; // Inicializa como array vazio
        }
    }

    for (const item of flatSchedule) {
        if (item && item.day && item.timeSlot) {
            if (nestedSchedule[item.day] && nestedSchedule[item.day].hasOwnProperty(item.timeSlot)) {
                // Adiciona ao array ao invés de sobrescrever
                nestedSchedule[item.day][item.timeSlot].push({
                    grade: item.grade,
                    subject: item.subject,
                    teacherName: item.teacherName,
                });
            }
        }
    }
    return nestedSchedule;
};

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

        // ============================================================
        // PRÉ-VALIDAÇÃO DE VIABILIDADE
        // Detecta problemas ANTES de tentar gerar, economizando tempo
        // ============================================================
        console.log(`[Scheduler] Analisando viabilidade...`);
        const analiseViabilidade = analisarViabilidade(cleanedTeachers, timeSlots);

        if (!analiseViabilidade.viavel) {
            console.log(`[Scheduler] ❌ Dados inviáveis! ${analiseViabilidade.problemas.filter(p => p.tipo === 'CRITICO').length} problema(s) crítico(s):`);
            analiseViabilidade.problemas
                .filter(p => p.tipo === 'CRITICO')
                .forEach((p, i) => console.log(`  ${i + 1}. [${p.categoria}] ${p.mensagem}`));

            const resposta = formatarAnaliseParaResposta(analiseViabilidade);
            return res.status(422).json({
                error: resposta.error,
                errorType: 'VIABILITY_ERROR',
                details: resposta.details,
                suggestion: resposta.suggestion,
                statistics: resposta.statistics,
                recommendedPreset: resposta.recommendedPreset,
                allPresets: PRESETS_HORARIOS
            });
        }

        // Log de estatísticas se viável
        console.log(`[Scheduler] ✅ Dados viáveis!`);
        console.log(`[Scheduler] Estatísticas:`);
        console.log(`  - Total de aulas: ${analiseViabilidade.estatisticas.totalAulas}`);
        console.log(`  - Turmas: ${analiseViabilidade.estatisticas.totalTurmas}`);
        console.log(`  - Ocupação máxima: ${Math.round(analiseViabilidade.estatisticas.ocupacaoPercentual)}%`);

        // Alertas (não impedem geração, apenas avisos)
        const alertas = analiseViabilidade.problemas.filter(p => p.tipo === 'ALERTA');
        if (alertas.length > 0) {
            console.log(`[Scheduler] ⚠️ ${alertas.length} alerta(s) (não impedem geração):`);
            alertas.forEach((a, i) => console.log(`  ${i + 1}. ${a.mensagem}`));
        }

        // ============================================================
        // SOLVER DETERMINÍSTICO
        // ============================================================
        console.log(`[Scheduler] Iniciando solver determinístico para ${allGrades.length} turmas, ${teachers.length} professores`);

        const gaInput = convertToGeneticInput(teachers, timeSlots);
        const scheduler = new GeneticScheduler(gaInput);
        const solutions = scheduler.generate();

        if (!solutions.length) {
            console.log(`[Scheduler] ❌ Solver não encontrou solução dentro do limite de busca`);
            return res.status(422).json({
                error: 'Não foi possível gerar uma grade válida com as restrições fornecidas.',
                details: ['O solver determinístico não encontrou alocação possível dentro do limite de busca.'],
                suggestion: 'Tente ampliar a disponibilidade dos professores ou reduzir a carga horária por turma.',
                isViabilityError: true,
                requiresDataFix: true
            });
        }

        const bestSolution = solutions[0];
        const flatSchedule = convertFromGeneticOutput(bestSolution, gaInput, teachers, timeSlots);

        // ============================================================
        // VALIDAÇÃO ALGORÍTMICA (FISCAL)
        // ============================================================
        const aulasUnificadas: Aula[] = converterParaAulas(flatSchedule);
        const validationResult: ValidacaoResultado = validarGrade(aulasUnificadas, regrasValidacao);

        if (!validationResult.valido) {
            console.log(`[Scheduler] Validação falhou com ${validationResult.erros.length} erros:`);
            validationResult.erros.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
            return res.status(422).json({
                error: 'Não foi possível gerar uma grade válida com as restrições atuais.',
                details: validationResult.erros.slice(0, 5),
                suggestion: 'Revise disponibilidade e carga horária dos professores.',
                isViabilityError: true,
                requiresDataFix: true
            });
        }

        console.log(`[Scheduler] ✅ Grade válida gerada pelo solver determinístico`);
        if (validationResult.estatisticas) {
            console.log(`[Scheduler] Estatísticas: ${validationResult.estatisticas.totalAulasGeradas} aulas geradas`);
        }

        // Transformar para formato nested e retornar
        const schedule = transformFlatScheduleToNested(flatSchedule, timeSlots);

        return res.status(200).json({
            schedule,
            metadata: {
                method: 'deterministic',
                totalLessons: validationResult.estatisticas?.totalAulasGeradas,
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("[Scheduler] Erro crítico na função de geração de grade (deterministic):", error);
        return res.status(500).json({ error: "Erro interno do servidor ao gerar a grade." });
    }
};

/**
 * Endpoint para retornar os presets de horários disponíveis
 */
export const getSchedulePresets = async (_req: Request, res: Response) => {
    return res.status(200).json({
        presets: PRESETS_HORARIOS,
        default: 'padrao-30'
    });
};

/**
 * Endpoint para validar viabilidade SEM tentar gerar a grade
 * Útil para dar feedback rápido ao usuário
 */
export const validateViability = async (req: Request, res: Response) => {
    try {
        const { teachers, timeSlots } = req.body;

        if (!teachers || !Array.isArray(teachers)) {
            return res.status(400).json({ error: "Dados de professores inválidos." });
        }

        if (!timeSlots || !Array.isArray(timeSlots)) {
            return res.status(400).json({ error: "Dados de horários inválidos." });
        }

        const cleanedTeachers = teachers.map(({ name, subject, availabilityDays, classAssignments }: any) => ({
            name,
            subject,
            availabilityDays,
            classAssignments: classAssignments.map(({ grade, classCount }: any) => ({ grade, classCount }))
        }));

        const analise = analisarViabilidade(cleanedTeachers, timeSlots);

        return res.status(200).json({
            viable: analise.viavel,
            problems: analise.problemas,
            statistics: analise.estatisticas,
            suggestions: analise.sugestoes,
            recommendedPreset: analise.presetRecomendado
        });

    } catch (error) {
        console.error("[Scheduler] Erro na validação de viabilidade:", error);
        return res.status(500).json({ error: "Erro ao validar viabilidade." });
    }
};
