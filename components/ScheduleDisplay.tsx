import React, { useState, useEffect, useMemo } from "react";
import { Schedule, ScheduleSlot, Teacher } from "../types";
import { DAYS_OF_WEEK } from "../constants";

interface ScheduleDisplayProps {
  schedule: Schedule | null;
  isLoading: boolean;
  timeSlots: string[];
  teachers: Teacher[];
  onSave?: (schedule: Schedule) => Promise<void>;
  isSaving?: boolean;
}

type DisplayMode = "geral" | "turma" | "professor";

// Mensagens rotativas para o loading
const LOADING_MESSAGES = [
  {
    title: "A IA está pensando...",
    subtitle: "Organizando os horários e verificando conflitos.",
  },
  {
    title: "Quase lá...",
    subtitle: "Isso pode levar alguns minutos. ☕ Que tal um café?",
  },
  {
    title: "Trabalhando duro...",
    subtitle: "A IA está analisando milhares de combinações possíveis.",
  },
  {
    title: "Montando seu quadro...",
    subtitle:
      "Garantindo que nenhum professor fique em duas salas ao mesmo tempo! 🧙‍♂️",
  },
  {
    title: "Otimizando a grade...",
    subtitle: "Buscando a melhor distribuição de aulas para todos.",
  },
  {
    title: "Verificando disponibilidades...",
    subtitle: "Cada professor terá aulas apenas nos seus dias.",
  },
];

const LoadingState: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // Rotacionar mensagens a cada 5 segundos
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 5000);

    // Contador de tempo
    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(timeInterval);
    };
  }, []);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const currentMessage = LOADING_MESSAGES[messageIndex];

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4">
      {/* Styles for the new loader */}
      <style>{`
        :root {
          /* Cores extraídas da imagem do logo */
          --hp-purple-bg: #311b62;
          --hp-lilac: #b39ddb;
          
          /* Configurações do Loader */
          --loader-size: 64px;
          --gap-size: 8px;
          --corner-radius: 6px;
          --border-thickness: 4px;
          --cycle-duration: 2.4s;
        }

        .hp-loader-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: var(--gap-size);
          width: var(--loader-size);
          height: var(--loader-size);
        }

        .hp-square {
          width: 100%;
          height: 100%;
          border-radius: var(--corner-radius);
          border: var(--border-thickness) solid transparent;
          background-color: var(--hp-lilac);
          box-sizing: border-box; 
          animation: clockwisePulse var(--cycle-duration) infinite ease-in-out;
        }

        .sq-tr { animation-delay: 0s; }
        .sq-br { animation-delay: calc(var(--cycle-duration) * 0.25); }
        .sq-bl { animation-delay: calc(var(--cycle-duration) * 0.5); }
        .sq-tl { animation-delay: calc(var(--cycle-duration) * 0.75); }

        @keyframes clockwisePulse {
          0% {
            background-color: transparent;
            border-color: var(--hp-lilac);
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(179, 157, 219, 0.7);
          }
          12.5% {
            transform: scale(1.15);
            box-shadow: 0 0 10px 2px rgba(179, 157, 219, 0.4);
          }
          25% {
            background-color: transparent;
            border-color: var(--hp-lilac);
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(179, 157, 219, 0);
          }
          25.01%, 100% {
            background-color: var(--hp-lilac);
            border-color: transparent;
            transform: scale(1);
            box-shadow: none;
          }
        }
      `}</style>
      
      {/* Novo Loader Animado */}
      <div className="hp-loader-grid mb-6">
        <div className="hp-square sq-tl"></div>
        <div className="hp-square sq-tr"></div>
        <div className="hp-square sq-bl"></div>
        <div className="hp-square sq-br"></div>
      </div>

      {/* Mensagem principal */}
      <h3 className="mt-2 text-xl font-semibold text-gray-700 transition-all duration-500">
        {currentMessage.title}
      </h3>
      <p className="mt-2 text-gray-500 max-w-sm transition-all duration-500">
        {currentMessage.subtitle}
      </p>

      {/* Tempo decorrido */}
      <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Tempo: {formatTime(elapsedTime)}</span>
      </div>

      {/* Dica após 30 segundos */}
      {elapsedTime > 30 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-sm animate-fade-in">
          <p className="text-sm text-amber-700">
            💡 <strong>Dica:</strong> Quanto mais professores e turmas, mais
            tempo a IA precisa para garantir uma grade sem conflitos.
          </p>
        </div>
      )}

      {/* Aviso após 60 segundos */}
      {elapsedTime > 60 && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-sm">
          <p className="text-sm text-blue-700">
            🧠 A IA está tentando várias abordagens... Se falhar, tentaremos um
            algoritmo genético como backup!
          </p>
        </div>
      )}
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4 bg-gray-50 rounded-lg">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-16 w-16 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
    <h3 className="mt-4 text-xl font-semibold text-gray-700">
      Seu quadro de horários aparecerá aqui
    </h3>
    <p className="mt-1 text-gray-500">
      Adicione professores e clique em "Gerar Quadro" para começar.
    </p>
  </div>
);

