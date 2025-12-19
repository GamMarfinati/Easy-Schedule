import { Teacher, Schedule, ScheduleSlot } from '../../types';

// Tipos internos para o algoritmo
interface GeneticLesson {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  grade: string;
  day: string;
  timeSlot: string; // Ex: "08:00 - 08:50"
  slotIndex: number; // Índice para cálculos rápidos (0, 1, 2...)
  dayIndex: number; // Índice do dia (0=Seg, 1=Ter...)
  fixed: boolean; // Se foi fixado manualmente (futuro)
}

interface Chromosome {
  genes: GeneticLesson[];
  fitness: number;
  conflicts: number;
}

interface SchedulerConfig {
  populationSize: number;
  generations: number;
  mutationRate: number;
  eliteCount: number;
  timeSlots: string[]; // Lista ordenada de horários diários
  days: string[]; // Lista ordenada de dias
}

const DEFAULT_CONFIG: SchedulerConfig = {
  populationSize: 50,
  generations: 100,
  mutationRate: 0.1,
  eliteCount: 5,
  timeSlots: ["07:30", "08:20", "09:10", "10:15", "11:05"], // Default fallback
  days: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira']
};

export class GeneticSchedulerEnhanced {
  private teachers: Teacher[];
  private config: SchedulerConfig;
  private classes: string[];

  constructor(teachers: Teacher[], timeSlots: string[], days?: string[], config?: Partial<SchedulerConfig>) {
    this.teachers = teachers;
    this.classes = Array.from(new Set(teachers.flatMap(t => t.classAssignments.map(a => a.grade))));
    this.config = {
      ...DEFAULT_CONFIG,
      timeSlots: timeSlots,
      days: days || DEFAULT_CONFIG.days,
      ...config
    };
  }

  /**
   * Executa o algoritmo genético e retorna a melhor grade encontrada.
   */
  public generate(): { schedule: Schedule, score: number, conflicts: number } {
    let population = this.initializePopulation();
    let bestSolution = population[0];

    for (let gen = 0; gen < this.config.generations; gen++) {
      // Avaliar
      population.forEach(ind => this.calculateFitness(ind));
      population.sort((a, b) => b.fitness - a.fitness);

      // Melhor da geração
      if (population[0].fitness > bestSolution.fitness) {
        bestSolution = population[0];
      }

      // Se achou solução perfeita, para
      if (bestSolution.fitness >= 1000) break;

      // Elitismo
      const newPopulation = population.slice(0, this.config.eliteCount);

      // Crossover e Mutação
      while (newPopulation.length < this.config.populationSize) {
        if (Math.random() < 0.4) {
           // Crossover
           const parentA = this.tournamentSelect(population);
           const parentB = this.tournamentSelect(population);
           let child = this.crossover(parentA, parentB);
           // Mutação
           if (Math.random() < this.config.mutationRate) {
             child = this.mutate(child);
           }
           // Tentativa de Reparo
           this.repair(child);
           
           newPopulation.push(child);
        } else {
           // Introdução de indivíduos novos "inteligentes" para manter diversidade
           // ou apenas mutação de um pai
           const parent = this.tournamentSelect(population);
           let child = this.mutate({ ...parent, genes: [...parent.genes] }); // Clone deepish
           this.repair(child);
           newPopulation.push(child);
        }
      }
      population = newPopulation;
    }

    // Última tentativa de reparo no melhor indivíduo
    this.repair(bestSolution);
    this.calculateFitness(bestSolution);

    return {
      schedule: this.convertToSchedule(bestSolution),
      score: bestSolution.fitness,
      conflicts: bestSolution.conflicts
    };
  }

  private initializePopulation(): Chromosome[] {
    const population: Chromosome[] = [];
    // Criar indivíduos iniciais usando heurística inteligente
    for (let i = 0; i < this.config.populationSize; i++) {
      // Diferentes heurísticas para diversidade?
      // Por enquanto, todos usam a Smart Initialization com aleatoriedade controlada
      population.push(this.generateSmartIndividual());
    }
    return population;
  }

