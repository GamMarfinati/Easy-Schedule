import { Teacher, Schedule } from "../types";

export const generateSchedule = async (teachers: Teacher[], timeSlots: string[]): Promise<Schedule> => {
    try {
        // O frontend agora envia os dados para a nossa própria função de backend segura.
        // A chave de API nunca é exposta ao navegador.
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ teachers, timeSlots }),
        });

        // Se a resposta do nosso backend não for bem-sucedida, lemos a mensagem de erro.
        if (!response.ok) {
            const errorData = await response.json();
            // Propagamos a mensagem de erro específica vinda do backend.
            throw new Error(errorData.error || 'Ocorreu um erro no servidor.');
        }

        // Se for bem-sucedida, recebemos a grade horária pronta do backend.
        const result = await response.json();
        return result.schedule;

    } catch (error) {
        console.error("Erro ao comunicar com o serviço de geração de grade:", error);

        // Re-lança o erro para que o componente App.tsx possa capturá-lo e exibi-lo.
        if (error instanceof Error) {
            // Mantemos a lógica de detecção de erros de configuração, pois o backend os retornará.
            if (error.message.includes("API_KEY_MISSING") || error.message.includes("API_PERMISSION_DENIED")) {
                throw error;
            }
             // Mantemos a lógica de detecção de conflitos para o usuário.
            if (error.message.includes("conflito")) {
                throw error;
            }
        }
        
        // Erro genérico para problemas de rede ou falhas inesperadas na comunicação.
        throw new Error("Não foi possível conectar ao serviço de geração de grade. Verifique sua conexão com a internet.");
    }
};
