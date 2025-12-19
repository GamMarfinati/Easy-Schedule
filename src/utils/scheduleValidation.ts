import { Teacher, Schedule, ScheduleSlot } from '../../types';

const DAYS_OF_WEEK = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira'
];

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  conflictCount: number;
}

interface ViabilityResult {
  viable: boolean;
  errors: string[];
}

/**
 * Analisa se é matematicamente possível gerar a grade com os recursos fornecidos.
 * @param teachers Lista de professores com suas disponibilidades e atribuições
 * @param classes Lista de turmas (grades)
 * @param timeSlots Lista de horários disponíveis por dia
 * @param days Lista de dias da semana (opcional, padrão: Seg-Sex)
 */
export function analisarViabilidade(
  teachers: Teacher[],
  classes: string[],
  timeSlots: string[],
  days: string[] = DAYS_OF_WEEK
): ViabilityResult {
  const errors: string[] = [];
  const slotsPerDay = timeSlots.length;
  const totalSlotsPerWeek = slotsPerDay * days.length;

  // 1. Verificar limites dos Professores (Aulas Atribuídas vs. Disponibilidade)
  teachers.forEach(teacher => {
    // Total de aulas que o professor precisa dar
    const totalAssignedLessons = teacher.classAssignments.reduce((sum, assignment) => sum + assignment.classCount, 0);
    
    // Total de slots que o professor tem disponível
    const availableDaysCount = teacher.availabilityDays.length;
    // Se o professor não marcou nenhum dia, assumimos 0
    const totalAvailableSlots = availableDaysCount * slotsPerDay;

    if (totalAssignedLessons > totalAvailableSlots) {
      errors.push(
        `O Professor ${teacher.name} tem ${totalAssignedLessons} aulas atribuídas, mas apenas ` +
        `${totalAvailableSlots} horários disponíveis na sua grade (${availableDaysCount} dias x ${slotsPerDay} horários).`
      );
    }
  });

  // 2. Verificar limites das Turmas (Aulas Requeridas vs. Espaço na Grade)
  // Agrupar todas as atribuições por turma
  const lessonsPerClass: { [grade: string]: number } = {};
  
  // Inicializar com as turmas passadas (para garantir que verificamos mesmo sem professores)
  classes.forEach(cls => lessonsPerClass[cls] = 0);

  teachers.forEach(teacher => {
    teacher.classAssignments.forEach(assignment => {
      // Normalizar nome da turma se necessário, aqui assumimos match exato
      // Somar aulas para essa turma
      if (lessonsPerClass[assignment.grade] !== undefined) {
         lessonsPerClass[assignment.grade] += assignment.classCount;
      } else {
         // Se a turma não estava na lista 'classes', a adicionamos (ou ignoramos se strict)
         // Vamos adicionar para ser seguro
         lessonsPerClass[assignment.grade] = assignment.classCount;
      }
    });
  });

  // Verificar cada turma
  Object.entries(lessonsPerClass).forEach(([className, totalRequired]) => {
    if (totalRequired > totalSlotsPerWeek) {
      errors.push(
        `A Turma ${className} tem ${totalRequired} aulas requeridas, mas existem apenas ` +
        `${totalSlotsPerWeek} horários na semana (${days.length} dias x ${slotsPerDay} horários).`
      );
    }
  });

  return {
    viable: errors.length === 0,
    errors
  };
}

/**
 * Valida uma grade gerada procurando conflitos.
 * @param schedule Objeto de grade (Schedule)
 * @param teachers Lista de professores (para verificar disponibilidade)
 */
export function validateSchedule(schedule: Schedule, teachers: Teacher[]): ValidationResult {
  const errors: string[] = [];
  let conflictCount = 0;

  // Mapa rápido de disponibilidade de professores: TeacherName -> Set<Day>
  const teacherAvailabilityMap = new Map<string, Set<string>>();
  teachers.forEach(t => {
    teacherAvailabilityMap.set(t.name, new Set(t.availabilityDays));
  });

  // Iterar por cada Dia
  for (const [day, timeSlots] of Object.entries(schedule)) {
    // Iterar por cada Horário
    for (const [time, slots] of Object.entries(timeSlots)) {
      // slots é um array de ScheduleSlot (uma aula por turma neste horário)
      // Ex: [ {grade: '1A', teacher: 'Joao'}, {grade: '1B', teacher: 'Maria'} ]

      // Check 1: Bilocação (Mesmo professor em duas turmas diferentes neste slot)
      const teachersInThisSlot = new Set<string>();
      
      // Check 2: Conflito de Turma (Mesma turma com duas aulas neste slot)
      // Nota: A estrutura Schedule geralmente agrupa por horário, mas se o array tiver duplicatas de turma, é erro
      const classesInThisSlot = new Set<string>();

      slots.forEach(slot => {
        // --- Validação de Professor ---
        if (slot.teacherName && slot.teacherName !== 'Livre' && slot.teacherName !== '-----') {
           // Checar Bilocação
           if (teachersInThisSlot.has(slot.teacherName)) {
             errors.push(`Conflito de Bilocação: Professor ${slot.teacherName} está em duas turmas ao mesmo tempo em ${day} às ${time}.`);
             conflictCount++;
           } else {
             teachersInThisSlot.add(slot.teacherName);
           }

           // Checar Disponibilidade
           const availableDays = teacherAvailabilityMap.get(slot.teacherName);
           if (availableDays && !availableDays.has(day)) {
             // O professor não trabalha neste dia
             errors.push(`Violação de Disponibilidade: Professor ${slot.teacherName} alocado em ${day}, mas não está disponível neste dia.`);
             conflictCount++;
           }
        }

        // --- Validação de Turma ---
        if (slot.grade) {
          if (classesInThisSlot.has(slot.grade)) {
             errors.push(`Conflito de Turma: Turma ${slot.grade} tem duas aulas simultâneas em ${day} às ${time}.`);
             conflictCount++;
          } else {
             classesInThisSlot.add(slot.grade);
          }
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    conflictCount
  };
}