  /**
   * Gera um indivíduo tentando respeitar as restrições desde o início.
   * Ordena professores por "dificuldade" (menos disponibilidade = preenche primeiro).
   */
  private generateSmartIndividual(): Chromosome {
    const genes: GeneticLesson[] = [];
    const usageMap = new Set<string>(); // Chaves: "DayIdx-SlotIdx-Grade" e "DayIdx-SlotIdx-TeacherId"

    // Calcular dificuldade dos professores
    const sortedTeachers = [...this.teachers].sort((a, b) => {
      // Menos dias disponíveis = Mais difícil
      if (a.availabilityDays.length !== b.availabilityDays.length) {
        return a.availabilityDays.length - b.availabilityDays.length;
      }
      // Mais aulas para dar = Mais difícil
      const totalA = a.classAssignments.reduce((acc, c) => acc + c.classCount, 0);
      const totalB = b.classAssignments.reduce((acc, c) => acc + c.classCount, 0);
      return totalB - totalA;
    });

    for (const teacher of sortedTeachers) {
      // Preparar slots disponíveis do professor
      const availableIndices: { dayIdx: number, slotIdx: number }[] = [];
      this.config.days.forEach((d, dIdx) => {
        if (teacher.availabilityDays.includes(d)) {
          this.config.timeSlots.forEach((_, sIdx) => {
            availableIndices.push({ dayIdx: dIdx, slotIdx: sIdx });
          });
        }
      });

      // Embaralhar slots disponíveis para aleatoriedade na inicialização
      this.shuffleArray(availableIndices);

      for (const assignment of teacher.classAssignments) {
        for (let i = 0; i < assignment.classCount; i++) {
          let placed = false;
          
          // Tentar encontrar um slot livre nos disponíveis
          for (const slot of availableIndices) {
            const teacherKey = `${slot.dayIdx}-${slot.slotIdx}-${teacher.id}`;
            const classKey = `${slot.dayIdx}-${slot.slotIdx}-${assignment.grade}`;

            if (!usageMap.has(teacherKey) && !usageMap.has(classKey)) {
              genes.push({
                id: Math.random().toString(36).substr(2, 9),
                teacherId: teacher.id,
                teacherName: teacher.name,
                subject: teacher.subject,
                grade: assignment.grade,
                day: this.config.days[slot.dayIdx],
                dayIndex: slot.dayIdx,
                timeSlot: this.config.timeSlots[slot.slotIdx],
                slotIndex: slot.slotIdx,
                fixed: false
              });
              usageMap.add(teacherKey);
              usageMap.add(classKey);
              placed = true;
              break;
            }
          }

          if (!placed) {
            // Se não couber (conflito inevitável na inicialização), coloca em um slot aleatório disponível do prof (sobrepondo)
            // ou totalmente aleatório se o prof não tiver disponibilidade (erro de input, mas tratamos)
            const fallbackSlot = availableIndices.length > 0 
                ? availableIndices[Math.floor(Math.random() * availableIndices.length)]
                : { dayIdx: Math.floor(Math.random() * this.config.days.length), slotIdx: Math.floor(Math.random() * this.config.timeSlots.length) };

            genes.push({
              id: Math.random().toString(36).substr(2, 9),
              teacherId: teacher.id,
              teacherName: teacher.name,
              subject: teacher.subject,
              grade: assignment.grade,
              day: this.config.days[fallbackSlot.dayIdx],
              dayIndex: fallbackSlot.dayIdx,
              timeSlot: this.config.timeSlots[fallbackSlot.slotIdx],
              slotIndex: fallbackSlot.slotIdx,
              fixed: false
            });
            // Não marcamos usageMap para permitir detecção de overload depois
          }
        }
      }
    }

    return { genes, fitness: 0, conflicts: 0 };
  }

