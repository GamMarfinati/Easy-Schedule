
import React, { useState, useEffect } from 'react';
import { Teacher, ClassAssignment } from '../types';
import { DAYS_OF_WEEK, SCHOOL_GRADES } from '../constants';

interface TeacherFormProps {
  onAddTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  teacherToEdit?: Teacher | null;
  onUpdateTeacher: (teacher: Teacher) => void;
  onCancelEdit: () => void;
}

const TeacherForm: React.FC<TeacherFormProps> = ({ onAddTeacher, teacherToEdit, onUpdateTeacher, onCancelEdit }) => {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [availabilityDays, setAvailabilityDays] = useState<string[]>([]);
  // FIX: Changed state to hold full ClassAssignment objects, including an ID.
  // This ensures type consistency when editing vs. adding assignments.
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([{ grade: '', classCount: 1, id: crypto.randomUUID() }]);

  useEffect(() => {
    if (teacherToEdit) {
      setName(teacherToEdit.name);
      setSubject(teacherToEdit.subject);
      setAvailabilityDays(teacherToEdit.availabilityDays);
      setClassAssignments(teacherToEdit.classAssignments);
    } else {
      setName('');
      setSubject('');
      setAvailabilityDays([]);
      // FIX: Resetting the form now includes a temporary unique ID for the initial assignment.
      setClassAssignments([{ grade: '', classCount: 1, id: crypto.randomUUID() }]);
    }
  }, [teacherToEdit]);

  const handleDayChange = (day: string) => {
    setAvailabilityDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAssignmentChange = <T,>(index: number, field: keyof Omit<ClassAssignment, 'id'>, value: T) => {
    const newAssignments = [...classAssignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    setClassAssignments(newAssignments);
  };

  const addAssignment = () => {
    // FIX: New assignments are created with a temporary unique ID to match the state's type.
    setClassAssignments([...classAssignments, { grade: '', classCount: 1, id: crypto.randomUUID() }]);
  };

  const removeAssignment = (index: number) => {
    if (classAssignments.length > 1) {
      setClassAssignments(classAssignments.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && subject && availabilityDays.length > 0 && classAssignments.every(a => a.grade && a.classCount > 0)) {
      if (teacherToEdit) {
        onUpdateTeacher({
          ...teacherToEdit,
          name,
          subject,
          availabilityDays,
          // FIX: The classAssignments state is now correctly typed as ClassAssignment[], resolving the error.
          classAssignments,
        });
      } else {
        onAddTeacher({
          name,
          subject,
          availabilityDays,
          // FIX: The map to add IDs is no longer needed as they are generated on creation.
          classAssignments,
        });
        // Reset form only in "add" mode. "Edit" mode reset is handled by useEffect.
        setName('');
        setSubject('');
        setAvailabilityDays([]);
        // FIX: Resetting the form now includes a temporary unique ID.
        setClassAssignments([{ grade: '', classCount: 1, id: crypto.randomUUID() }]);
      }
    } else {
      alert('Por favor, preencha todos os campos obrigatórios.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-lg space-y-6">
      <h3 className="text-2xl font-bold text-gray-800 border-b pb-3">{teacherToEdit ? 'Editar Professor' : 'Adicionar Professor'}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome do Professor</label>
          <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition" placeholder="Ex: João da Silva" required />
        </div>
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
          <input type="text" id="subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition" placeholder="Ex: Matemática" required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Disponibilidade</label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map(day => (
            <button type="button" key={day} onClick={() => handleDayChange(day)} className={`px-3 py-1.5 text-sm rounded-full transition-all duration-200 ${availabilityDays.includes(day) ? 'bg-primary text-white font-semibold shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
              {day}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Aulas por Turma</label>
        <div className="space-y-3">
          {classAssignments.map((assignment, index) => (
            <div key={assignment.id} className="flex items-center gap-2 bg-neutral p-2 rounded-lg">
                <select
                    value={assignment.grade}
                    onChange={e => handleAssignmentChange(index, 'grade', e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                    required
                >
                    <option value="" disabled>Selecione uma turma</option>
                    {SCHOOL_GRADES.map(group => (
                        <optgroup key={group.label} label={group.label}>
                            {group.options.map(grade => (
                                <option key={grade} value={grade}>{grade}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
              <input type="number" min="1" value={assignment.classCount} onChange={e => handleAssignmentChange(index, 'classCount', parseInt(e.target.value, 10))} className="w-24 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary" required />
              <button type="button" onClick={() => removeAssignment(index)} className="p-2 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50 disabled:hover:bg-transparent" disabled={classAssignments.length === 1}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addAssignment} className="mt-3 text-sm font-semibold text-primary hover:text-secondary">+ Adicionar turma</button>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          {teacherToEdit && (
            <button 
              type="button" 
              onClick={onCancelEdit} 
              className="w-full flex-1 bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition-transform transform hover:scale-105"
            >
              Cancelar
            </button>
          )}
          <button type="submit" className="w-full flex-1 bg-secondary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary transition-transform transform hover:scale-105 shadow-md">
            {teacherToEdit ? 'Atualizar Professor' : 'Adicionar Professor'}
          </button>
      </div>
    </form>
  );
};

export default TeacherForm;