const CellContent: React.FC<{
  grade?: string;
  subject: string;
  teacher?: string;
}> = ({ grade, subject, teacher }) => {
  return (
    <div className="bg-blue-50 p-2 rounded-lg h-full flex flex-col justify-center text-center border-l-4 border-blue-400 text-xs">
      {grade && <p className="font-bold text-sm text-blue-900">{grade}</p>}
      <p className="text-blue-800 font-medium">{subject}</p>
      {teacher && <p className="text-gray-500 italic mt-1">{teacher}</p>}
    </div>
  );
};

// --- TIPOS DE RELATÓRIO ---
interface QualityMetrics {
  totalLessons: number;
  warnings: string[];   // "Apenas 1 aula no dia..."
  hints: string[];      // "Fragmentação..."
  suggestions: string[]; // "Troca de disponibilidade..." [NOVO]
  conflicts: string[];  // "Choque de horário..."
}

// Helper para calcular métricas (retorna objeto ao invés de string)
const calculateQualityMetrics = (schedule: Schedule, teachers: Teacher[]): QualityMetrics => {
  let totalLessons = 0;
  const warnings: string[] = [];
  const hints: string[] = [];
  const suggestions: string[] = [];
  const conflicts: string[] = [];
  
  if (!schedule) return { totalLessons: 0, warnings: [], hints: [], suggestions: [], conflicts: [] };

  // 1. Coleta e Totais
  const teacherStats = new Map<string, Map<string, number>>(); 
  const teacherTotalLessons = new Map<string, number>();
  const classOccupancy = new Map<string, Map<string, Map<string, boolean>>>(); // Grade -> Day -> Time -> isOccupied

  // Inicializar ocupação das turmas
  Object.keys(schedule).forEach(day => {
    Object.keys(schedule[day]).forEach(time => {
      const lessons = schedule[day][time];
      if (Array.isArray(lessons)) {
        lessons.forEach(l => {
          if (!classOccupancy.has(l.grade)) classOccupancy.set(l.grade, new Map());
          const gradeMap = classOccupancy.get(l.grade)!;
          if (!gradeMap.has(day)) gradeMap.set(day, new Map());
          gradeMap.get(day)!.set(time, true);
        });
      }
    });
  });

  Object.entries(schedule).forEach(([day, slots]) => {
    Object.entries(slots).forEach(([time, lessons]) => {
      if (Array.isArray(lessons)) {
        totalLessons += lessons.length;
        lessons.forEach(l => {
          // Stats por professor
          if (!teacherStats.has(l.teacherName)) {
            teacherStats.set(l.teacherName, new Map());
          }
          const dayMap = teacherStats.get(l.teacherName)!;
          dayMap.set(day, (dayMap.get(day) || 0) + 1);

          // Total por professor
          teacherTotalLessons.set(l.teacherName, (teacherTotalLessons.get(l.teacherName) || 0) + 1);
        });
        
        // Check Conflitos (Choques)
        const grades = lessons.map(l => l.grade);
        const uniqueGrades = new Set(grades);
        if (grades.length !== uniqueGrades.size) {
           conflicts.push(`Choque em ${day} - ${time}: Turma com múltiplas aulas.`);
        }
      }
    });
  });

  // 2. Análise
  teacherStats.forEach((dayMap, teacherName) => {
    const teacherObj = teachers.find(t => t.name === teacherName);
    const assignedDays = Array.from(dayMap.keys());
    const singleClassDays = assignedDays.filter(d => dayMap.get(d) === 1);
    
    // Warning: Dia única aula
    if (singleClassDays.length > 0) {
      warnings.push(`${teacherName}: Apenas 1 aula em: ${singleClassDays.join(", ")}.`);
    }

    // Hint: Fragmentação
    const totalTeacher = teacherTotalLessons.get(teacherName) || 0;
    const isFragmented = assignedDays.length > 1 && assignedDays.every(d => (dayMap.get(d) || 0) <= 3) && totalTeacher <= 6;
    if (isFragmented) {
      const distribution = assignedDays.map(d => `${d} (${dayMap.get(d)})`).join(", ");
      hints.push(`${teacherName}: Grade fragmentada [${distribution}]. Ideal: concentrar.`);
    }

    // --- SMART SUGGESTIONS (Troca de Disponibilidade) ---
    // Cenário: Professor vai na escola só para 1 aula (singleClassDays).
    // Objetivo: Achar outro dia que ele NÃO disponibilizou, mas que tem vaga para a turma dessa aula.
    if (teacherObj && singleClassDays.length > 0) {
      singleClassDays.forEach(badDay => {
        // Achar qual aula é essa
        // Precisamos varrer o schedule de novo ou ter guardado. Vamos varrer simplificado.
        let troublesomeLesson: { grade: string, subject: string, time: string } | null = null;
        
        // Encontrar a aula solitária
        Object.entries(schedule[badDay] || {}).forEach(([time, lessons]) => {
           const found = lessons?.find(l => l.teacherName === teacherName);
           if (found) troublesomeLesson = { grade: found.grade, subject: found.subject, time };
        });

        if (troublesomeLesson) {
          // Procurar dias que o professor NÃO deu disponibilidade
          const allDays = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
          const availableDays = teacherObj.availabilityDays || [];
          const unavailableDays = allDays.filter(d => !availableDays.includes(d));

          // Nesses dias indisponíveis, a turma tem vaga?
          unavailableDays.forEach(goodDay => {
             // Verificar se a turma tem vaga em algum horário nesse 'goodDay'
             // Simplificação: Se a turma tem pelo menos 1 slot livre nesse dia.
             // Idealmente checaríamos se há CONFLITO de professor, mas como ele tá indisponível, assumimos que ele poderia estar livre se quisesse.
             
             // Check vacancy for the class
             const classDayMap = classOccupancy.get(troublesomeLesson!.grade)?.get(goodDay);
             // Se classe tem horário livre (considerando 5 aulas padrão)
             const occupiedSlots = classDayMap ? classDayMap.size : 0;
             
             if (occupiedSlots < 5) { // Assumindo 5 aulas/dia
                suggestions.push(`💡 Sugestão para ${teacherName}: Se trocar a disponibilidade de ${badDay} por ${goodDay}, a aula solitária de ${troublesomeLesson!.grade} poderia ser movida, concentrando a grade.`);
             }
          });
        }
      });
    }
  });

  return { totalLessons, warnings, hints, suggestions, conflicts };
};