  private calculateFitness(chromosome: Chromosome): void {
    let score = 1000;
    let conflicts = 0;

    // Mapas para verificar colisão rapidamente
    const teacherSlots = new Map<string, number>(); // "TeacherID-DayIdx-SlotIdx" -> Count
    const classSlots = new Map<string, number>();   // "Grade-DayIdx-SlotIdx" -> Count
    
    // 1. Penalidade Pesada: Conflitos (Hard Constraints)
    for (const gene of chromosome.genes) {
      const tKey = `${gene.teacherId}-${gene.dayIndex}-${gene.slotIndex}`;
      const cKey = `${gene.grade}-${gene.dayIndex}-${gene.slotIndex}`;

      const tCount = (teacherSlots.get(tKey) || 0) + 1;
      teacherSlots.set(tKey, tCount);
      
      const cCount = (classSlots.get(cKey) || 0) + 1;
      classSlots.set(cKey, cCount);

      // Checar disponibilidade do professor
        const teacher = this.teachers.find(t => t.id === gene.teacherId);
        if (teacher && !teacher.availabilityDays.includes(gene.day)) {
            score -= 50; // Penalidade média para desrespeito de disponibilidade
        }
    }

    // Contabilizar penalidades de conflito
    teacherSlots.forEach(count => {
      if (count > 1) {
        score -= (count - 1) * 100; // -100 por colisão extra
        conflicts += (count - 1);
      }
    });

    classSlots.forEach(count => {
      if (count > 1) {
        score -= (count - 1) * 100;
        conflicts += (count - 1);
      }
    });

    // 2. Penalidade Leve: Janelas (Soft Constraints)
    // Agrupar aulas do professor por dia e ver se são consecutivas
    const teacherDayLessons: { [key: string]: number[] } = {}; // "TeacherID-DayIdx" -> [SlotIdx, SlotIdx...]
    
    chromosome.genes.forEach(g => {
        const key = `${g.teacherId}-${g.dayIndex}`;
        if (!teacherDayLessons[key]) teacherDayLessons[key] = [];
        teacherDayLessons[key].push(g.slotIndex);
    });

    Object.values(teacherDayLessons).forEach(slots => {
        slots.sort((a, b) => a - b);
        for (let i = 0; i < slots.length - 1; i++) {
            const gap = slots[i+1] - slots[i];
            if (gap > 1) {
                // Existe uma janela (ex: aula no slot 0 e slot 2, gap=2)
                score -= (gap - 1) * 5; // -5 pontos por slot de janela
            }
        }
    });

    chromosome.fitness = score;
    chromosome.conflicts = conflicts;
  }

  /**
   * Tenta consertar conflitos movendo aulas para espaços vazios
   */
  private repair(chromosome: Chromosome): void {
    const maxRepairs = 10;
    
    // Identificar genes conflitantes
    // Reconstroi mapa de ocupação
    const occupied = new Set<string>();
    chromosome.genes.forEach((g, idx) => {
        occupied.add(`T:${g.teacherId}-D:${g.dayIndex}-S:${g.slotIndex}`);
        occupied.add(`C:${g.grade}-D:${g.dayIndex}-S:${g.slotIndex}`);
    });

    // Função auxiliar para checar ocupação
    const isOccupied = (teacherId: string, grade: string, dayIdx: number, slotIdx: number, excludeGeneIndex: number) => {
        // Verifica se ALGUÉM MAIS ocupa (excluindo a própria aula que estamos tentando mover)
        return chromosome.genes.some((g, idx) => {
            if (idx === excludeGeneIndex) return false;
            if (g.dayIndex !== dayIdx || g.slotIndex !== slotIdx) return false;
            return g.teacherId === teacherId || g.grade === grade;
        });
    };

    for (let r = 0; r < maxRepairs; r++) {
         let hasRepaired = false;
         
         // Iterar sobre genes e ver se move algum que está em conflito
         for (let i = 0; i < chromosome.genes.length; i++) {
             const gene = chromosome.genes[i];
             // Checar se este gene está colidindo
             if (isOccupied(gene.teacherId, gene.grade, gene.dayIndex, gene.slotIndex, i)) {
                 // Tentar mover para outro slot válido do professor
                 const teacher = this.teachers.find(t => t.id === gene.teacherId);
                 if (!teacher) continue;

                 // Buscar slot livre
                 let foundSlot = false;
                 // Embaralha dias/slots para não viciar
                 const potentialSlots: {d: number, s: number}[] = [];
                 this.config.days.forEach((d, dIdx) => {
                     if (teacher.availabilityDays.includes(d)) {
                         this.config.timeSlots.forEach((_, sIdx) => {
                             potentialSlots.push({d: dIdx, s: sIdx});
                         });
                     }
                 });
                 this.shuffleArray(potentialSlots);

                 for (const slot of potentialSlots) {
                     if (!isOccupied(gene.teacherId, gene.grade, slot.d, slot.s, i)) {
                         // Mover!
                         gene.day = this.config.days[slot.d];
                         gene.dayIndex = slot.d;
                         gene.timeSlot = this.config.timeSlots[slot.s];
                         gene.slotIndex = slot.s;
                         foundSlot = true;
                         hasRepaired = true;
                         break;
                     }
                 }
             }
         }
         if (!hasRepaired) break; // Se rodou tudo e não reparou nada, para.
    }
  }

