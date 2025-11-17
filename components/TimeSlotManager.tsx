import React, { useState } from 'react';

interface TimeSlotManagerProps {
  timeSlots: string[];
  onTimeSlotsChange: (newTimeSlots: string[]) => void;
}

const TimeSlotManager: React.FC<TimeSlotManagerProps> = ({ timeSlots, onTimeSlotsChange }) => {
    const [newSlot, setNewSlot] = useState('');

    const handleAddSlot = () => {
        if (newSlot.trim() && !timeSlots.includes(newSlot.trim())) {
            onTimeSlotsChange([...timeSlots, newSlot.trim()]);
            setNewSlot('');
        }
    };

    const handleRemoveSlot = (index: number) => {
        onTimeSlotsChange(timeSlots.filter((_, i) => i !== index));
    };
    
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleAddSlot();
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg space-y-4">
            <h3 className="text-2xl font-bold text-gray-800">Gerenciar Períodos</h3>
            <p className="text-sm text-gray-600">
                Adicione, remova ou edite os períodos do dia. Você pode incluir intervalos ou horários de almoço. A IA não alocará aulas em períodos de pausa.
            </p>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {timeSlots.map((slot, index) => (
                    <li key={index} className="flex items-center justify-between bg-neutral p-2 rounded-lg">
                        <span className="text-gray-800 font-medium">{slot}</span>
                        <button
                            onClick={() => handleRemoveSlot(index)}
                            className="p-1.5 text-red-500 hover:bg-red-100 rounded-full"
                            aria-label={`Remover ${slot}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </li>
                ))}
            </ul>
            <div className="flex gap-2 pt-2 border-t">
                <input
                    type="text"
                    value={newSlot}
                    onChange={(e) => setNewSlot(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex: 7ª Aula ou Almoço"
                    className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                />
                <button
                    onClick={handleAddSlot}
                    className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-secondary transition-transform transform hover:scale-105"
                >
                    Adicionar
                </button>
            </div>
        </div>
    );
};

export default TimeSlotManager;
