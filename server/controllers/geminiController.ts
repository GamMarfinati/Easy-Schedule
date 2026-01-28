import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateSchedulePrompt } from '../services/prompts/schedulePrompt.js';
import { parseGeminiResponse, transformToFrontendSchedule, transformFlatToFrontend } from '../services/parsers/scheduleParser.js';
import { calculateMetrics } from '../services/scheduler/metrics.js';
import { PRESETS_HORARIOS } from '../services/scheduler/viabilidade.js';
import { runGeneticScheduler } from '../services/scheduler/adapter.js';

// Configuração do Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const generateScheduleAI = async (req: Request, res: Response) => {
  try {
    // Frontend sends timeSlots, but prompt expects config. Mapping here.
    const { teachers, timeSlots, config } = req.body;
    const finalConfig = config || { timeSlots }; 
    const finalTimeSlots = timeSlots || ["1ª Aula", "2ª Aula", "3ª Aula", "4ª Aula", "5ª Aula"]; // Fallback

    if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ error: 'Lista de professores inválida ou vazia.' });
    }

    // ============================================================
    // 1. TENTATIVA 1: ALGORITMO DETERMINÍSTICO (Rápido)
    // ============================================================
    try {
      console.log('[HybridScheduler] Tentando solver determinístico...');
      // Mapear dados do frontend para formato esperado pelo adapter
      const frontendTeachers = teachers.map((t: any) => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        availabilityDays: t.availabilityDays,
        availability: t.availability, // Fixed: Passing granular availability
        classAssignments: t.classAssignments
      }));

      const deterministicResult = runGeneticScheduler(frontendTeachers, finalTimeSlots);

      // FAIL FAST INTELIGENTE:
      // Só abortamos se a grade estiver VAZIA e inválida.
      // Se tivermos uma grade parcial (mesmo com erros), retornamos para o usuário ver ONDE estão os buracos.
      if (deterministicResult.validationResult && 
          !deterministicResult.validationResult.valido && 
          (!deterministicResult.schedule || deterministicResult.schedule.length === 0)) {
         
         const msg = deterministicResult.validationResult.erros[0] || "Erro desconhecido na geração";
         console.warn(`[HybridScheduler] ⛔ Fail Fast (Grau Crítico): ${msg}`);
         
         return res.json({
             schedule: [],
             metrics: {
                 totalLessons: 0,
                 conflicts: deterministicResult.validationResult.erros.length,
                 method: 'aborted'
             },
             conflicts: deterministicResult.validationResult.erros.map(e => ({ type: 'critical', message: e }))
         });
      }

      // AGORA: Aceitamos resultado mesmo com conflitos se tivermos alocado algo
      // O 'algorithm.ts' foi modificado para sempre retornar [] ou [{schedule...}]
      // Se tiver schedule > 0, usamos.
      if (deterministicResult.schedule && deterministicResult.schedule.length > 0) {
        const isPartial = deterministicResult.conflicts && deterministicResult.conflicts.length > 0;
        console.log(`[HybridScheduler] ✅ Resultado obtido (Parcial: ${isPartial}). ${deterministicResult.schedule.length} aulas geradas.`);
        
        // Transforma Flat -> Nested Frontend
        const schedule = transformFlatToFrontend(deterministicResult.schedule);
        
        const metrics = {
          totalGaps: 0, 
          singleClassDays: 0,
          availability: '100%',
          totalLessons: deterministicResult.schedule.length,
          conflicts: deterministicResult.conflicts?.length || 0,
          method: isPartial ? 'deterministic-partial' : 'deterministic'
        };

        return res.json({ 
          schedule, 
          metrics,
          conflicts: deterministicResult.conflicts // Pass detailed conflicts to frontend
        });
      }
      
      console.log('[HybridScheduler] Solver determinístico não gerou NENHUMA aula. Tentando IA...');
    } catch (detError) {
      console.error('[HybridScheduler] Erro no solver determinístico (ignorando e indo para IA):', detError);
    }


    // ============================================================
    // 2. TENTATIVA 2: IA GENERATIVA (Fallback)
    // ============================================================
    console.log('[HybridScheduler] Iniciando geração via Gemini...');
    
    // 1. Prepara o Prompt para a IA
    const prompt = generateSchedulePrompt(teachers, finalConfig);

    // 2. Chama a IA (Gemini)
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 3. Traduz a resposta da IA para JSON (Teacher-Centric)
    const rawSchedule = parseGeminiResponse(text);
    
    // 4. Transforma para formato Frontend (Day -> Slot -> Lessons)
    const schedule = transformToFrontendSchedule(rawSchedule, finalTimeSlots);

    // 5. CALCULA AS MÉTRICAS
    const metrics = calculateMetrics(rawSchedule, teachers);

    // 6. Envia tudo para o Frontend (Grade Transformada + Métricas)
    return res.json({ 
      schedule, 
      metrics: { ...metrics, method: 'ai' } 
    });

  } catch (error) {
    console.error('Erro ao gerar grade:', error);
    return res.status(500).json({ 
      error: 'Falha ao gerar a grade de horários.',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Endpoint para retornar os presets de horários disponíveis
 */
export const getSchedulePresets = async (_req: Request, res: Response) => {
  return res.status(200).json({
      presets: PRESETS_HORARIOS || [],
      default: 'padrao-30'
  });
};

/**
 * Stub para validar viabilidade (mantendo compatibilidade com rota existente)
 */
export const validateViability = async (req: Request, res: Response) => {
  // Como a nova lógica é baseada puramente em LLM, retornamos viável por padrão
  // para permitir que o fluxo continue.
  return res.status(200).json({
      viable: true,
      problems: [],
      statistics: {
        totalAulas: 0, 
        totalTurmas: 0, 
        ocupacaoPercentual: 0
      },
      suggestions: [],
      recommendedPreset: null
  });
};