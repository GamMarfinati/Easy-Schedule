import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import SubscriptionModal from '../../components/SubscriptionModal';
import { Teacher, Schedule } from '../../types';
import TeacherForm from '../../components/TeacherForm';
import ScheduleDisplay from '../../components/ScheduleDisplay';
import TeacherCard from '../../components/TeacherCard';
import TimeSlotManager from '../../components/TimeSlotManager';
import { generateSchedule } from '../../services/geminiService';
import DataImporter from '../../components/DataImporter';
import { DEFAULT_TIME_SLOTS } from '../../constants';
import api from '../services/api';

interface ScheduleError {
  message: string;
  conflictingTeachers?: string[];
  conflictingGrades?: string[];
  conflictingDays?: string[];
  isConfigError?: boolean;
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
  
  // TODO: Fetch subscription status from API context or user metadata
  const isPremium = true; // Temporary mock for testing
  const STRIPE_LINK = "https://buy.stripe.com/test_6oU6oB94Ab8WcGZ3xL5Ne00";

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
    } catch (err) {
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 space-y-6">
          <DataImporter onImport={handleImport} />
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

          {error && (
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
