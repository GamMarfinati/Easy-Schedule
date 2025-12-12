import { Request, Response } from 'express';
import { GeneticScheduler } from '../services/scheduler/algorithm';
import { ScheduleInput } from '../services/scheduler/types';
import db from '../db';

export const generateSchedule = async (req: Request, res: Response) => {
  try {
    const input: ScheduleInput = req.body;
    const tenantId = req.tenantId!;
    const userId = req.auth?.payload.sub; // TODO: map to internal ID if needed

    // Basic validation
    if (!input.teachers || !input.classes || !input.days) {
      return res.status(400).json({ error: 'Dados de entrada incompletos.' });
    }

    // Run algorithm
    // Note: In a real production app, this should be offloaded to a worker queue (Bull/Redis)
    // because it blocks the event loop. For MVP/Demo with small datasets, we run it here.
    const startTime = Date.now();
    const scheduler = new GeneticScheduler(input);
    const solutions = scheduler.generate();
    const duration = (Date.now() - startTime) / 1000;

    // Save draft to DB
    const [scheduleId] = await db('schedules').insert({
      organization_id: tenantId,
      name: input.name,
      status: 'draft',
      // created_by: userId, // Need to resolve internal ID first
      data: JSON.stringify({ input, solutions }),
    }).returning('id');

    res.json({
      schedule_id: scheduleId,
      solutions,
      generation_time: duration
    });

  } catch (error) {
    console.error("Error generating schedule:", error);
    res.status(500).json({ error: 'Erro interno ao gerar grade.' });
  }
};
