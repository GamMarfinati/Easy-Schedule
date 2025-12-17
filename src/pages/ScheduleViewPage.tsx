import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Schedule } from '../../types';
import { DAYS_OF_WEEK, DEFAULT_TIME_SLOTS } from '../../constants';

interface ScheduleData {
  id: string;
  name: string;
  status: string;
  data: {
    schedule: Schedule;
    metadata: {
      generatedAt: string;
      generationAttempts: number;
      teachersCount: number;
      timeSlotsCount: number;
      savedAt: string;
      hasConflicts?: boolean;
    };
  };
  created_at: string;
  updated_at: string;
}

const ScheduleViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    api.get(`/schedules/${id}`)
      .then(res => {
        setScheduleData(res.data);
      })
      .catch(err => {
        console.error('Error loading schedule:', err);
        setError('Erro ao carregar a grade.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Tem certeza que deseja excluir esta grade?')) return;

    try {
      await api.delete(`/schedules/${id}`);
      navigate('/app');
    } catch (err) {
      console.error('Error deleting schedule:', err);
      alert('Erro ao excluir grade.');
    }
  };

  const handleDownloadPDF = () => {
    if (!scheduleData) return;
    const schedule = scheduleData.data.schedule;
    const title = scheduleData.name;
    
    // Gerar HTML formatado
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
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: white; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #6366f1; }
    .header h1 { color: #1f2937; font-size: 24px; margin-bottom: 5px; }
    .header p { color: #6b7280; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
    th { background: #6366f1; color: white; padding: 10px 8px; text-align: center; font-weight: 600; }
    td { border: 1px solid #e5e7eb; padding: 8px; text-align: center; vertical-align: middle; min-height: 50px; }
    .slot-header { background: #f3f4f6; font-weight: 600; color: #374151; }
    .cell-content { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 6px; border-radius: 4px; font-size: 10px; margin-bottom: 4px; }
    .cell-content.conflict { background: #fef2f2; border-left-color: #ef4444; }
    .cell-content.conflict p { color: #991b1b; }
    .footer { margin-top: 20px; text-align: center; color: #9ca3af; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p>Gerado em ${new Date(scheduleData.created_at).toLocaleDateString('pt-BR')}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 80px;">Horário</th>
        ${DAYS_OF_WEEK.map(day => `<th>${day}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${DEFAULT_TIME_SLOTS.map(slot => `
        <tr>
          <td class="slot-header">${slot}</td>
          ${DAYS_OF_WEEK.map(day => {
            const cellItems = schedule[day]?.[slot];
            if (!cellItems || cellItems.length === 0) return '<td></td>';

            const content = cellItems.map(item => {
                const conflictClass = item.conflict ? 'conflict' : '';
                const conflictText = item.conflict ? `<br/><span style="color:red;font-weight:bold;">⚠️ ${item.conflict.message}</span>` : '';
                return `<div class="cell-content ${conflictClass}">${item.grade} - ${item.subject} (${item.teacherName})${conflictText}</div>`;
            }).join('');

            return `<td>${content}</td>`;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="footer"><p>HoraProfe - Sistema de Geração de Quadros de Horários</p></div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !scheduleData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Grade não encontrada.'}</p>
        <Link to="/app" className="text-indigo-600 hover:text-indigo-800">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  const schedule = scheduleData.data.schedule;
  const metadata = scheduleData.data.metadata;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/app" className="text-gray-500 hover:text-gray-700">
              ← Voltar
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{scheduleData.name}</h1>
          <p className="text-sm text-gray-500">
            Criada em {new Date(scheduleData.created_at).toLocaleDateString('pt-BR')} às {new Date(scheduleData.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586L7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
            </svg>
            PDF
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Warning for conflicts */}
      {metadata?.hasConflicts && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Atenção: Esta grade foi gerada com conflitos porque não foi possível encontrar uma solução perfeita dentro do tempo limite.
                Verifique as células em vermelho.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      {metadata && (
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500">Professores</p>
            <p className="text-xl font-bold text-gray-900">{metadata.teachersCount || '-'}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500">Períodos</p>
            <p className="text-xl font-bold text-gray-900">{metadata.timeSlotsCount || '-'}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500">Tentativas de Geração</p>
            <p className="text-xl font-bold text-gray-900">{metadata.generationAttempts || 1}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500">Status</p>
            <p className={`text-xl font-bold ${scheduleData.status === 'published' ? 'text-green-600' : 'text-yellow-600'}`}>
              {scheduleData.status === 'published' ? 'Publicada' : 'Rascunho'}
            </p>
          </div>
        </div>
      )}

      {/* Schedule Grid */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg overflow-x-auto">
        <div className="grid grid-cols-6 gap-1 min-w-[700px]">
          <div className="font-bold text-gray-500 text-sm p-2">Horário</div>
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="font-bold text-gray-700 text-center text-sm p-2 bg-gray-100 rounded-t-lg">{day}</div>
          ))}

          {DEFAULT_TIME_SLOTS.map(slot => (
            <React.Fragment key={slot}>
              <div className="font-bold text-gray-700 text-sm p-2 flex items-center justify-center bg-gray-100 rounded-l-lg">{slot}</div>
              {DAYS_OF_WEEK.map(day => {
                const cellItems = schedule[day]?.[slot] || [];

                return (
                  <div key={`${day}-${slot}`} className="min-h-24 h-auto bg-gray-50 rounded-md p-1">
                    {cellItems.map((item, idx) => {
                       const isConflict = !!item.conflict;
                       return (
                        <div key={idx} className={`${isConflict ? 'bg-red-50 border-red-400' : 'bg-blue-50 border-blue-400'} p-2 rounded-lg mb-1 flex flex-col justify-center text-center border-l-4 text-xs transition-colors duration-200 relative group`}>
                            <p className={`font-bold text-sm ${isConflict ? 'text-red-900' : 'text-blue-900'}`}>{item.grade}</p>
                            <p className={`${isConflict ? 'text-red-800' : 'text-blue-800'} font-medium`}>{item.subject}</p>
                            <p className="text-gray-500 italic mt-1">{item.teacherName}</p>

                            {isConflict && (
                              <div className="absolute top-1 right-1">
                                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}

                            {/* Tooltip for conflict */}
                            {isConflict && (
                               <div className="hidden group-hover:block absolute z-20 w-48 p-2 mt-1 text-xs text-white bg-red-800 rounded-lg shadow-lg -top-10 left-1/2 transform -translate-x-1/2">
                                 {item.conflict?.message || 'Conflito detectado'}
                               </div>
                            )}
                        </div>
                       );
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScheduleViewPage;
