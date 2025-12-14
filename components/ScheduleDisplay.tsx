import React, { useState, useEffect, useMemo } from 'react';
import { Schedule, ScheduleSlot, Teacher } from '../types';
import { DAYS_OF_WEEK } from '../constants';

interface ScheduleDisplayProps {
  schedule: Schedule | null;
  isLoading: boolean;
  timeSlots: string[];
  teachers: Teacher[];
  onSave?: (schedule: Schedule) => Promise<void>;
  isSaving?: boolean;
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


const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ schedule, isLoading, timeSlots, teachers, onSave, isSaving }) => {
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

  // Função auxiliar para obter os dados filtrados conforme o modo de exibição
  const getFilteredData = () => {
    const data: { slot: string; cells: { day: string; content: string }[] }[] = [];
    
    timeSlots.forEach(slot => {
      const row: { day: string; content: string }[] = [];
      DAYS_OF_WEEK.forEach(day => {
        const cell = schedule[day]?.[slot];
        let content = '';
        
        if (cell) {
          if (displayMode === 'geral') {
            content = `${cell.grade} - ${cell.subject} (${cell.teacherName})`;
          } else if (displayMode === 'turma' && cell.grade === selectedGrade) {
            content = `${cell.subject} (${cell.teacherName})`;
          } else if (displayMode === 'professor' && cell.teacherName === selectedTeacherName) {
            content = `${cell.grade} - ${cell.subject}`;
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
    if (displayMode === 'turma' && selectedGrade) {
      return `Quadro de Horários - ${selectedGrade}`;
    } else if (displayMode === 'professor' && selectedTeacherName) {
      return `Quadro de Horários - Prof. ${selectedTeacherName}`;
    }
    return 'Quadro de Horários - Visão Geral';
  };

  // Função para download em diferentes formatos
  const handleDownload = (format: 'pdf' | 'csv') => {
    if (!schedule) return;

    const filename = `quadro-horarios-${new Date().toISOString().split('T')[0]}`;
    const filteredData = getFilteredData();
    const title = getReportTitle();

    if (format === 'pdf') {
      // Gerar HTML formatado e abrir em nova janela para impressão
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor, permita pop-ups para baixar o PDF.');
        return;
      }

      const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      padding: 20px; 
      background: white;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #6366f1;
    }
    .header h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 5px;
    }
    .header p {
      color: #6b7280;
      font-size: 12px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 10px;
      font-size: 11px;
    }
    th { 
      background: #6366f1; 
      color: white; 
      padding: 10px 8px; 
      text-align: center;
      font-weight: 600;
    }
    td { 
      border: 1px solid #e5e7eb; 
      padding: 8px; 
      text-align: center;
      vertical-align: middle;
      min-height: 50px;
    }
    .slot-header {
      background: #f3f4f6;
      font-weight: 600;
      color: #374151;
    }
    .cell-content {
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      padding: 6px;
      border-radius: 4px;
      font-size: 10px;
    }
    .cell-content .grade { font-weight: 700; color: #1e40af; }
    .cell-content .subject { color: #1e3a8a; }
    .cell-content .teacher { color: #6b7280; font-style: italic; font-size: 9px; }
    .footer {
      margin-top: 20px;
      text-align: center;
      color: #9ca3af;
      font-size: 10px;
    }
    @media print {
      body { padding: 10px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 80px;">Horário</th>
        ${DAYS_OF_WEEK.map(day => `<th>${day}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${filteredData.map(row => `
        <tr>
          <td class="slot-header">${row.slot}</td>
          ${row.cells.map(cell => `
            <td>${cell.content ? `<div class="cell-content">${cell.content}</div>` : ''}</td>
          `).join('')}
        </tr>
      `).join('')}
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
    } else if (format === 'csv') {
      // Gerar CSV respeitando o modo de exibição
      const headers = ['Horário', ...DAYS_OF_WEEK];
      const rows = filteredData.map(row => [
        row.slot,
        ...row.cells.map(cell => cell.content)
      ]);

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
            
            {/* Botões de Download e Salvar */}
            <div className="flex flex-wrap gap-2 self-center sm:self-start">
                {onSave && (
                    <button
                        onClick={() => schedule && onSave(schedule)}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Salvar Grade"
                    >
                        {isSaving ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                </svg>
                                Salvar Grade
                            </>
                        )}
                    </button>
                )}
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
                    title="Baixar Excel/CSV"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586L7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                    </svg>
                    Excel
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