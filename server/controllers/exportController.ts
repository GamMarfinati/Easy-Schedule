import { Request, Response } from 'express';
import db from '../db.js';
import { generatePDF } from '../services/exporter/pdf.js';
import { generateExcel } from '../services/exporter/excel.js';
import { generateICS } from '../services/exporter/ics.js';

export const exportSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format } = req.query;
    const tenantId = req.tenantId!;

    const scheduleRecord = await db('schedules')
      .where({ id, organization_id: tenantId })
      .first();

    if (!scheduleRecord) {
      return res.status(404).json({ error: 'Grade não encontrada.' });
    }

    const org = await db('organizations').where({ id: tenantId }).first();
    const data = scheduleRecord.data; // JSONB
    // Assuming 'solutions' is an array and we pick the first/best one or the one marked as published
    // For now, pick the first solution
    const solution = data.solutions ? data.solutions[0] : null;

    if (!solution) {
      return res.status(400).json({ error: 'Nenhuma solução gerada para esta grade.' });
    }

    if (format === 'pdf') {
      const buffer = await generatePDF(solution, org.name);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="grade-${id}.pdf"`);
      res.send(buffer);
    } else if (format === 'excel') {
      const buffer = await generateExcel(solution, org.name);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="grade-${id}.xlsx"`);
      res.send(buffer);
    } else if (format === 'ics') {
      const content = await generateICS(solution, org.name);
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', `attachment; filename="grade-${id}.ics"`);
      res.send(content);
    } else {
      res.status(400).json({ error: 'Formato inválido. Use pdf, excel ou ics.' });
    }

  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: 'Erro ao exportar grade.' });
  }
};
