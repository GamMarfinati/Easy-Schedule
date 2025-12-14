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
    console.error("Erro ao buscar presets:", error);
    // Retorna presets padrão em caso de erro
    return {
      presets: [
        {
          id: 'padrao-30',
          nome: '30 aulas/semana (6 por dia)',
          descricao: 'Configuração padrão',
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
): Promise<Schedule> => {
  try {
    const response = await api.post('/schedules/generate', { teachers, timeSlots });
    return response.data.schedule;
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
