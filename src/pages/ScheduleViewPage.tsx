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
    .cell-content { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 6px; border-radius: 4px; font-size: 10px; }
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
            const cell = schedule[day]?.[slot];
            return `<td>${cell ? `<div class="cell-content">${cell.grade} - ${cell.subject} (${cell.teacherName})</div>` : ''}</td>`;
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
                const cell = schedule[day]?.[slot];
                return (
                  <div key={`${day}-${slot}`} className="h-24 bg-gray-50 rounded-md">
                    {cell && (
                      <div className="bg-blue-50 p-2 rounded-lg h-full flex flex-col justify-center text-center border-l-4 border-blue-400 text-xs">
                        <p className="font-bold text-sm text-blue-900">{cell.grade}</p>
                        <p className="text-blue-800 font-medium">{cell.subject}</p>
                        <p className="text-gray-500 italic mt-1">{cell.teacherName}</p>
                      </div>
                    )}
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
