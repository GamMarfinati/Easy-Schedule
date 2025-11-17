import React from 'react';
import { Teacher } from '../types';

interface TeacherCardProps {
  teacher: Teacher;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  isConflicting?: boolean;
  conflictingDays?: string[];
}

const TeacherCard: React.FC<TeacherCardProps> = ({ teacher, onRemove, onEdit, isConflicting, conflictingDays = [] }) => {
  return (
    <div className={`bg-white p-4 rounded-xl shadow-md border border-gray-200 relative transition-all hover:shadow-lg ${isConflicting ? 'border-red-500 ring-2 ring-red-200' : 'hover:border-primary'}`}>
        <div className="absolute top-2 right-2 flex items-center">
            <button onClick={() => onEdit(teacher.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors" aria-label={`Editar ${teacher.name}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
            </button>
            <button onClick={() => onRemove(teacher.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors" aria-label={`Remover ${teacher.name}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
        </div>
        <h4 className={`font-bold text-lg ${isConflicting ? 'text-red-600' : 'text-primary'}`}>{teacher.name}</h4>
        <p className="text-gray-600 text-sm">{teacher.subject}</p>
        <div className="mt-3">
            <p className="font-semibold text-xs text-gray-500 mb-1">Turmas:</p>
            <div className="flex flex-wrap gap-1.5">
                {teacher.classAssignments.map(a => (
                    <span key={a.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{a.grade} ({a.classCount} aulas)</span>
                ))}
            </div>
        </div>
        <div className="mt-3">
             <p className="font-semibold text-xs text-gray-500 mb-1">Disponibilidade:</p>
             <div className="flex flex-wrap gap-1.5">
                {teacher.availabilityDays.map(day => (
                    <span key={day} className={`text-xs px-2 py-1 rounded-full font-medium ${conflictingDays.includes(day) ? 'bg-red-200 text-red-900 ring-1 ring-red-500' : 'bg-green-100 text-green-800'}`}>
                        {day.substring(0,3)}
                    </span>
                ))}
            </div>
        </div>
    </div>
  );
};

export default TeacherCard;