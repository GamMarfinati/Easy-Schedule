import React, { useState, useCallback } from 'react';
import { Teacher, ClassAssignment } from '../types';

interface DataImporterProps {
  onImport: (teachers: Teacher[]) => void;
}

const SAMPLE_TEACHERS_DATA = [
    {
        name: 'Carlos Andrade',
        subject: 'Matemática',
        availabilityDays: ['Segunda-feira', 'Quarta-feira', 'Sexta-feira'],
        classAssignments: [ { grade: '9º Ano EF', classCount: 4 }, { grade: '1º Ano EM', classCount: 5 } ],
    },
    {
        name: 'Beatriz Lima',
        subject: 'Português',
        availabilityDays: ['Terça-feira', 'Quinta-feira', 'Sexta-feira'],
        classAssignments: [ { grade: '9º Ano EF', classCount: 5 }, { grade: '1º Ano EM', classCount: 5 } ],
    },
    {
        name: 'Fernanda Costa',
        subject: 'História',
        availabilityDays: ['Segunda-feira', 'Terça-feira', 'Quarta-feira'],
        classAssignments: [ { grade: '9º Ano EF', classCount: 3 }, { grade: '1º Ano EM', classCount: 3 }, { grade: '2º Ano EM', classCount: 4 } ],
    },
    {
        name: 'Ricardo Alves',
        subject: 'Geografia',
        availabilityDays: ['Quarta-feira', 'Quinta-feira'],
        classAssignments: [ { grade: '9º Ano EF', classCount: 3 }, { grade: '1º Ano EM', classCount: 3 } ],
    },
];


const DataImporter: React.FC<DataImporterProps> = ({ onImport }) => {
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    const header = "Nome do Professor,Disciplina,Dias Disponíveis,Turma,Quantidade de Aulas\n";
    const example = "Maria Souza,Português,\"Segunda-feira, Quarta-feira, Sexta-feira\",1º Ano EM,5\n";
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + example);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "modelo_professores.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string): Teacher[] => {
    // FIX: Define an intermediate type for teacher data during CSV parsing.
    // The class assignments don't have IDs at this stage, which caused a type mismatch.
    // This type correctly represents a teacher with class assignments that are yet to receive an ID.
    type TeacherImportData = Omit<Teacher, 'id' | 'classAssignments'> & {
      classAssignments: Omit<ClassAssignment, 'id'>[];
    };
    const teachersMap = new Map<string, TeacherImportData>();
    const lines = text.split('\n').filter(line => line.trim() !== '');

    if (lines.length <= 1) {
      throw new Error("O arquivo CSV está vazio ou contém apenas o cabeçalho.");
    }

    // Remove header
    lines.shift();

    lines.forEach((line, index) => {
      // Handle potential commas within quoted strings
      const columns = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(col => col.replace(/"/g, '').trim()) ?? [];

      if (columns.length !== 5) {
        console.warn(`Linha ${index + 2} ignorada: formato incorreto. Esperado 5 colunas, mas foram encontradas ${columns.length}. Conteúdo: "${line}"`);
        return; // Skip malformed lines
      }

      const [name, subject, availabilityStr, grade, classCountStr] = columns;
      const classCount = parseInt(classCountStr, 10);

      if (!name || !subject || !availabilityStr || !grade || isNaN(classCount)) {
        console.warn(`Linha ${index + 2} ignorada: dados inválidos ou faltando. Conteúdo: "${line}"`);
        return; // Skip lines with invalid data
      }

      const classAssignment: Omit<ClassAssignment, 'id'> = { grade, classCount };

      if (teachersMap.has(name)) {
        const existingTeacher = teachersMap.get(name)!;
        existingTeacher.classAssignments.push(classAssignment);
      } else {
        const availabilityDays = availabilityStr.split(',').map(day => day.trim());
        teachersMap.set(name, {
          name,
          subject,
          availabilityDays,
          classAssignments: [classAssignment],
        });
      }
    });

    return Array.from(teachersMap.values()).map(t => ({
      ...t,
      id: crypto.randomUUID(),
      classAssignments: t.classAssignments.map(ca => ({ ...ca, id: crypto.randomUUID() })),
    }));
  };

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const importedTeachers = parseCSV(text);
        if(importedTeachers.length === 0) {
            setError("Nenhum professor válido encontrado no arquivo. Verifique se o formato está correto e os dados preenchidos.");
        } else {
            onImport(importedTeachers);
        }
      } catch (err) {
        if (err instanceof Error) {
            setError(`Erro ao processar o arquivo: ${err.message}`);
        } else {
            setError("Ocorreu um erro desconhecido ao processar o arquivo.");
        }
      }
    };

    reader.onerror = () => {
        setError("Não foi possível ler o arquivo selecionado.");
    };

    reader.readAsText(file, 'UTF-8');
    
    // Reset input to allow re-uploading the same file
    event.target.value = '';
  }, [onImport]);
  
  const handleLoadSampleData = useCallback(() => {
    const teachersWithIds: Teacher[] = SAMPLE_TEACHERS_DATA.map(teacher => ({
        ...teacher,
        id: crypto.randomUUID(),
        classAssignments: teacher.classAssignments.map(ca => ({
            ...ca,
            id: crypto.randomUUID(),
        })),
    }));
    onImport(teachersWithIds);
    setError(null);
  }, [onImport]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg space-y-4 border-l-4 border-accent">
        <h3 className="text-2xl font-bold text-gray-800">Comece Rapidamente</h3>
        <p className="text-sm text-gray-600">
            Para ver a mágica acontecer, carregue nossos dados de exemplo com um clique. Ou, importe sua própria lista de professores via arquivo CSV.
        </p>

        <div className="space-y-3 pt-2">
            <button
                type="button"
                onClick={handleLoadSampleData}
                className="w-full flex items-center justify-center gap-2 text-center bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                Carregar Dados de Exemplo
            </button>
            
            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-2 text-sm text-gray-500">OU</span></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="w-full flex-1 text-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 shadow"
                >
                    Baixar Modelo
                </button>
                <label className="w-full flex-1 cursor-pointer bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 shadow text-center">
                    Carregar CSV
                    <input
                        type="file"
                        className="hidden"
                        accept=".csv, text/csv"
                        onChange={handleFileChange}
                    />
                </label>
            </div>
        </div>
        {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Oops! </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}
    </div>
  );
};

export default DataImporter;