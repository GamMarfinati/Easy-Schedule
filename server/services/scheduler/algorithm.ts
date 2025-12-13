import { ScheduleInput, ScheduleSolution, Lesson, TimeSlot } from './types.js';

// Helper to check if two slots overlap (trivial here as slots are discrete)
const isSameSlot = (a: TimeSlot, b: TimeSlot) => a.day === b.day && a.period === b.period;

export class GeneticScheduler {
  private input: ScheduleInput;
  private populationSize = 50;
  private generations = 100;
  private mutationRate = 0.1;

  constructor(input: ScheduleInput) {
    this.input = input;
  }

  public generate(): ScheduleSolution[] {
    let population = this.initializePopulation();
    
    for (let i = 0; i < this.generations; i++) {
      population.sort((a, b) => b.score - a.score);
      
      // Elitism: keep top 10%
      const newPopulation = population.slice(0, Math.floor(this.populationSize * 0.1));
      
      while (newPopulation.length < this.populationSize) {
        const parent1 = this.selectParent(population);
        const parent2 = this.selectParent(population);
        let child = this.crossover(parent1, parent2);
        if (Math.random() < this.mutationRate) {
          child = this.mutate(child);
        }
        child.score = this.calculateFitness(child.schedule);
        newPopulation.push(child);
      }
      population = newPopulation;
    }

    // Return top 3 unique solutions
    return population.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  private initializePopulation(): ScheduleSolution[] {
    const population: ScheduleSolution[] = [];
    for (let i = 0; i < this.populationSize; i++) {
      const schedule = this.generateRandomSchedule();
      population.push({
        schedule,
        score: this.calculateFitness(schedule)
      });
    }
    return population;
  }

  private generateRandomSchedule(): Lesson[] {
    const lessons: Lesson[] = [];
    
    // For each class and subject, assign random slots needed
    this.input.classes.forEach(cls => {
      cls.subjects.forEach(sub => {
        for (let i = 0; i < sub.hours_per_week; i++) {
          const randomDay = this.input.days[Math.floor(Math.random() * this.input.days.length)];
          const randomPeriod = Math.floor(Math.random() * this.input.periods) + 1;
          
          lessons.push({
            day: randomDay,
            period: randomPeriod,
            class_id: cls.id,
            subject: sub.name,
            teacher_id: sub.teacher_id,
            // classroom assignment omitted for brevity in MVP
          });
        }
      });
    });
    
    return lessons;
  }

  private calculateFitness(schedule: Lesson[]): number {
    let score = 100;
    
    // Constraint 1: Teacher conflict (same teacher in 2 places at once)
    const teacherConflicts = this.countConflicts(schedule, 'teacher_id');
    score -= teacherConflicts * 10;

    // Constraint 2: Class conflict (same class has 2 lessons at once)
    const classConflicts = this.countConflicts(schedule, 'class_id');
    score -= classConflicts * 10;

    // Constraint 3: Teacher availability
    schedule.forEach(lesson => {
      const teacher = this.input.teachers.find(t => t.id === lesson.teacher_id);
      if (teacher) {
        const isAvailable = teacher.disponibility.some(slot => 
          slot.day === lesson.day && slot.period === lesson.period
        );
        if (!isAvailable) score -= 5; // Penalty for unavailable slot
      }
    });

    return Math.max(0, score);
  }

  private countConflicts(schedule: Lesson[], key: keyof Lesson): number {
    let conflicts = 0;
    const groups = new Map<string, Lesson[]>();

    schedule.forEach(l => {
      const k = `${l[key]}-${l.day}-${l.period}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(l);
    });

    groups.forEach(lessons => {
      if (lessons.length > 1) conflicts += lessons.length - 1;
    });

    return conflicts;
  }

  private selectParent(population: ScheduleSolution[]): ScheduleSolution {
    // Tournament selection
    const k = 3;
    let best = population[Math.floor(Math.random() * population.length)];
    for (let i = 0; i < k - 1; i++) {
      const contender = population[Math.floor(Math.random() * population.length)];
      if (contender.score > best.score) best = contender;
    }
    return best;
  }

  private crossover(p1: ScheduleSolution, p2: ScheduleSolution): ScheduleSolution {
    // Single point crossover
    const point = Math.floor(Math.random() * p1.schedule.length);
    const childSchedule = [
      ...p1.schedule.slice(0, point),
      ...p2.schedule.slice(point)
    ];
    return { schedule: childSchedule, score: 0 };
  }

  private mutate(solution: ScheduleSolution): ScheduleSolution {
    const schedule = [...solution.schedule];
    const idx = Math.floor(Math.random() * schedule.length);
    
    // Move a random lesson to a new random slot
    schedule[idx] = {
      ...schedule[idx],
      day: this.input.days[Math.floor(Math.random() * this.input.days.length)],
      period: Math.floor(Math.random() * this.input.periods) + 1
    };
    
    return { schedule, score: 0 };
  }
}
