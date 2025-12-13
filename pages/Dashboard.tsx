import React, { useState, useCallback } from 'react';
import SubscriptionModal from '../components/SubscriptionModal';
import { Teacher, Schedule } from '../types';
import TeacherForm from '../components/TeacherForm';
import ScheduleDisplay from '../components/ScheduleDisplay';
import TeacherCard from '../components/TeacherCard';
import TimeSlotManager from '../components/TimeSlotManager';
import { generateSchedule } from '../services/geminiService';
import DataImporter from '../components/DataImporter';
import { DEFAULT_TIME_SLOTS } from '../constants';
import { useAuth } from '../src/context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

interface ScheduleError {
  message: string;
  conflictingTeachers?: string[];
  conflictingGrades?: string[];
  conflictingDays?: string[];
  isConfigError?: boolean;
}

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; to?: string }> = ({ icon, label, active, to }) => {
  const content = (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${active ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-primary'}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </div>
  );

  return to ? <Link to={to} className="block mb-2">{content}</Link> : <div className="mb-2">{content}</div>;
};

const Dashboard: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ScheduleError | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [permissionErrorLink, setPermissionErrorLink] = useState<string | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const { user, login, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  // TODO: Map Auth0 user metadata for subscription status
  // const isPremium = user?.publicMetadata?.subscription === 'premium';
  // const isPremium = user?.publicMetadata?.subscription === 'premium';
  const isPremium = true; // Temporário para teste da IA 
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
    } catch (err) {
      if (err instanceof Error) {
        const errorMessage = err.message;

        // Handle specific error types from the service for better UX
        if (errorMessage.includes("API_KEY_MISSING")) {
          setError({
            message: "A variável de ambiente API_KEY não foi definida. Por favor, configure-a nas variáveis de ambiente do seu projeto na Vercel (ou outra plataforma de hospedagem) para usar a IA.",
            isConfigError: true,
          });
          setIsLoading(false);
          return;
        }

        if (errorMessage.includes("API_PERMISSION_DENIED")) {
          setError({ message: "Sua chave de API é válida, mas a API Gemini não está ativada no seu projeto Google Cloud." });
          setPermissionErrorLink("https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com");
          setIsLoading(false);
          return;
        }

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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden lg:flex flex-col fixed h-full z-20">
        <div className="p-6 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-primary p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-800">HoraProfe</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <SidebarItem 
            to="/" 
            label="Início" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>} 
          />
          <SidebarItem 
            to="/app" 
            label="Novo Quadro" 
            active={location.pathname === '/app'}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>} 
          />
          <SidebarItem 
            label="Meus Quadros" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>} 
          />
          <SidebarItem 
            label="Perfil" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>} 
          />
        </nav>

        <div className="p-4 border-t border-gray-100">
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50">
            {user?.picture ? (
                 <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
            ) : (
                 <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                    {user?.name?.charAt(0) || 'U'}
                 </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Visitante'}</p>
              <p className="text-xs text-gray-500 truncate">{isAuthenticated ? (isPremium ? 'Premium 💎' : 'Gratuito') : 'Não logado'}</p>
            </div>
            {isAuthenticated && (
                <button onClick={() => logout()} className="text-gray-400 hover:text-red-500 transition" title="Sair">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
            )}
          </div>
        </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10 lg:hidden">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-800">HoraProfe</h1>
            </div>
            <div className="flex items-center gap-3">
               {isAuthenticated && user?.picture && <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-full" />}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
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
                    <div className="w-full sm:w-auto">
                      {!isAuthenticated ? (
                          <button onClick={() => login()} className="w-full flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            Entrar para Gerar
                          </button>
                      ) : (
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
                      )}
                    </div>
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
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        stripeLink={STRIPE_LINK}
      />
    </div>
  );
};

export default Dashboard;
