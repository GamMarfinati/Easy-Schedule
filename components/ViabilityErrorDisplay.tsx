import React, { useState } from 'react';
import { PresetHorario } from '../services/geminiService';

interface ViabilityErrorDisplayProps {
  error: string;
  details: string[];
  suggestion: string;
  statistics: {
    totalAulas: number;
    totalTurmas: number;
    slotsDisponiveis: number;
    ocupacaoPercentual: number;
    turmaComMaisAulas?: { nome: string; aulas: number };
  };
  recommendedPreset: PresetHorario | null;
  allPresets: PresetHorario[];
  onPresetSelect: (preset: PresetHorario) => void;
  onDismiss: () => void;
  onRefresh?: () => void;
}

const ViabilityErrorDisplay: React.FC<ViabilityErrorDisplayProps> = ({
  error,
  details,
  suggestion,
  statistics,
  recommendedPreset,
  allPresets,
  onPresetSelect,
  onDismiss,
  onRefresh
}) => {
  const [isProblemsExpanded, setIsProblemsExpanded] = useState(false);
  const [isSuggestionsExpanded, setIsSuggestionsExpanded] = useState(false);
  
  // Separar sugestões em tópicos (dividir por emoji ou pontuação)
  const suggestionsList = suggestion
    ? suggestion.split(/(?=📅|✂️|👨‍🏫|📆|🔄|⏰|📊|💡)/).filter(s => s.trim())
    : [];
  
  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-800">Dados Impossíveis de Alocar</h3>
            <p className="text-sm text-red-600">Detectamos problemas que impedem a geração da grade</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão Atualizar Relatório */}
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition"
              title="Atualizar relatório para verificar alterações"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          {/* Botão Fechar */}
          <button 
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition"
            title="Fechar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/80 rounded-lg p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-800">{statistics.totalAulas}</p>
          <p className="text-xs text-gray-500">Aulas Totais</p>
        </div>
        <div className="bg-white/80 rounded-lg p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-800">{statistics.totalTurmas}</p>
          <p className="text-xs text-gray-500">Turmas</p>
        </div>
        <div className="bg-white/80 rounded-lg p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-800">{statistics.slotsDisponiveis}</p>
          <p className="text-xs text-gray-500">Slots Disponíveis</p>
        </div>
        <div className={`rounded-lg p-3 text-center shadow-sm ${statistics.ocupacaoPercentual > 100 ? 'bg-red-100' : 'bg-green-100'}`}>
          <p className={`text-2xl font-bold ${statistics.ocupacaoPercentual > 100 ? 'text-red-600' : 'text-green-600'}`}>
            {statistics.ocupacaoPercentual.toFixed(2)}%
          </p>
          <p className={`text-xs ${statistics.ocupacaoPercentual > 100 ? 'text-red-500' : 'text-green-500'}`}>
            Ocupação
          </p>
        </div>
      </div>

      {/* Lista de Problemas - Colapsável */}
      <div className="mb-6">
        <button 
          onClick={() => setIsProblemsExpanded(!isProblemsExpanded)}
          className="w-full font-semibold text-gray-800 flex items-center justify-between gap-2 p-3 bg-white/80 hover:bg-white rounded-lg transition-all cursor-pointer border border-gray-200 hover:border-red-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Problemas Detectados ({details.length})</span>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isProblemsExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Lista expandível */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isProblemsExpanded ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
          <ul className="space-y-2">
            {details.map((detail, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700 bg-white/60 p-3 rounded-lg">
                <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sugestões - Colapsável */}
      {suggestionsList.length > 0 && (
        <div className="mb-6">
          <button 
            onClick={() => setIsSuggestionsExpanded(!isSuggestionsExpanded)}
            className="w-full font-semibold text-blue-800 flex items-center justify-between gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all cursor-pointer border border-blue-200 hover:border-blue-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Sugestões ({suggestionsList.length})</span>
            </div>
            <svg 
              className={`w-5 h-5 text-blue-500 transition-transform duration-200 ${isSuggestionsExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Lista expandível */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSuggestionsExpanded ? 'max-h-[400px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
            <ul className="space-y-2">
              {suggestionsList.map((sugestao, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-blue-700 bg-white/80 p-3 rounded-lg border border-blue-100">
                  <span>{sugestao.trim()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Preset Recomendado */}
      {recommendedPreset && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Configuração Recomendada
          </h4>
          <button
            onClick={() => onPresetSelect(recommendedPreset)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-4 text-left hover:from-green-600 hover:to-emerald-700 transition shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">{recommendedPreset.nome}</p>
                <p className="text-green-100 text-sm">{recommendedPreset.descricao}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{recommendedPreset.aulasSemanais}</p>
                <p className="text-xs text-green-100">aulas/semana</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-green-100">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Clique para aplicar esta configuração
            </div>
          </button>
        </div>
      )}

      {/* Outros Presets */}
      {allPresets && allPresets.length > 1 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Outras Configurações Disponíveis</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allPresets
              .filter(p => p.id !== recommendedPreset?.id)
              .map(preset => (
                <button
                  key={preset.id}
                  onClick={() => onPresetSelect(preset)}
                  className="bg-white border border-gray-200 rounded-lg p-3 text-left hover:border-purple-300 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{preset.nome}</p>
                      <p className="text-xs text-gray-500">{preset.descricao}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600">{preset.aulasPorDia}</p>
                      <p className="text-xs text-gray-400">por dia</p>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViabilityErrorDisplay;
