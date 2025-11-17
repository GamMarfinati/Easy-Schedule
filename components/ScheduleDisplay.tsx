import React, { useState, useEffect, useMemo } from 'react';
import { Schedule, ScheduleSlot, Teacher } from '../types';
import { DAYS_OF_WEEK } from '../constants';

interface ScheduleDisplayProps {
  schedule: Schedule | null;
  isLoading: boolean;
  timeSlots: string[];
  teachers: Teacher[];
}

type DisplayMode = 'geral' | 'turma' | 'professor';

const LoadingState: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary"></div>
        <h3 className="mt-6 text-xl font-semibold text-gray-700">A IA está pensando...</h3>
        <p className="mt-2 text-gray-500 max-w-sm">
            Estamos organizando os horários, verificando conflitos e montando a grade perfeita. Este processo pode levar um momento.
        </p>
    </div>
);

const EmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4 bg-gray-50 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-4 text-xl font-semibold text-gray-700">Sua grade horária aparecerá aqui</h3>
        <p className="mt-1 text-gray-500">Adicione professores e clique em "Gerar Grade Horária" para começar.</p>
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


const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ schedule, isLoading, timeSlots, teachers }) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    const savedMode = typeof window !== 'undefined' ? localStorage.getItem('scheduleDisplayMode') : 'geral';
    if (savedMode === 'turma' || savedMode === 'professor' || savedMode === 'geral') {
        return savedMode as DisplayMode;
    }
    return 'geral';
  });
  
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>('');
  
  useEffect(() => {
    localStorage.setItem('scheduleDisplayMode', displayMode);
  }, [displayMode]);

  const allGrades = useMemo(() => {
    if (!teachers) return [];
    const grades = new Set(teachers.flatMap(t => t.classAssignments.map(a => a.grade)));
    return Array.from(grades).sort();
  }, [teachers]);

  const allTeacherNames = useMemo(() => {
    if (!teachers) return [];
    return teachers.map(t => t.name).sort();
  }, [teachers]);

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
    const slotData = schedule[day]?.[timeSlot] ?? null;

    if (!slotData) {
        return null;
    }

    switch (displayMode) {
        case 'geral':
            return <CellContent grade={slotData.grade} subject={slotData.subject} teacher={slotData.teacherName} />;
        case 'turma':
            if (slotData.grade === selectedGrade) {
                return <CellContent subject={slotData.subject} teacher={slotData.teacherName} />;
            }
            break;
        case 'professor':
            if (slotData.teacherName === selectedTeacherName) {
                return <CellContent grade={slotData.grade} subject={slotData.subject} />;
            }
            break;
    }
    return null;
  }

  return (
    <div className="overflow-x-auto bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
                 <h3 className="text-2xl font-bold text-gray-800 text-center sm:text-left">Grade Horária Gerada</h3>
                 <div className="mt-2 flex items-center space-x-1 bg-gray-100 p-1 rounded-lg self-center">
                    {(['geral', 'turma', 'professor'] as DisplayMode[]).map(mode => (
                         <button 
                            key={mode}
                            onClick={() => setDisplayMode(mode)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 capitalize ${displayMode === mode ? 'bg-white text-primary shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                            aria-pressed={displayMode === mode}
                        >
                            {mode === 'turma' ? 'Por Turma' : mode === 'professor' ? 'Por Professor' : 'Geral'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="self-start sm:self-center">
                {displayMode === 'turma' && allGrades.length > 0 && (
                    <select
                        value={selectedGrade}
                        onChange={e => setSelectedGrade(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition bg-white"
                        aria-label="Selecionar turma"
                    >
                        {allGrades.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                    </select>
                )}
                {displayMode === 'professor' && allTeacherNames.length > 0 && (
                     <select
                        value={selectedTeacherName}
                        onChange={e => setSelectedTeacherName(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition bg-white"
                        aria-label="Selecionar professor"
                    >
                        {allTeacherNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                )}
            </div>
        </div>
        <div className="grid grid-cols-6 gap-1 min-w-[700px]">
            <div className="font-bold text-gray-500 text-sm p-2">Horário</div>
            {DAYS_OF_WEEK.map(day => (
                <div key={day} className="font-bold text-gray-700 text-center text-sm p-2 bg-gray-100 rounded-t-lg">{day}</div>
            ))}

            {timeSlots.map(slot => (
                <React.Fragment key={slot}>
                    <div className="font-bold text-gray-700 text-sm p-2 flex items-center justify-center bg-gray-100 rounded-l-lg">{slot}</div>
                    {DAYS_OF_WEEK.map(day => (
                        <div key={`${day}-${slot}`} className="h-24 bg-gray-50 rounded-md">
                           {renderCell(day, slot)}
                        </div>
                    ))}
                </React.Fragment>
            ))}
        </div>
    </div>
  );
};

export default ScheduleDisplay;