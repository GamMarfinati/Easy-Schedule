export const generateSchedulePrompt = (teachers: any[], config: any) => {
  const days = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
  const dayMapShort = {'Seg': 'Segunda-feira', 'Ter': 'Terça-feira', 'Qua': 'Quarta-feira', 'Qui': 'Quinta-feira', 'Sex': 'Sexta-feira'};

  // Helper function to describe availability
  const describeAvailability = (teacher: any) => {
    // New Format: JSONB { "Seg": [0,1...] }
    if (teacher.availability && Object.keys(teacher.availability).length > 0) {
      let descriptions = [];
      for (const [shortDay, slots] of Object.entries(teacher.availability)) {
        const slotsTyped = slots as number[];
        const availableSlots = slotsTyped
          .map((s, i) => (s === 1 ? i + 1 : null))
          .filter(s => s !== null);
        
        const fullDay = dayMapShort[shortDay as keyof typeof dayMapShort] || shortDay;
        
        if (availableSlots.length === 0) {
          descriptions.push(`${fullDay}: Indisponível (Nenhum horário)`);
        } else if (availableSlots.length === slotsTyped.length) {
          descriptions.push(`${fullDay}: Totalmente Disponível`);
        } else {
          descriptions.push(`${fullDay}: Disponível APENAS nos horários [${availableSlots.join(', ')}]`);
        }
      }
      return descriptions.join('; ');
    }
    
    // Fallback: Old Format (availabilityDays)
    if (teacher.availabilityDays && teacher.availabilityDays.length > 0) {
        return `Disponível nos dias: ${teacher.availabilityDays.join(', ')}`;
    }
    
    return "Disponibilidade Total (todos os dias e horários)";
  };

  const teachersDescription = teachers.map(t => {
     const assignments = t.classAssignments 
        ? t.classAssignments.map((a: any) => `${a.classCount} aulas para ${a.grade}`).join(', ')
        : "Sem atribuições definidas";

     return `
     - Nome: ${t.name}
       Disciplina Principal: ${t.subject}
       Carga Horária: ${assignments}
       Disponibilidade: ${describeAvailability(t)}
     `;
  }).join('\n');

  return `
    Atue como um gerador de horários escolares especialista e rigoroso.
    
    DADOS DE ENTRADA:
    ${teachersDescription}
    
    REGRAS CRÍTICAS:
    1. Crie uma grade completa para a semana.
    2. RESPEITE RIGOROSAMENTE A DISPONIBILIDADE DOS PROFESSORES.
       - Se o professor diz "Disponível APENAS nos horários [1, 2]", você NÃO PODE alocá-lo no horário 3, 4, 5 ou 6 desse dia.
       - Ignorar isso é um erro fatal.
    3. Distribua a carga horária conforme solicitado (ex: 4 aulas para 1º A).
    4. Evite janelas e tente agrupar aulas.
    
    SAÍDA ESPERADA (JSON APENAS):
    Retorne um objeto JSON onde as chaves são os nomes dos professores.
    Estrutura:
    {
      "Nome do Professor": {
        "Segunda-feira": [ { "turma": "1º A", "disciplina": "Matemática" }, null, { "turma": "1º A", "disciplina": "Matemática" }, ... ],
        "Terça-feira": ...
      },
      ...
    }
    Use 'null' para horários vagos.
    O array para cada dia deve ter o tamanho correspondente ao número de slots (padrão 5 ou 6).
    Não escreva nada além do JSON.
  `;
};
