import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SubscriptionModal from '../../components/SubscriptionModal';
import { Teacher, Schedule } from '../../types';
import TeacherForm from '../../components/TeacherForm';
import ScheduleDisplay from '../../components/ScheduleDisplay';
import TeacherCard from '../../components/TeacherCard';
import TimeSlotManager from '../../components/TimeSlotManager';
import { generateSchedule, getSchedulePresets, PresetHorario, ViabilityError } from '../../services/geminiService';
import DataImporter from '../../components/DataImporter';
import { DEFAULT_TIME_SLOTS } from '../../constants';
import api from '../services/api';
import ViabilityErrorDisplay from '../../components/ViabilityErrorDisplay';

interface ScheduleError {
  message: string;
  conflictingTeachers?: string[];
  conflictingGrades?: string[];
  conflictingDays?: string[];
  isConfigError?: boolean;
  isViabilityError?: boolean;
  viabilityData?: ViabilityError;
}

const SchedulesPage: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ScheduleError | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [permissionErrorLink, setPermissionErrorLink] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [presets, setPresets] = useState<PresetHorario[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('padrao-30');
  
  // TODO: Fetch subscription status from API context or user metadata
  const isPremium = true; // Temporary mock for testing
  const STRIPE_LINK = "https://buy.stripe.com/test_6oU6oB94Ab8WcGZ3xL5Ne00";

  // Carregar presets ao montar o componente
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const data = await getSchedulePresets();
        setPresets(data.presets);
        setSelectedPresetId(data.default);
        // Aplicar preset padrão
        const defaultPreset = data.presets.find(p => p.id === data.default);
        if (defaultPreset) {
          setTimeSlots(defaultPreset.slots);
        }
      } catch (err) {
        console.error('Erro ao carregar presets:', err);
      }
    };
    loadPresets();
  }, []);

  const addTeacher = useCallback((newTeacherData: Omit<Teacher, 'id'>) => {
    const newTeacher: Teacher = { ...newTeacherData, id: crypto.randomUUID() };
    setTeachers(prev => [...prev, newTeacher]);
  }, []);

  const removeTeacher = useCallback((id: string) => {
    setTeachers(prev => prev.filter(t => t.id !== id));
    if (editingTeacher?.id === id) {
      setEditingTeacher(null);
    }
  }, [editingTeacher]);

  const handleImport = useCallback((importedTeachers: Teacher[]) => {
    setTeachers(importedTeachers);
    setSchedule(null);
    setError(null);
    setEditingTeacher(null);
  }, []);

  const handleEditTeacher = useCallback((id: string) => {
    const teacherToEdit = teachers.find(t => t.id === id);
    if (teacherToEdit) {
      setEditingTeacher(teacherToEdit);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [teachers]);

  const handleUpdateTeacher = useCallback((updatedTeacher: Teacher) => {
    setTeachers(prev => prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
    setEditingTeacher(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingTeacher(null);
  }, []);

  const handlePresetSelect = useCallback((preset: PresetHorario) => {
    setTimeSlots(preset.slots);
    setSelectedPresetId(preset.id);
    setError(null); // Limpar erro ao mudar preset
  }, []);

  const handleGenerateSchedule = async () => {
    if (!isPremium) {
      setIsSubscriptionModalOpen(true);
      return;
    }

    if (teachers.length === 0) {
      setError({ message: "Adicione pelo menos um professor antes de gerar o quadro." });
      return;
    }
    setIsLoading(true);
    setError(null);
    setPermissionErrorLink(null);

    try {
      const result = await generateSchedule(teachers, timeSlots);
      setSchedule(result);
      setGenerationCount(prev => prev + 1);
    } catch (err: any) {
      // Verificar se é erro de viabilidade
      if (err.viabilityData) {
        setError({
          message: err.viabilityData.error,
          isViabilityError: true,
          viabilityData: err.viabilityData
        });
        setIsLoading(false);
        return;
      }

      if (err instanceof Error) {
        const errorMessage = err.message;

        if (errorMessage.includes("API_KEY_MISSING")) {
          setError({
            message: "A variável de ambiente API_KEY não foi definida.",
            isConfigError: true,
          });
          setIsLoading(false);
          return;
        }

        if (errorMessage.includes("API_PERMISSION_DENIED")) {
          setError({ message: "Sua chave de API é válida, mas a API Gemini não está ativada." });
          setPermissionErrorLink("https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com");
          setIsLoading(false);
          return;
        }

        const newError: ScheduleError = { message: '' };
        
        // Error parsing logic preserved from original
        const teacherRegex = /professor '(.*?)'|aulas de (.*?)\s\(/g;
        const conflictingTeachers = new Set<string>();
        let teacherMatch;
        while ((teacherMatch = teacherRegex.exec(errorMessage)) !== null) {
          conflictingTeachers.add(teacherMatch[1] || teacherMatch[2]);
        }

        const gradeRegex = /turma '(.*?)'|para o (.*?)\s(devido|com)/g;
        const conflictingGrades = new Set<string>();
        let gradeMatch;
        while ((gradeMatch = gradeRegex.exec(errorMessage)) !== null) {
          conflictingGrades.add(gradeMatch[1] || gradeMatch[2]);
        }

        const dayRegex = /\((Segunda-feira|Terça-feira|Quarta-feira|Quinta-feira|Sexta-feira)/g;
        const conflictingDays = new Set<string>();
        let dayMatch;
        while ((dayMatch = dayRegex.exec(errorMessage)) !== null) {
          conflictingDays.add(dayMatch[1]);
        }

        if (conflictingTeachers.size > 0) newError.conflictingTeachers = Array.from(conflictingTeachers);
        if (conflictingGrades.size > 0) newError.conflictingGrades = Array.from(conflictingGrades);
        if (conflictingDays.size > 0) newError.conflictingDays = Array.from(conflictingDays);

        let suggestion = '';
        if (errorMessage.includes("excede o número total de horários")) {
          const classSlotsCount = timeSlots.filter(slot => slot.toLowerCase().includes('aula')).length;
          const totalAvailableSlots = 5 * classSlotsCount;
          suggestion = `\n\n**Sugestões:**\n• Verifique se a soma total de aulas não ultrapassa ${totalAvailableSlots}.\n• Aumente os dias de disponibilidade.`;
        } else if (newError.conflictingTeachers?.length > 0) {
          suggestion = `\n\n**Sugestões:**\n• Verifique a disponibilidade do professor ${newError.conflictingTeachers[0]}.`;
        } else if (newError.conflictingGrades?.length > 0) {
          suggestion = `\n\n**Sugestões:**\n• Verifique se a turma ${newError.conflictingGrades[0]} não tem excesso de aulas.`;
        }

        const cleanMessage = errorMessage
          .replace('A IA detectou um conflito de agendamento: ', '')
          .replace('Conflito de agendamento: ', '');

        newError.message = cleanMessage + suggestion;
        setError(newError);

      } else {
        setError({ message: "Ocorreu um erro desconhecido." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSchedule = async (scheduleToSave: Schedule) => {
    setIsSaving(true);
    try {
      const scheduleName = prompt('Digite um nome para esta grade:', `Grade ${new Date().toLocaleDateString('pt-BR')}`);
      if (!scheduleName) {
        setIsSaving(false);
        return;
      }

      await api.post('/schedules', {
        name: scheduleName,
        data: scheduleToSave,
        metadata: {
          generatedAt: new Date().toISOString(),
          generationAttempts: generationCount,
          teachersCount: teachers.length,
          timeSlotsCount: timeSlots.length,
        }
      });

      alert('Grade salva com sucesso! Você pode visualizá-la no Dashboard.');
    } catch (err) {
      console.error('Error saving schedule:', err);
      alert('Erro ao salvar a grade. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Calcular estatísticas para exibição
  const currentPreset = presets.find(p => p.id === selectedPresetId);
  const totalAulas = teachers.reduce((sum, t) => 
    sum + t.classAssignments.reduce((s, a) => s + a.classCount, 0), 0);
  const turmasUnicas = new Set(teachers.flatMap(t => t.classAssignments.map(a => a.grade)));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 space-y-6">
          <DataImporter onImport={handleImport} />
          
          {/* Seletor de Preset */}
          {presets.length > 0 && (
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Configuração de Horários
              </h3>
              <select
                value={selectedPresetId}
                onChange={(e) => {
                  const preset = presets.find(p => p.id === e.target.value);
                  if (preset) handlePresetSelect(preset);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {presets.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.nome}
                  </option>
                ))}
              </select>
              {currentPreset && (
                <p className="text-sm text-gray-500 mt-2">{currentPreset.descricao}</p>
              )}
              
              {/* Mini estatísticas */}
              {teachers.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total de aulas:</span>
                    <span className={`font-bold ${totalAulas > (currentPreset?.aulasSemanais || 30) * turmasUnicas.size ? 'text-red-600' : 'text-green-600'}`}>
                      {totalAulas}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Slots disponíveis:</span>
                    <span className="font-bold text-gray-800">
                      {currentPreset?.aulasSemanais || 30} × {turmasUnicas.size} turmas
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <TimeSlotManager timeSlots={timeSlots} onTimeSlotsChange={setTimeSlots} />
          <TeacherForm
            onAddTeacher={addTeacher}
            teacherToEdit={editingTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onCancelEdit={handleCancelEdit}
          />
          {teachers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800">Professores Adicionados</h3>
              {teachers.map(teacher => (
                <TeacherCard
                  key={teacher.id}
                  teacher={teacher}
                  onRemove={removeTeacher}
                  onEdit={handleEditTeacher}
                  isConflicting={error?.conflictingTeachers?.includes(teacher.name)}
                  conflictingDays={error?.conflictingTeachers?.includes(teacher.name) ? error.conflictingDays : undefined}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Seu Quadro de Horários</h2>
                <p className="text-gray-500 mt-1">Pronto para organizar a semana? Adicione os professores e clique em gerar.</p>
              </div>

              <div className="w-full sm:w-auto">
                <button
                  onClick={handleGenerateSchedule}
                  disabled={isLoading || teachers.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                      Gerar Quadro
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Erro de Viabilidade - Exibição Especial */}
          {error?.isViabilityError && error.viabilityData && (
            <ViabilityErrorDisplay
              error={error.viabilityData.error}
              details={error.viabilityData.details}
              suggestion={error.viabilityData.suggestion}
              statistics={error.viabilityData.statistics}
              recommendedPreset={error.viabilityData.recommendedPreset}
              allPresets={error.viabilityData.allPresets || presets}
              onPresetSelect={handlePresetSelect}
              onDismiss={() => setError(null)}
            />
          )}

          {/* Erro Normal (não viabilidade) */}
          {error && !error.isViabilityError && (
            <div className={`border-l-4 p-4 rounded-lg ${error.isConfigError ? 'bg-yellow-100 border-yellow-500 text-yellow-800' : 'bg-red-100 border-red-500 text-red-800'}`} role="alert">
              <p className="font-bold">{error.isConfigError ? 'Erro de Configuração' : 'Erro ao Gerar Quadro'}</p>
              <p className="whitespace-pre-wrap">{error.message}</p>
              {permissionErrorLink && (
                <div className="mt-4">
                  <a href={permissionErrorLink} target="_blank" rel="noopener noreferrer" className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition inline-block">
                    Ativar API Gemini
                  </a>
                  <p className="text-xs text-red-700 mt-2">
                    É necessário ativar a API no seu projeto do Google Cloud para prosseguir.
                  </p>
                </div>
              )}
            </div>
          )}

          <ScheduleDisplay
            schedule={schedule}
            isLoading={isLoading}
            timeSlots={timeSlots}
            teachers={teachers}
            onSave={handleSaveSchedule}
            isSaving={isSaving}
          />
        </div>
      </div>

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        stripeLink={STRIPE_LINK}
      />
    </div>
  );
};

export default SchedulesPage;
