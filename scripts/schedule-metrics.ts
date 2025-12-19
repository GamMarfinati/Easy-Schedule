#!/usr/bin/env npx tsx
/**
 * Script temporário para gerar uma grade determinística e medir métricas
 * de janelas, aulas únicas por dia e aderência à disponibilidade.
 *
 * Execute com: npx tsx scripts/schedule-metrics.ts
 */

import { GeneticScheduler } from '../server/services/scheduler/algorithm.js';
import { convertFromGeneticOutput, convertToGeneticInput } from '../server/services/scheduler/adapter.js';

interface ClassAssignment {
  id: string;
  grade: string;
  classCount: number;
}

interface Teacher {
  id: string;
  name: string;
  subject: string;
  availabilityDays: string[];
  classAssignments: ClassAssignment[];
}

const timeSlots = [
  '07:15-08:05',
  '08:05-08:55',
  '09:10-10:00',
  '10:00-10:50',
  '11:05-11:55',
  '11:55-12:45'
];

const SAMPLE_TEACHERS: Teacher[] = [
  {
    id: 't-ana-port',
    name: 'Ana Pereira',
    subject: 'Português',
    availabilityDays: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'],
    classAssignments: [
      { id: 't-ana-1', grade: '1º Ano EM', classCount: 4 },
      { id: 't-ana-2', grade: '2º Ano EM', classCount: 4 },
      { id: 't-ana-3', grade: '3º Ano EM', classCount: 4 }
    ]
  },
  {
    id: 't-carlos-mat',
    name: 'Carlos Silva',
    subject: 'Matemática',
    availabilityDays: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'],
    classAssignments: [
      { id: 't-carlos-1', grade: '1º Ano EM', classCount: 4 },
      { id: 't-carlos-2', grade: '2º Ano EM', classCount: 4 },
      { id: 't-carlos-3', grade: '3º Ano EM', classCount: 4 }
    ]
  },
  {
    id: 't-beatriz-hist',
    name: 'Beatriz Costa',
    subject: 'História',
    availabilityDays: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira'],
    classAssignments: [
      { id: 't-beatriz-1', grade: '1º Ano EM', classCount: 2 },
      { id: 't-beatriz-2', grade: '2º Ano EM', classCount: 2 },
      { id: 't-beatriz-3', grade: '3º Ano EM', classCount: 2 }
    ]
  },
  {
    id: 't-daniel-geo',
    name: 'Daniel Oliveira',
    subject: 'Geografia',
    availabilityDays: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'],
    classAssignments: [
      { id: 't-daniel-1', grade: '1º Ano EM', classCount: 2 },
      { id: 't-daniel-2', grade: '2º Ano EM', classCount: 2 },
      { id: 't-daniel-3', grade: '3º Ano EM', classCount: 2 }
    ]
  },
  {
    id: 't-eduardo-fis',
    name: 'Eduardo Santos',
    subject: 'Física',
    availabilityDays: ['Segunda-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'],
    classAssignments: [
      { id: 't-eduardo-1', grade: '1º Ano EM', classCount: 2 },
      { id: 't-eduardo-2', grade: '2º Ano EM', classCount: 2 },
      { id: 't-eduardo-3', grade: '3º Ano EM', classCount: 2 }
    ]
  },
  {
    id: 't-fernanda-qui',
    name: 'Fernanda Lima',
    subject: 'Química',
    availabilityDays: ['Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'],
    classAssignments: [
      { id: 't-fernanda-1', grade: '1º Ano EM', classCount: 2 },
      { id: 't-fernanda-2', grade: '2º Ano EM', classCount: 2 },
      { id: 't-fernanda-3', grade: '3º Ano EM', classCount: 2 }
    ]
  },
  {
    id: 't-gabriel-bio',
    name: 'Gabriel Martins',
    subject: 'Biologia',
    availabilityDays: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira'],
    classAssignments: [
      { id: 't-gabriel-1', grade: '1º Ano EM', classCount: 2 },
      { id: 't-gabriel-2', grade: '2º Ano EM', classCount: 2 },
      { id: 't-gabriel-3', grade: '3º Ano EM', classCount: 2 }
    ]
  },
  {
    id: 't-helena-ing',
    name: 'Helena Rocha',
    subject: 'Inglês',
    availabilityDays: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'],
    classAssignments: [
      { id: 't-helena-1', grade: '1º Ano EM', classCount: 3 },
      { id: 't-helena-2', grade: '2º Ano EM', classCount: 3 },
      { id: 't-helena-3', grade: '3º Ano EM', classCount: 3 }
    ]
  },
  {
    id: 't-igor-edf',
    name: 'Igor Almeida',
    subject: 'Educação Física',
    availabilityDays: ['Segunda-feira', 'Terça-feira', 'Quinta-feira', 'Sexta-feira'],
    classAssignments: [
      { id: 't-igor-1', grade: '1º Ano EM', classCount: 2 },
      { id: 't-igor-2', grade: '2º Ano EM', classCount: 2 },
      { id: 't-igor-3', grade: '3º Ano EM', classCount: 2 }
    ]
  },
  {
    id: 't-julia-art',
    name: 'Julia Ribeiro',
    subject: 'Artes',
    availabilityDays: ['Quarta-feira', 'Quinta-feira', 'Sexta-feira'],
    classAssignments: [
      { id: 't-julia-1', grade: '1º Ano EM', classCount: 1 },
      { id: 't-julia-2', grade: '2º Ano EM', classCount: 1 },
      { id: 't-julia-3', grade: '3º Ano EM', classCount: 1 }
    ]
  },
  {
    id: 't-marcos-fil',
    name: 'Marcos Santos',
    subject: 'Filosofia',
    availabilityDays: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira'],
    classAssignments: [
      { id: 't-marcos-1', grade: '1º Ano EM', classCount: 2 },
      { id: 't-marcos-2', grade: '2º Ano EM', classCount: 2 },
      { id: 't-marcos-3', grade: '3º Ano EM', classCount: 2 }
    ]
  },
  {
    id: 't-patricia-soc',
    name: 'Patricia Lima',
    subject: 'Sociologia',
    availabilityDays: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Sexta-feira'],
    classAssignments: [
      { id: 't-patricia-1', grade: '1º Ano EM', classCount: 2 },
      { id: 't-patricia-2', grade: '2º Ano EM', classCount: 2 },
      { id: 't-patricia-3', grade: '3º Ano EM', classCount: 2 }
    ]
  },
  {
    id: 't-roberto-red',
    name: 'Roberto Alves',
    subject: 'Redação',
    availabilityDays: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'],
    classAssignments: [
      { id: 't-roberto-1', grade: '1º Ano EM', classCount: 2 },
      { id: 't-roberto-2', grade: '2º Ano EM', classCount: 2 },
      { id: 't-roberto-3', grade: '3º Ano EM', classCount: 2 }
    ]
  }
];

