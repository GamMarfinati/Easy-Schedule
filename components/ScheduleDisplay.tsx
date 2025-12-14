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
            Estamos organizando os horários, verificando conflitos e montando o quadro perfeito. Este processo pode levar um momento.
        </p>
    </div>
);

const EmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4 bg-gray-50 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-4 text-xl font-semibold text-gray-700">Seu quadro de horários aparecerá aqui</h3>
        <p className="mt-1 text-gray-500">Adicione professores e clique em "Gerar Quadro" para começar.</p>
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

  // Função para download em diferentes formatos
  const handleDownload = (format: 'pdf' | 'csv' | 'ics') => {
    if (!schedule) return;

    const filename = `quadro-horarios-${new Date().toISOString().split('T')[0]}`;

    if (format === 'pdf') {
      // Para PDF, abrimos a janela de impressão do navegador
      window.print();
    } else if (format === 'csv') {
      // Gerar CSV
      const headers = ['Horário', ...DAYS_OF_WEEK];
      const rows = timeSlots.map(slot => {
        const row = [slot];
        DAYS_OF_WEEK.forEach(day => {
          const cell = schedule[day]?.[slot];
          if (cell) {
            row.push(`${cell.grade} - ${cell.subject} (${cell.teacherName})`);
          } else {
            row.push('');
          }
        });
        return row;
      });

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'ics') {
      // Gerar ICS (formato de calendário)
      const events: string[] = [];
      const today = new Date();
      const dayMap: Record<string, number> = { 
        'Segunda-feira': 1, 'Terça-feira': 2, 'Quarta-feira': 3, 
        'Quinta-feira': 4, 'Sexta-feira': 5 
      };

      Object.entries(schedule).forEach(([day, slots]) => {
        if (!slots) return;
        Object.entries(slots).forEach(([timeSlot, cell]) => {
          if (!cell) return;
          const dayOffset = dayMap[day] - today.getDay();
          const eventDate = new Date(today);
          eventDate.setDate(today.getDate() + (dayOffset >= 0 ? dayOffset : dayOffset + 7));
          
          const slotIndex = timeSlots.indexOf(timeSlot);
          const startHour = 7 + slotIndex; // Assumindo que começa às 7h
          eventDate.setHours(startHour, 0, 0, 0);

          const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const endDate = new Date(eventDate);
          endDate.setMinutes(50);

          events.push([
            'BEGIN:VEVENT',
            `DTSTART:${formatDate(eventDate)}`,
            `DTEND:${formatDate(endDate)}`,
            `SUMMARY:${cell.subject} (${cell.grade})`,
            `DESCRIPTION:Professor: ${cell.teacherName}`,
            'END:VEVENT'
          ].join('\n'));
        });
      });

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//HoraProfe//Grade//PT',
        ...events,
        'END:VCALENDAR'
      ].join('\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.ics`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="overflow-x-auto bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
                 <h3 className="text-2xl font-bold text-gray-800 text-center sm:text-left">Quadro de Horários Gerado</h3>
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
            
            {/* Botões de Download */}
            <div className="flex flex-wrap gap-2 self-center sm:self-start">
                <button
                    onClick={() => handleDownload('pdf')}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    title="Baixar PDF"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586L7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                    </svg>
                    PDF
                </button>
                <button
                    onClick={() => handleDownload('csv')}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    title="Baixar CSV/Excel"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586L7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                    </svg>
                    Excel
                </button>
                <button
                    onClick={() => handleDownload('ics')}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    title="Baixar ICS (Calendário)"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Calendário
                </button>
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