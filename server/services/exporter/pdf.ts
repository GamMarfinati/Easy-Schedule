import PDFDocument from 'pdfkit';
import { ScheduleSolution } from '../scheduler/types.js';

export const generatePDF = (schedule: ScheduleSolution, orgName: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text(orgName, { align: 'center' });
    doc.fontSize(14).text('Grade Horária', { align: 'center' });
    doc.moveDown();

    // Simple list layout for MVP (Grid layout is complex in PDFKit without tables plugin)
    // Group by Class
    const lessonsByClass = schedule.schedule.reduce((acc, lesson) => {
      if (!acc[lesson.class_id]) acc[lesson.class_id] = [];
      acc[lesson.class_id].push(lesson);
      return acc;
    }, {} as Record<string, typeof schedule.schedule>);

    Object.entries(lessonsByClass).forEach(([classId, lessons]) => {
      doc.fontSize(16).text(`Turma: ${classId}`, { underline: true });
      doc.moveDown(0.5);

      // Sort by Day/Period
      lessons.sort((a, b) => {
        const days = ['seg', 'ter', 'qua', 'qui', 'sex'];
        if (a.day !== b.day) return days.indexOf(a.day) - days.indexOf(b.day);
        return a.period - b.period;
      });

      lessons.forEach(l => {
        doc.fontSize(12).text(`${l.day.toUpperCase()} - ${l.period}º Período: ${l.subject} (${l.teacher_id})`);
      });
      
      doc.moveDown();
    });

    doc.end();
  });
};
