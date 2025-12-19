import React from 'react';
import { ScheduleQualityMetrics } from '../types';

interface QualitySummaryProps {
  metrics: ScheduleQualityMetrics;
}

type Status = 'good' | 'warn' | 'bad';

const statusStyles: Record<Status, { bg: string; text: string; border: string }> = {
  good: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  warn: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  bad: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
};

const StatusIcon: React.FC<{ status: Status }> = ({ status }) => {
  if (status === 'good') {
    return (
      <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.707a1 1 0 011.414-1.414l3.222 3.222 6.657-6.657a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className={`w-5 h-5 ${status === 'warn' ? 'text-amber-600' : 'text-red-600'}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.516 9.81c.75 1.334-.213 2.991-1.742 2.991H4.483c-1.53 0-2.492-1.657-1.743-2.991l5.517-9.81zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-7a1 1 0 00-.993.883L9 7v4a1 1 0 001.993.117L11 11V7a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
};

const statusLabel = (status: Status) => {
  if (status === 'good') return 'Bom';
  if (status === 'warn') return 'Atenção';
  return 'Ruim';
};

const getGapStatus = (value: number): Status => {
  if (value === 0) return 'good';
  if (value <= 3) return 'warn';
  return 'bad';
};

const getSingleLessonStatus = (value: number): Status => {
  if (value === 0) return 'good';
  if (value <= 2) return 'warn';
  return 'bad';
};

const getAdherenceStatus = (violations: number): Status => {
  return violations === 0 ? 'good' : 'bad';
};

const QualitySummary: React.FC<QualitySummaryProps> = ({ metrics }) => {
  const gapStatus = getGapStatus(metrics.totalGaps);
  const singleLessonStatus = getSingleLessonStatus(metrics.singleLessonDays);
  const adherenceStatus = getAdherenceStatus(metrics.availabilityViolations);

  const cards = [
    {
      title: 'Janelas',
      value: metrics.totalGaps,
      status: gapStatus,
      description: 'Intervalos entre aulas do mesmo professor no dia'
    },
    {
      title: 'Dias de Aula Única',
      value: metrics.singleLessonDays,
      status: singleLessonStatus,
      description: 'Dias em que o professor tem apenas 1 aula'
    },
    {
      title: 'Aderência',
      value: `${metrics.adherencePercent}%`,
      status: adherenceStatus,
      description:
        metrics.availabilityViolations === 0
          ? '100% das aulas dentro da disponibilidade'
          : `${metrics.availabilityViolations} aula(s) fora da disponibilidade`
    }
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Resumo de Qualidade</h3>
          <p className="text-sm text-gray-500">Indicadores para confiança na grade gerada</p>
        </div>
        <span className="text-xs text-gray-400">Total de aulas: {metrics.totalLessons}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(card => {
          const styles = statusStyles[card.status];
          return (
            <div key={card.title} className={`border rounded-xl p-4 ${styles.bg} ${styles.border}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">{card.title}</p>
                <StatusIcon status={card.status} />
              </div>
              <div className={`mt-2 text-2xl font-bold ${styles.text}`}>{card.value}</div>
              <p className="mt-1 text-xs text-gray-500">{card.description}</p>
              <span className={`mt-3 inline-flex items-center text-xs font-semibold ${styles.text}`}>
                {statusLabel(card.status)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QualitySummary;
