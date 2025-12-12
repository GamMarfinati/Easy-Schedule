import api from '../src/services/api';
import { Teacher, Schedule } from "../types";

export const generateSchedule = async (teachers: Teacher[], timeSlots: string[]): Promise<Schedule> => {
    try {
        // O frontend agora envia os dados para a nossa própria função de backend segura.
        // A chave de API nunca é exposta ao navegador.
        // Usamos a instância 'api' para garantir que o token de autenticação seja enviado.
        const response = await api.post('/generate', { teachers, timeSlots });

        // Se for bem-sucedida, recebemos a grade horária pronta do backend.
        // Axios retorna os dados diretamente em response.data
        return response.data.schedule;

    } catch (error: any) {
        console.error("Erro ao comunicar com o serviço de geração de grade:", error);

        // Re-lança o erro para que o componente App.tsx possa capturá-lo e exibi-lo.
        if (error.response && error.response.data && error.response.data.error) {
             // Erro vindo do backend (ex: API_KEY_MISSING, conflito, etc)
             throw new Error(error.response.data.error);
        }
        
        if (error instanceof Error) {
            // Mantemos a lógica de detecção de erros de configuração, pois o backend os retornará.
            if (error.message.includes("API_KEY_MISSING") || error.message.includes("API_PERMISSION_DENIED")) {
                throw error;
            }
             // Mantemos a lógica de detecção de conflitos para o usuário.
            if (error.message.includes("conflito")) {
                throw error;
            }
            throw new Error(`Erro ao conectar ao serviço: ${error.message}`);
        }
        
        // Erro genérico para problemas de rede ou falhas inesperadas na comunicação.
        throw new Error("Não foi possível conectar ao serviço de geração de grade. Verifique sua conexão com a internet.");
    }
};