  private mutate(chromosome: Chromosome): Chromosome {
    // Clone
    const newGenes = [...chromosome.genes];
    
    // Escolhe um gene aleatório para mudar de horário
    const idx = Math.floor(Math.random() * newGenes.length);
    const gene = { ...newGenes[idx] };
    const teacher = this.teachers.find(t => t.id === gene.teacherId);

    if (teacher) {
       // Escolher novo slot aleatório (dentro da disponibilidade)
       const eligibleDaysIndices = this.config.days
            .map((d, i) => teacher.availabilityDays.includes(d) ? i : -1)
            .filter(i => i !== -1);
       
       if (eligibleDaysIndices.length > 0) {
           const newDayIdx = eligibleDaysIndices[Math.floor(Math.random() * eligibleDaysIndices.length)];
           const newSlotIdx = Math.floor(Math.random() * this.config.timeSlots.length);
           
           gene.dayIndex = newDayIdx;
           gene.day = this.config.days[newDayIdx];
           gene.slotIndex = newSlotIdx;
           gene.timeSlot = this.config.timeSlots[newSlotIdx];
           
           newGenes[idx] = gene;
       }
    }

    return { genes: newGenes, fitness: 0, conflicts: 0 };
  }

  private crossover(parentA: Chromosome, parentB: Chromosome): Chromosome {
    // Uniform Crossover (mistura genes dos pais)
    // Preservando integridade das aulas (não criamos meia aula)
    const newGenes: GeneticLesson[] = [];
    
    // Assumimos que a ordem dos genes pode variar ou não corresponder 1:1, 
    // mas num GA simples de permutation, o conjunto de aulas é fixo.
    // Aqui, vamos fazer crossover por índice mesmo, já que a lista de aulas necessárias é a mesma.
    
    for (let i = 0; i < parentA.genes.length; i++) {
        if (Math.random() > 0.5) {
            newGenes.push({ ...parentA.genes[i] });
        } else {
            newGenes.push({ ...parentB.genes[i] });
        }
    }
    
    return { genes: newGenes, fitness: 0, conflicts: 0 };
  }

  private tournamentSelect(population: Chromosome[]): Chromosome {
    const k = 3;
    let best = population[Math.floor(Math.random() * population.length)];
    for (let i = 0; i < k - 1; i++) {
        const ind = population[Math.floor(Math.random() * population.length)];
        if (ind.fitness > best.fitness) best = ind;
    }
    return best;
  }

  private convertToSchedule(chromosome: Chromosome): Schedule {
    const schedule: Schedule = {};
    
    // Init structure
    this.config.days.forEach(d => {
        schedule[d] = {};
        this.config.timeSlots.forEach(t => {
            schedule[d][t] = [];
        });
    });

    chromosome.genes.forEach(g => {
        if (!schedule[g.day]) schedule[g.day] = {};
        if (!schedule[g.day][g.timeSlot]) schedule[g.day][g.timeSlot] = [];
        
        schedule[g.day][g.timeSlot].push({
            grade: g.grade,
            subject: g.subject,
            teacherName: g.teacherName
        });
    });

    return schedule;
  }

  private shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
