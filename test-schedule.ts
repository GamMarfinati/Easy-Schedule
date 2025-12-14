#!/usr/bin/env npx tsx
/**
 * Script de teste para o gerador de grades com dados reais do CSV
 * Execute com: npx tsx test-schedule.ts
 */

import fs from 'fs';
import path from 'path';

// Simula o que o frontend envia
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

// Parse do CSV de professores
function parseCSV(csvContent: string): Teacher[] {
  const lines = csvContent.trim().split('\n');
  const header = lines[0];
  const dataLines = lines.slice(1);
  
  // Mapa para consolidar professores (podem ter múltiplas linhas para mesma disciplina em turmas diferentes)
  const teacherMap = new Map<string, Teacher>();
  
  dataLines.forEach((line, idx) => {
    // Parse manual considerando campos com aspas
    const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
    if (!matches || matches.length < 5) return;
    
    const [name, subject, daysRaw, grade, countStr] = matches.map(s => s.trim().replace(/^"|"$/g, ''));
    
    const classCount = parseInt(countStr, 10);
    if (isNaN(classCount)) return;
    
    // Dias disponíveis
    const availabilityDays = daysRaw.split(',').map(d => d.trim());
    
    // Chave única: nome + disciplina
    const key = `${name}-${subject}`;
    
    if (!teacherMap.has(key)) {
      teacherMap.set(key, {
        id: `teacher-${idx + 1}-${Date.now()}`,
        name,
        subject,
        availabilityDays,
        classAssignments: []
      });
    }
    
    const teacher = teacherMap.get(key)!;
    teacher.classAssignments.push({
      id: `assign-${idx + 1}-${Date.now()}`,
      grade,
      classCount
    });
  });
  
  return Array.from(teacherMap.values());
}

// Time slots padrão (6 aulas por dia)
const timeSlots = [
  "07:15-08:05",
  "08:05-08:55",
  "09:10-10:00",
  "10:00-10:50",
  "11:05-11:55",
  "11:55-12:45"
];

async function testScheduleGeneration() {
  console.log("🚀 Iniciando teste de geração de grade...\n");
  
  // Carregar CSV
  const csvPath = path.join(process.cwd(), '..', 'professores.csv');
  console.log(`📂 Carregando CSV: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error("❌ Arquivo professores.csv não encontrado!");
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const teachers = parseCSV(csvContent);
  
  console.log(`\n📊 Dados carregados:`);
  console.log(`   - ${teachers.length} professores/disciplinas`);
  
  let totalAulas = 0;
  teachers.forEach(t => {
    t.classAssignments.forEach(a => totalAulas += a.classCount);
  });
  console.log(`   - ${totalAulas} aulas total para alocar`);
  
  const turmas = new Set(teachers.flatMap(t => t.classAssignments.map(a => a.grade)));
  console.log(`   - ${turmas.size} turmas: ${Array.from(turmas).join(', ')}`);
  
  console.log(`\n👨‍🏫 Professores:`);
  teachers.forEach(t => {
    const carga = t.classAssignments.map(a => `${a.grade}(${a.classCount})`).join(', ');
    console.log(`   - ${t.name} (${t.subject}): ${carga} | Dias: ${t.availabilityDays.join(', ')}`);
  });
  
  // Preparar payload
  const payload = { teachers, timeSlots };
  
  console.log(`\n🔄 Enviando requisição para o servidor...`);
  
  try {
    const response = await fetch('http://localhost:3002/test/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Aqui precisaria do token JWT real, mas para teste estamos sem autenticação
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`\n✅ SUCESSO! Grade gerada com ${data.metadata?.attempts} tentativa(s)`);
      console.log(`📊 Total de aulas: ${data.metadata?.totalLessons}`);
      console.log(`📅 Gerada em: ${data.metadata?.generatedAt}`);
      
      // Mostrar resumo da grade
      console.log(`\n📋 Resumo da Grade:`);
      Object.keys(data.schedule).forEach(day => {
        const slots = Object.entries(data.schedule[day]).filter(([_, v]) => v !== null);
        console.log(`   ${day}: ${slots.length} aulas`);
      });
    } else {
      console.log(`\n❌ ERRO: ${data.error}`);
      if (data.details) {
        console.log(`📋 Detalhes:`);
        data.details.forEach((d: string, i: number) => console.log(`   ${i + 1}. ${d}`));
      }
      if (data.suggestion) {
        console.log(`💡 Sugestão: ${data.suggestion}`);
      }
    }
  } catch (error) {
    console.error("❌ Erro de conexão:", error);
  }
}

testScheduleGeneration();