// --- COMPONENTE MODAL DE RELATÓRIO ---
const QualityReportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  metrics: QualityMetrics;
}> = ({ isOpen, onClose, metrics }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all scale-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center flex-shrink-0">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Relatório de Qualidade
          </h3>
          <button onClick={onClose} className="text-white text-opacity-80 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center">
              <div className="text-sm text-indigo-500 font-medium uppercase tracking-wide">Total Aulas</div>
              <div className="text-3xl font-bold text-indigo-700">{metrics.totalLessons}</div>
            </div>
            <div className={`p-4 rounded-xl border text-center ${metrics.conflicts.length > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <div className={`text-sm font-medium uppercase tracking-wide ${metrics.conflicts.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                Conflitos
              </div>
              <div className={`text-3xl font-bold ${metrics.conflicts.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {metrics.conflicts.length}
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            
            {/* Conflicts */}
            {metrics.conflicts.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  Choques Críticos
                </h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {metrics.conflicts.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}

            {/* Suggestions (AI Logic) */}
            {metrics.suggestions.length > 0 && (
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg shadow-sm">
                <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                  <span className="text-xl">🧞</span>
                  Sugestões Inteligentes de Troca
                </h4>
                <p className="text-xs text-purple-600 mb-2">
                  O algoritmo detectou oportunidades de melhoria se alguns professores alterarem a disponibilidade:
                </p>
                <ul className="text-sm text-purple-800 space-y-2">
                  {metrics.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 bg-white p-2 rounded border border-purple-100">
                      <span className="mt-0.5 text-purple-500">✨</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings (Aulas Solitárias) */}
            {metrics.warnings.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  Atenção Necessária
                </h4>
                <ul className="text-sm text-amber-800 space-y-2">
                  {metrics.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hints (Otimização) */}
            {metrics.hints.length > 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                  Otimizações Gerais
                </h4>
                <ul className="text-sm text-blue-800 space-y-2">
                  {metrics.hints.map((h, i) => (
                   <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-400">ℹ️</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {metrics.warnings.length === 0 && metrics.hints.length === 0 && metrics.conflicts.length === 0 && metrics.suggestions.length === 0 && (
              <div className="text-center py-8">
                <div className="text-5xl mb-2">✨</div>
                <h4 className="text-lg font-bold text-gray-700">Tudo parece perfeito!</h4>
                <p className="text-gray-500 text-sm">Nenhum problema detectado na grade atual.</p>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end flex-shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};


const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({
  schedule,
  isLoading,
  timeSlots,
  teachers,
  onSave,
  isSaving,
}) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    const savedMode =
      typeof window !== "undefined"
        ? localStorage.getItem("scheduleDisplayMode")
        : "geral";
    if (
      savedMode === "turma" ||
      savedMode === "professor" ||
      savedMode === "geral"
    ) {
      return savedMode as DisplayMode;
    }
    return "geral";
  });

  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>("");
  const [showReport, setShowReport] = useState(false); // Modal state

  useEffect(() => {
    localStorage.setItem("scheduleDisplayMode", displayMode);
  }, [displayMode]);

  const allGrades = useMemo(() => {
    if (!teachers) return [];
    const grades = new Set(
      teachers.flatMap((t) => t.classAssignments.map((a) => a.grade))
    );
    return Array.from(grades).sort();
  }, [teachers]);

  const allTeacherNames = useMemo(() => {
    if (!teachers) return [];
    return teachers.map((t) => t.name).sort();
  }, [teachers]);

  // Calculando métricas para o modal
  const reportMetrics = useMemo(() => {
    if (!schedule) return { totalLessons: 0, warnings: [], hints: [], conflicts: [] };
    return calculateQualityMetrics(schedule, teachers);
  }, [schedule, teachers]);

  useEffect(() => {
    if (allGrades.length > 0 && !selectedGrade) {
      setSelectedGrade(allGrades[0]);
    }
  }, [allGrades, selectedGrade]);

  useEffect(() => {
    if (allTeacherNames.length > 0 && !selectedTeacherName) {
      setSelectedTeacherName(allTeacherNames[0]);
    }
  }, [allTeacherNames, selectedTeacherName]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!schedule) {
    return <EmptyState />;
  }

  const renderCell = (day: string, timeSlot: string) => {
    const slotData = schedule[day]?.[timeSlot] ?? [];

    if (!slotData || slotData.length === 0) {
      return null;
    }

    switch (displayMode) {
      case "geral":
        // Mostra todas as aulas do slot
        return (
          <div className="flex flex-col gap-1">
            {slotData.map((item, idx) => (
              <CellContent
                key={idx}
                grade={item.grade}
                subject={item.subject}
                teacher={item.teacherName}
              />
            ))}
          </div>
        );
      case "turma":
        // Filtra apenas a turma selecionada
        const turmaItem = slotData.find((item) => item.grade === selectedGrade);
        if (turmaItem) {
          return (
            <CellContent
              subject={turmaItem.subject}
              teacher={turmaItem.teacherName}
            />
          );
        }
        break;
      case "professor":
        // Filtra apenas o professor selecionado
        const profItem = slotData.find(
          (item) => item.teacherName === selectedTeacherName
        );
        if (profItem) {
          return (
            <CellContent grade={profItem.grade} subject={profItem.subject} />
          );
        }
        break;
    }
    return null;
  };

  // Renderiza a Matrix View para o modo 'geral'
  // Linhas: Dia + Horário específico (ex: Segunda-feira 1ª Aula)
  // Colunas: Professores
  // Células: Turma + Disciplina ou vazio (janela)
  const renderMatrixView = () => {
    // Gerar lista de linhas: cada combinação de dia + slot
    const rows: { day: string; slot: string; label: string }[] = [];
    DAYS_OF_WEEK.forEach((day) => {
      timeSlots.forEach((slot) => {
        rows.push({ day, slot, label: `${day} - ${slot}` });
      });
    });

    return (
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh] border border-gray-200 rounded-lg">
        <table className="min-w-full border-collapse">
          <thead className="sticky top-0 z-20">
            <tr>
              {/* Corner cell - sticky both axes */}
              <th className="sticky left-0 z-30 bg-indigo-600 text-white px-4 py-3 text-sm font-semibold text-left border-r border-indigo-500 min-w-[180px]">
                Dia / Horário
              </th>
              {/* Professor headers */}
              {allTeacherNames.map((teacher, idx) => (
                <th
                  key={teacher}
                  className={`bg-indigo-600 text-white px-3 py-3 text-sm font-semibold text-center whitespace-nowrap min-w-[140px] ${
                    idx < allTeacherNames.length - 1
                      ? "border-r border-indigo-500"
                      : ""
                  }`}
                >
                  {teacher}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ day, slot, label }, rowIndex) => {
              // Verificar se é a primeira aula de um novo dia para adicionar separador visual
              const isNewDay = rowIndex === 0 || rows[rowIndex - 1].day !== day;

              return (
                <tr
                  key={label}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    isNewDay ? "border-t-4 border-t-indigo-600" : ""
                  }`}
                >
                  {/* Row header - sticky left */}
                  <td className="sticky left-0 z-10 bg-gray-100 font-medium text-gray-700 px-4 py-2 text-sm whitespace-nowrap border-r border-gray-200">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">{day}</span>
                      <span className="font-semibold text-gray-800">
                        {slot}
                      </span>
                    </div>
                  </td>
                  {/* Data cells - one per professor */}
                  {allTeacherNames.map((teacherName, colIdx) => {
                    const slotData = schedule[day]?.[slot] ?? [];
                    const lesson = slotData.find(
                      (item) => item.teacherName === teacherName
                    );

                    return (
                      <td
                        key={`${label}-${teacherName}`}
                        className={`px-2 py-1 text-center align-middle ${
                          colIdx < allTeacherNames.length - 1
                            ? "border-r border-gray-100"
                            : ""
                        }`}
                      >
                        {lesson ? (
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-2 rounded text-xs min-h-[50px] flex flex-col justify-center">
                            <p className="font-bold text-blue-900">
                              {lesson.grade}
                            </p>
                            <p className="text-blue-700">{lesson.subject}</p>
                          </div>
                        ) : (
                          <div className="min-h-[50px] bg-gray-50 rounded flex items-center justify-center">
                            <span className="text-gray-300 text-xs">—</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Função auxiliar para obter os dados filtrados conforme o modo de exibição
  const getFilteredData = () => {
    const data: { slot: string; cells: { day: string; content: string }[] }[] =
      [];

    timeSlots.forEach((slot) => {
      const row: { day: string; content: string }[] = [];
      DAYS_OF_WEEK.forEach((day) => {
        const cells = schedule[day]?.[slot] ?? [];
        let content = "";

        if (cells && cells.length > 0) {
          if (displayMode === "geral") {
            // Concatena todas as aulas do slot
            content = cells
              .map(
                (cell) =>
                  `${cell.grade} - ${cell.subject} (${cell.teacherName})`
              )
              .join("\n");
          } else if (displayMode === "turma") {
            const cell = cells.find((c) => c.grade === selectedGrade);
            if (cell) {
              content = `${cell.subject} (${cell.teacherName})`;
            }
          } else if (displayMode === "professor") {
            const cell = cells.find(
              (c) => c.teacherName === selectedTeacherName
            );
            if (cell) {
              content = `${cell.grade} - ${cell.subject}`;
            }
          }
        }
        row.push({ day, content });
      });
      data.push({ slot, cells: row });
    });

    return data;
  };

  // Gerar título do relatório
  const getReportTitle = () => {
    if (displayMode === "turma" && selectedGrade) {
      return `Quadro de Horários - ${selectedGrade}`;
    } else if (displayMode === "professor" && selectedTeacherName) {
      return `Quadro de Horários - Prof. ${selectedTeacherName}`;
    }
    return "Quadro de Horários - Visão Geral";
  };

  // Função para download em diferentes formatos
  const handleDownload = (format: "pdf" | "csv") => {
    if (!schedule) return;

    const filename = `quadro-horarios-${
      new Date().toISOString().split("T")[0]
    }`;
    const filteredData = getFilteredData();
    const title = getReportTitle();

    if (format === "pdf") {
      // Gerar HTML formatado e abrir em nova janela para impressão
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Por favor, permita pop-ups para baixar o PDF.");
        return;
      }

      // Para modo 'geral', usar layout Matrix (Professores x Horários) com Landscape
      const isMatrixMode = displayMode === 'geral';
      const matrixRows = DAYS_OF_WEEK.flatMap(day =>
        timeSlots.map(slot => ({ day, slot, label: `${day} - ${slot}` }))
      );

      const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { 
      size: ${isMatrixMode ? 'landscape' : 'portrait'}; 
      margin: 1cm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      padding: 15px; 
      background: white;
    }
    .header {
      text-align: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #6366f1;
    }
    .header h1 {
      color: #1f2937;
      font-size: 20px;
      margin-bottom: 5px;
    }
    .header p {
      color: #6b7280;
      font-size: 11px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 10px;
      font-size: ${isMatrixMode ? '9px' : '11px'};
    }
    th { 
      background: #6366f1; 
      color: white; 
      padding: 8px 4px; 
      text-align: center;
      font-weight: 600;
      white-space: nowrap;
    }
    td { 
      border: 1px solid #e5e7eb; 
      padding: 6px 4px; 
      text-align: center;
      vertical-align: middle;
    }
    .slot-header {
      background: #f3f4f6;
      font-weight: 600;
      color: #374151;
      white-space: nowrap;
      text-align: left;
      padding-left: 8px;
    }
    .day-separator td {
      border-top: 4px solid #6366f1;
    }
    .cell-content {
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      padding: 4px;
      border-radius: 3px;
      font-size: ${isMatrixMode ? '8px' : '10px'};
    }
    .cell-content .grade { font-weight: 700; color: #1e40af; }
    .cell-content .subject { color: #1e3a8a; }
    .empty-cell { background: #f9fafb; color: #d1d5db; }
    .footer {
      margin-top: 15px;
      text-align: center;
      color: #9ca3af;
      font-size: 9px;
    }
    @media print {
      body { padding: 5px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p>Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}${isMatrixMode ? ' | Visão Geral (Professores × Horários)' : ''}</p>
  </div>
  <table>
    <thead>
      <tr>
        ${isMatrixMode 
          ? `<th style="min-width: 120px;">Dia / Horário</th>${allTeacherNames.map(t => `<th>${t}</th>`).join('')}`
          : `<th style="width: 80px;">Horário</th>${DAYS_OF_WEEK.map((day) => `<th>${day}</th>`).join("")}`
        }
      </tr>
    </thead>
    <tbody>
      ${isMatrixMode 
        ? matrixRows.map((row, idx) => {
            const isNewDay = idx === 0 || matrixRows[idx - 1].day !== row.day;
            return `
        <tr class="${isNewDay ? 'day-separator' : ''}">
          <td class="slot-header">
            <div style="font-size: 8px; color: #6b7280;">${row.day}</div>
            <div style="font-weight: 600;">${row.slot}</div>
          </td>
          ${allTeacherNames.map(teacherName => {
            const slotData = schedule[row.day]?.[row.slot] ?? [];
            const lesson = slotData.find(item => item.teacherName === teacherName);
            return lesson 
              ? `<td><div class="cell-content"><span class="grade">${lesson.grade}</span><br/><span class="subject">${lesson.subject}</span></div></td>`
              : `<td class="empty-cell">—</td>`;
          }).join('')}
        </tr>
      `}).join('')
        : filteredData.map((row) => `
        <tr>
          <td class="slot-header">${row.slot}</td>
          ${row.cells.map((cell) => `<td>${cell.content ? `<div class="cell-content">${cell.content}</div>` : ""}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  </table>
  <div class="footer">
    <p>HoraProfe - Sistema de Geração de Quadros de Horários</p>
  </div>
  <script>
    window.onload = function() { 
      window.print(); 
    }
  </script>
</body>
</html>`;

      printWindow.document.write(html);
      printWindow.document.close();
    } else if (format === "csv") {
      // Gerar CSV respeitando o modo de exibição
      let headers: string[];
      let rows: string[][];
      
      if (displayMode === 'geral') {
        // Modo Matrix: Professores como colunas, Dia+Horário como linhas
        const matrixRows = DAYS_OF_WEEK.flatMap(day =>
          timeSlots.map(slot => ({ day, slot, label: `${day} - ${slot}` }))
        );
        
        headers = ["Dia / Horário", ...allTeacherNames];
        rows = matrixRows.map(row => [
          row.label,
          ...allTeacherNames.map(teacherName => {
            const slotData = schedule[row.day]?.[row.slot] ?? [];
            const lesson = slotData.find(item => item.teacherName === teacherName);
            return lesson ? `${lesson.grade} - ${lesson.subject}` : '';
          })
        ]);
      } else {
        // Modos turma/professor: Layout original (Dias como colunas)
        headers = ["Horário", ...DAYS_OF_WEEK];
        rows = filteredData.map((row) => [
          row.slot,
          ...row.cells.map((cell) => cell.content),
        ]);
      }

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div id="schedule-display-area" className="overflow-x-auto bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 text-center sm:text-left">
            Quadro de Horários Gerado
          </h3>
          <div className="mt-2 flex items-center space-x-1 bg-gray-100 p-1 rounded-lg self-center">
            {(["geral", "turma", "professor"] as DisplayMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setDisplayMode(mode)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 capitalize ${
                  displayMode === mode
                    ? "bg-white text-primary shadow"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
                aria-pressed={displayMode === mode}
              >
                {mode === "turma"
                  ? "Por Turma"
                  : mode === "professor"
                  ? "Por Professor"
                  : "Geral"}
              </button>
            ))}
          </div>
        </div>

        {/* Botões de Download e Salvar */}
        <div className="flex flex-wrap gap-2 self-center sm:self-start">
          {onSave && (
            <button
              onClick={() => {
                console.log('[Salvar Grade] clicked - schedule:', !!schedule, 'onSave:', !!onSave);
                if (schedule && onSave) {
                  onSave(schedule);
                } else {
                  console.warn('[Salvar Grade] Cannot save: schedule or onSave is missing');
                }
              }}
              disabled={isSaving || !schedule}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Salvar Grade"
            >
              {isSaving ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Salvando...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                    <path
                      fillRule="evenodd"
                      d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Salvar Grade
                </>
              )}
            </button>
          )}
          <button
            onClick={() => handleDownload("pdf")}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            title="Baixar PDF"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586L7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                clipRule="evenodd"
              />
            </svg>
            PDF
          </button>
          <button
            onClick={() => handleDownload("csv")}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            title="Baixar Excel/CSV"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586L7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                clipRule="evenodd"
              />
            </svg>
            Excel
          </button>
          
          {/* Botão de Relatório */}
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
            title="Ver Relatório de Qualidade"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Relatório de Qualidade
          </button>
        </div>

        {/* Modal de Relatório */}
        <QualityReportModal 
          isOpen={showReport} 
          onClose={() => setShowReport(false)} 
          metrics={reportMetrics} 
        />

        <div className="self-start sm:self-center">
          {displayMode === "turma" && allGrades.length > 0 && (
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition bg-white"
              aria-label="Selecionar turma"
            >
              {allGrades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          )}
          {displayMode === "professor" && allTeacherNames.length > 0 && (
            <select
              value={selectedTeacherName}
              onChange={(e) => setSelectedTeacherName(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition bg-white"
              aria-label="Selecionar professor"
            >
              {allTeacherNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {/* Conditional rendering based on display mode */}
      {displayMode === 'geral' ? (
        renderMatrixView()
      ) : (
        <div className="grid grid-cols-6 gap-1 min-w-[700px]">
          <div className="font-bold text-gray-500 text-sm p-2">Horário</div>
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="font-bold text-gray-700 text-center text-sm p-2 bg-gray-100 rounded-t-lg"
            >
              {day}
            </div>
          ))}

          {timeSlots.map((slot) => (
            <React.Fragment key={slot}>
              <div className="font-bold text-gray-700 text-sm p-2 flex items-center justify-center bg-gray-100 rounded-l-lg">
                {slot}
              </div>
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={`${day}-${slot}`}
                  className="h-24 bg-gray-50 rounded-md"
                >
                  {renderCell(day, slot)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleDisplay;
