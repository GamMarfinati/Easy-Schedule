import ExcelJS from 'exceljs';
import { ScheduleSolution } from '../scheduler/types.js';

export const generateExcel = async (schedule: ScheduleSolution, orgName: string): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HoraProfe';
  workbook.created = new Date();

  // Group by Class
  const lessonsByClass = schedule.schedule.reduce((acc, lesson) => {
    if (!acc[lesson.class_id]) acc[lesson.class_id] = [];
    acc[lesson.class_id].push(lesson);
    return acc;
  }, {} as Record<string, typeof schedule.schedule>);

  Object.entries(lessonsByClass).forEach(([classId, lessons]) => {
    const sheet = workbook.addWorksheet(classId);
    
    sheet.columns = [
      { header: 'Período', key: 'period', width: 10 },
      { header: 'Segunda', key: 'seg', width: 20 },
      { header: 'Terça', key: 'ter', width: 20 },
      { header: 'Quarta', key: 'qua', width: 20 },
      { header: 'Quinta', key: 'qui', width: 20 },
      { header: 'Sexta', key: 'sex', width: 20 },
    ];

    // Organize data into rows (Period x Day)
    const maxPeriod = Math.max(...lessons.map(l => l.period));
    
    for (let p = 1; p <= maxPeriod; p++) {
      const row: any = { period: `${p}º` };
      ['seg', 'ter', 'qua', 'qui', 'sex'].forEach(day => {
        const lesson = lessons.find(l => l.day === day && l.period === p);
        row[day] = lesson ? `${lesson.subject}\n(${lesson.teacher_id})` : '-';
      });
      sheet.addRow(row);
    }

    // Styling
    sheet.getRow(1).font = { bold: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
};
