import api from '../src/services/api';
import { Teacher, Schedule } from "../types";

// Tipos para os presets de horário
export interface PresetHorario {
  id: string;
  nome: string;
  descricao: string;
  aulasSemanais: number;
  aulasPorDia: number;
  slots: string[];
}

// Tipo para erros de viabilidade
export interface ViabilityError {
  error: string;
  errorType: 'VIABILITY_ERROR';
  details: string[];
  suggestion: string;
  statistics: {
    totalAulas: number;
    totalTurmas: number;
    slotsDisponiveis: number;
    ocupacaoPercentual: number;
    turmaComMaisAulas: { nome: string; aulas: number };
  };
  recommendedPreset: PresetHorario | null;
  allPresets: PresetHorario[];
}

// Tipo para resultado de geração com metadados
export interface GenerationResult {
  schedule: Schedule;
  metadata?: {
    method: 'ai' | 'genetic';
    attempts: number;
    totalLessons?: number;
    generatedAt: string;
  };
  metrics?: any;
  conflicts?: any[];
}

// Verifica se é um erro de viabilidade
export const isViabilityError = (error: any): error is ViabilityError => {
  return error?.errorType === 'VIABILITY_ERROR';
};

/**
 * Busca os presets de horário disponíveis
 */
export const getSchedulePresets = async (): Promise<{ presets: PresetHorario[]; default: string }> => {
  try {
    const response = await api.get('/schedules/presets');
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar presets do servidor, usando fallback local:", error);
    // Retorna todos os presets localmente em caso de erro (ex: não autenticado)
    return {
      presets: [
        {
          id: 'padrao-30',
          nome: '30 aulas/semana (6 por dia)',
          descricao: 'Configuração padrão - 6 aulas por dia, 5 dias',
          aulasSemanais: 30,
          aulasPorDia: 6,
          slots: [
            "07:15-08:05",
            "08:05-08:55",
            "09:10-10:00",
            "10:00-10:50",
            "11:05-11:55",
            "11:55-12:45"
          ]
        },
        {
          id: 'estendido-35',
          nome: '35 aulas/semana (7 por dia)',
          descricao: 'Manhã completa + 1 período extra',
          aulasSemanais: 35,
          aulasPorDia: 7,
          slots: [
            "07:15-08:05",
            "08:05-08:55",
            "09:10-10:00",
            "10:00-10:50",
            "11:05-11:55",
            "11:55-12:45",
            "12:45-13:35"
          ]
        },
        {
          id: 'integral-40',
          nome: '40 aulas/semana (8 por dia)',
          descricao: 'Período integral básico',
          aulasSemanais: 40,
          aulasPorDia: 8,
          slots: [
            "07:15-08:05",
            "08:05-08:55",
            "09:10-10:00",
            "10:00-10:50",
            "11:05-11:55",
            "11:55-12:45",
            "14:00-14:50",
            "14:50-15:40"
          ]
        },
        {
          id: 'integral-45',
          nome: '45 aulas/semana (9 por dia)',
          descricao: 'Período integral estendido',
          aulasSemanais: 45,
          aulasPorDia: 9,
          slots: [
            "07:15-08:05",
            "08:05-08:55",
            "09:10-10:00",
            "10:00-10:50",
            "11:05-11:55",
            "11:55-12:45",
            "14:00-14:50",
            "14:50-15:40",
            "15:55-16:45"
          ]
        },
        {
          id: 'integral-50',
          nome: '50 aulas/semana (10 por dia)',
          descricao: 'Período integral completo',
          aulasSemanais: 50,
          aulasPorDia: 10,
          slots: [
            "07:15-08:05",
            "08:05-08:55",
            "09:10-10:00",
            "10:00-10:50",
            "11:05-11:55",
            "11:55-12:45",
            "14:00-14:50",
            "14:50-15:40",
            "15:55-16:45",
            "16:45-17:35"
          ]
        }
      ],
      default: 'padrao-30'
    };
  }
};

/**
 * Valida a viabilidade dos dados SEM gerar a grade
 */
export const validateViability = async (
  teachers: Teacher[], 
  timeSlots: string[]
): Promise<{
  viable: boolean;
  problems: any[];
  statistics: any;
  suggestions: string[];
  recommendedPreset: PresetHorario | null;
}> => {
  try {
    const response = await api.post('/schedules/validate', { teachers, timeSlots });
    return response.data;
  } catch (error: any) {
    console.error("Erro ao validar viabilidade:", error);
    throw error;
  }
};

/**
 * Gera a grade horária
 */
export const generateSchedule = async (
  teachers: Teacher[], 
  timeSlots: string[]
): Promise<GenerationResult> => {
  try {
    const response = await api.post('/schedules/generate', { teachers, timeSlots });
    return response.data;
  } catch (error: any) {
    console.error("Erro ao comunicar com o serviço de geração de grade:", error);

    // Verificar se é um erro de viabilidade (422 com dados específicos)
    if (error.response?.status === 422 && error.response?.data) {
      const errorData = error.response.data;
      
      // Se for erro de viabilidade, lançar o objeto completo
      if (errorData.errorType === 'VIABILITY_ERROR' || errorData.allPresets) {
        const viabilityError = new Error(errorData.error) as Error & { viabilityData: ViabilityError };
        viabilityError.viabilityData = errorData;
        throw viabilityError;
      }
      
      // Outro erro 422 (geração falhou)
      throw new Error(errorData.error || "Não foi possível gerar a grade.");
    }

    // Erro do backend com mensagem
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    // Erros de configuração
    if (error instanceof Error) {
      if (error.message.includes("API_KEY_MISSING") || error.message.includes("API_PERMISSION_DENIED")) {
        throw error;
      }
      if (error.message.includes("conflito")) {
        throw error;
      }
      throw new Error(`Erro ao conectar ao serviço: ${error.message}`);
    }
    
    throw new Error("Não foi possível conectar ao serviço de geração de grade.");
  }
};
