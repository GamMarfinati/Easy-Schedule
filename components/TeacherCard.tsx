import React, { useState, useRef, useEffect } from 'react';
import { Teacher } from '../types';

interface TeacherCardProps {
  teacher: Teacher;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onUpdate: (teacher: Teacher) => void;
  isConflicting?: boolean;
  conflictingDays?: string[];
}

import { DAYS_OF_WEEK } from '../constants';

const TeacherCard: React.FC<TeacherCardProps> = ({ teacher, onRemove, onEdit, onUpdate, isConflicting, conflictingDays = [] }) => {
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActiveDay(null);
      }
    };
    if (activeDay) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDay]);

  const handleDayClick = (day: string) => {
    setActiveDay(activeDay === day ? null : day);
  };

  const toggleSlot = (day: string, slotIndex: number) => {
    const currentAvailability = teacher.availability || {};
    let daySlots = currentAvailability[day];

    // Initialize with all 1s if not present
    if (!daySlots) {
       daySlots = [1, 1, 1, 1, 1, 1]; // Assume 6 slots default
    }

    const newSlots = [...daySlots];
    newSlots[slotIndex] = newSlots[slotIndex] === 1 ? 0 : 1;

    // Check if all are 0? user might want that.
    
    const updatedTeacher = {
        ...teacher,
        availability: {
            ...currentAvailability,
            [day]: newSlots
        }
    };
    
    onUpdate(updatedTeacher);
  };

  // Helper to get slot status
  const getSlotStatus = (day: string, index: number) => {
      // If availability mapping exists, use it
     if (teacher.availability && teacher.availability[day]) {
         return teacher.availability[day][index] === 1;
     }
     // Default is available (1) if day is in availabilityDays (controlled by parent logic mostly)
     return true;
  };
  
  // Sort days: create a map of day -> index
  const dayOrder = DAYS_OF_WEEK.reduce((acc, day, index) => {
      acc[day] = index;
      return acc;
  }, {} as Record<string, number>);

  const sortedDays = (teacher.availabilityDays || []).sort((a, b) => {
      return (dayOrder[a] ?? 99) - (dayOrder[b] ?? 99);
  });

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
        <div className="mt-3 relative">
             <p className="font-semibold text-xs text-gray-500 mb-1">Disponibilidade (Clique para ajustar slots):</p>
             <div className="flex flex-wrap gap-1.5">
                {sortedDays.map(day => (
                    <div key={day} className="relative">
                        <button 
                            type="button"
                            onClick={() => handleDayClick(day)}
                            className={`text-xs px-2 py-1 rounded-full font-medium transition-colors cursor-pointer border ${
                                conflictingDays.includes(day) 
                                    ? 'bg-red-200 text-red-900 border-red-500' 
                                    : activeDay === day
                                       ? 'bg-purple-100 text-purple-900 border-purple-400 ring-2 ring-purple-200'
                                       : 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                            }`}
                        >
                            {day.substring(0,3)}
                        </button>
                        
                        {activeDay === day && (
                            <div ref={popoverRef} className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3">
                                <h5 className="text-xs font-bold text-gray-700 mb-2 text-center">{day} - Selecione as aulas</h5>
                                <div className="flex flex-col gap-2">
                                    {[0, 1, 2, 3, 4, 5].map(idx => {
                                        const isActive = getSlotStatus(day, idx);
                                        return (
                                            <button 
                                                type="button"
                                                key={idx}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    toggleSlot(day, idx);
                                                }}
                                                className={`w-full py-1.5 flex items-center justify-center text-xs font-bold rounded transition-colors ${
                                                    isActive 
                                                        ? 'bg-green-500 text-white hover:bg-green-600' 
                                                        : 'bg-red-100 text-red-400 hover:bg-red-200'
                                                }`}
                                                title={`Slot ${idx + 1}`}
                                            >
                                                Aula {idx + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-2 text-[10px] text-gray-400 text-center">Verde = Disponível</div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default TeacherCard;