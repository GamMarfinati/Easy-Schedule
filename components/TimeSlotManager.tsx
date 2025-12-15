import React, { useState, useRef, useEffect } from 'react';

interface TimeSlotManagerProps {
  timeSlots: string[];
  onTimeSlotsChange: (newTimeSlots: string[]) => void;
}

const TimeSlotManager: React.FC<TimeSlotManagerProps> = ({ timeSlots, onTimeSlotsChange }) => {
    const [newSlot, setNewSlot] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    // Focar no input quando entrar em modo de edição
    useEffect(() => {
        if (editingIndex !== null && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingIndex]);

    const handleAddSlot = () => {
        if (newSlot.trim() && !timeSlots.includes(newSlot.trim())) {
            onTimeSlotsChange([...timeSlots, newSlot.trim()]);
            setNewSlot('');
        }
    };

    const handleRemoveSlot = (index: number) => {
        onTimeSlotsChange(timeSlots.filter((_, i) => i !== index));
    };

    const handleStartEdit = (index: number) => {
        setEditingIndex(index);
        setEditValue(timeSlots[index]);
    };

    const handleSaveEdit = () => {
        if (editingIndex !== null && editValue.trim()) {
            const newSlots = [...timeSlots];
            newSlots[editingIndex] = editValue.trim();
            onTimeSlotsChange(newSlots);
        }
        setEditingIndex(null);
        setEditValue('');
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditValue('');
    };

    const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSaveEdit();
        } else if (event.key === 'Escape') {
            handleCancelEdit();
        }
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
                Adicione, remova ou edite os períodos do dia. Clique no texto para editar. A IA não alocará aulas em períodos de pausa.
            </p>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {timeSlots.map((slot, index) => (
                    <li key={index} className="flex items-center justify-between bg-neutral p-2 rounded-lg group">
                        {editingIndex === index ? (
                            // Modo de edição
                            <input
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                onBlur={handleSaveEdit}
                                className="flex-1 px-2 py-1 border-2 border-primary rounded-lg text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        ) : (
                            // Modo de visualização (clicável)
                            <button
                                onClick={() => handleStartEdit(index)}
                                className="flex-1 text-left text-gray-800 font-medium hover:text-primary hover:bg-primary/10 px-2 py-1 rounded transition-colors cursor-text"
                                title="Clique para editar"
                            >
                                {slot}
                            </button>
                        )}
                        <div className="flex items-center gap-1">
                            {editingIndex === index ? (
                                // Botões de salvar/cancelar
                                <>
                                    <button
                                        onClick={handleSaveEdit}
                                        className="p-1.5 text-green-600 hover:bg-green-100 rounded-full"
                                        aria-label="Salvar"
                                        title="Salvar (Enter)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full"
                                        aria-label="Cancelar"
                                        title="Cancelar (Esc)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </>
                            ) : (
                                // Botões de editar/remover
                                <>
                                    <button
                                        onClick={() => handleStartEdit(index)}
                                        className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label={`Editar ${slot}`}
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleRemoveSlot(index)}
                                        className="p-1.5 text-red-500 hover:bg-red-100 rounded-full"
                                        aria-label={`Remover ${slot}`}
                                        title="Remover"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                <input
                    type="text"
                    value={newSlot}
                    onChange={(e) => setNewSlot(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex: 7ª Aula ou Almoço"
                    className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
                />
                <button
                    onClick={handleAddSlot}
                    className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-secondary transition-transform transform hover:scale-105 whitespace-nowrap flex-shrink-0"
                >
                    Adicionar
                </button>
            </div>
        </div>
    );
};

export default TimeSlotManager;
