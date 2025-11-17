import React, { useState, useCallback } from 'react';
import { Teacher, Schedule } from './types';
import TeacherForm from './components/TeacherForm';
import ScheduleDisplay from './components/ScheduleDisplay';
import TeacherCard from './components/TeacherCard';
import TimeSlotManager from './components/TimeSlotManager';
import { generateSchedule } from './services/geminiService';
import DataImporter from './components/DataImporter';
import { DEFAULT_TIME_SLOTS } from './constants';


interface ScheduleError {
  message: string;
  conflictingTeachers?: string[];
  conflictingGrades?: string[];
  conflictingDays?: string[];
}

const App: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ScheduleError | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);

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
    if (teachers.length === 0) {
      setError({ message: "Adicione pelo menos um professor antes de gerar a grade." });
      return;
    }
    setIsLoading(true);
    setError(null);
    setSchedule(null);
    try {
      const result = await generateSchedule(teachers, timeSlots);
      setSchedule(result);
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = err.message;
        const newError: ScheduleError = { message: '' };

        // Extract entities from error message to provide better feedback
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
            suggestion = `\n\n**Sugestões:**\n• Verifique se a soma total de aulas de todas as turmas não ultrapassa o total de horários disponíveis na semana (${totalAvailableSlots}).\n• Aumente os dias de disponibilidade dos professores ou adicione mais períodos de aula.`;
        } else if (newError.conflictingTeachers?.length > 0) {
            suggestion = `\n\n**Sugestões:**\n• Verifique a disponibilidade do professor ${newError.conflictingTeachers[0]} no dia do conflito.\n• Certifique-se de que a carga horária dele não é excessiva para os dias disponíveis.`;
        } else if (newError.conflictingGrades?.length > 0) {
            suggestion = `\n\n**Sugestões:**\n• Verifique se a turma ${newError.conflictingGrades[0]} não tem mais aulas do que o necessário.\n• Garanta que há professores suficientes para cobrir todas as aulas da turma.`;
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="bg-primary p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Gerador de Grade Horária Inteligente</h1>
           </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
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
                        <h2 className="text-xl font-bold text-gray-800">Sua Grade Horária</h2>
                        <p className="text-gray-500 mt-1">Pronto para organizar a semana? Adicione os professores e clique em gerar.</p>
                    </div>
                    <button 
                        onClick={handleGenerateSchedule}
                        disabled={isLoading || teachers.length === 0}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
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
                                Gerar Grade Horária
                            </>
                         )}
                    </button>
                </div>
            </div>
            
            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-lg" role="alert">
                    <p className="font-bold">Erro ao Gerar Grade</p>
                    <p className="whitespace-pre-wrap">{error.message}</p>
                </div>
            )}

            <ScheduleDisplay 
                schedule={schedule} 
                isLoading={isLoading} 
                timeSlots={timeSlots} 
                teachers={teachers} 
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;