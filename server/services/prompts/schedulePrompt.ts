
export const generateSchedulePrompt = (teachers: any[], config: any) => {
  const days = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
  const periods = [1, 2, 3, 4, 5, 6]; // Ajuste conforme config se necessário

  return `
    Atue como um gerador de horários escolares perfeito.
    
    DADOS DE ENTRADA:
    Professores: ${JSON.stringify(teachers.map(t => ({
      id: t.id,
      name: t.name,
      subjects: t.subjects || [t.subject], // Garante array
      availability: t.availability || [] // Array de dias/horários indisponíveis
    })))}
    
    REGRAS:
    1. Crie uma grade completa para a semana.
    2. Evite janelas (horários vagos entre aulas) para os professores.
    3. Tente agrupar as aulas do mesmo professor no mesmo dia para evitar deslocamento desnecessário (dias de aula única).
    4. Respeite a disponibilidade informada.
    
    SAÍDA ESPERADA (JSON APENAS):
    Retorne um objeto JSON onde as chaves são os nomes dos professores.
    Estrutura:
    {
      "Nome do Professor": {
        "Segunda-feira": [ { "turma": "1º A", "disciplina": "Matemática" }, null, ... ],
        "Terça-feira": ...
      },
      ...
    }
    Use 'null' para horários vagos.
    Não escreva nada além do JSON.
  `;
};