type Lesson = {
  day: string;
  timeSlot: string;
  grade: string;
  subject: string;
  teacherName: string;
};

const timeSlotIndex = new Map<string, number>(timeSlots.map((slot, idx) => [slot, idx + 1]));

const teacherAvailability = new Map<string, Set<string>>();
SAMPLE_TEACHERS.forEach(teacher => {
  teacherAvailability.set(teacher.name, new Set(teacher.availabilityDays));
});

function countGapOccurrences(periods: number[]): number {
  if (periods.length <= 1) return 0;
  const sorted = [...periods].sort((a, b) => a - b);
  let gaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > 1) {
      gaps += 1;
    }
  }
  return gaps;
}

function run() {
  console.log('📌 Gerando grade determinística com dados de exemplo...');

  const input = convertToGeneticInput(SAMPLE_TEACHERS, timeSlots);
  const scheduler = new GeneticScheduler(input);
  const solutions = scheduler.generate();

  if (!solutions.length) {
    console.error('❌ Nenhuma solução encontrada pelo solver determinístico.');
    process.exit(1);
  }

  const flatSchedule = convertFromGeneticOutput(solutions[0], input, SAMPLE_TEACHERS, timeSlots) as Lesson[];

  const teacherDayPeriods = new Map<string, Map<string, number[]>>();
  let availabilityViolations = 0;

  flatSchedule.forEach(lesson => {
    const slotIndex = timeSlotIndex.get(lesson.timeSlot);
    if (!slotIndex) return;

    const dayMap = teacherDayPeriods.get(lesson.teacherName) ?? new Map<string, number[]>();
    const periods = dayMap.get(lesson.day) ?? [];
    periods.push(slotIndex);
    dayMap.set(lesson.day, periods);
    teacherDayPeriods.set(lesson.teacherName, dayMap);

    const availability = teacherAvailability.get(lesson.teacherName);
    if (!availability || !availability.has(lesson.day)) {
      availabilityViolations += 1;
    }
  });

  let totalGaps = 0;
  let singleLessonDays = 0;

  teacherDayPeriods.forEach(dayMap => {
    dayMap.forEach(periods => {
      totalGaps += countGapOccurrences(periods);
      if (periods.length === 1) {
        singleLessonDays += 1;
      }
    });
  });

  console.log('\n📊 Relatório de métricas');
  console.log(`- Total de Janelas: ${totalGaps}`);
  console.log(`- Dias de Aula Única: ${singleLessonDays}`);
  console.log(`- Aderência à Disponibilidade: ${availabilityViolations} aula(s) fora da disponibilidade`);
  console.log(`- Total de aulas geradas: ${flatSchedule.length}`);
}

run();
