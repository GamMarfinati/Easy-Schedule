import express from 'express';
import db from '../db.js';
import { checkJwt, extractTenant } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';

const router = express.Router();

// Protected Routes
router.use(checkJwt);
router.use(extractTenant);
router.use(tenantMiddleware);

// GET /schedules - List all schedules for the organization
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const schedules = await db('schedules')
      .where({ organization_id: tenantId })
      .orderBy('created_at', 'desc')
      .select('id', 'name', 'status', 'created_at', 'updated_at');
    
    res.json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).json({ error: 'Erro ao buscar grades.' });
  }
});

// GET /schedules/:id - Get a specific schedule
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    
    const schedule = await db('schedules')
      .where({ id, organization_id: tenantId })
      .first();
    
    if (!schedule) {
      return res.status(404).json({ error: 'Grade não encontrada.' });
    }
    
    res.json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    res.status(500).json({ error: 'Erro ao buscar grade.' });
  }
});

// POST /schedules - Save a new schedule
router.post('/', async (req, res) => {
  try {
    const { name, data, metadata } = req.body;
    const tenantId = req.tenantId!;
    
    if (!name || !data) {
      return res.status(400).json({ error: 'Nome e dados da grade são obrigatórios.' });
    }
    
    const [schedule] = await db('schedules')
      .insert({
        organization_id: tenantId,
        name,
        status: 'draft',
        data: JSON.stringify({
          schedule: data,
          metadata: {
            ...metadata,
            savedAt: new Date().toISOString(),
          }
        })
      })
      .returning(['id', 'name', 'status', 'created_at']);
    
    res.status(201).json(schedule);
  } catch (error) {
    console.error("Error saving schedule:", error);
    res.status(500).json({ error: 'Erro ao salvar grade.' });
  }
});

// PUT /schedules/:id - Update a schedule (e.g., publish)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;
    const tenantId = req.tenantId!;
    
    const updateData: any = { updated_at: new Date() };
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    
    const updated = await db('schedules')
      .where({ id, organization_id: tenantId })
      .update(updateData)
      .returning(['id', 'name', 'status', 'updated_at']);
    
    if (!updated.length) {
      return res.status(404).json({ error: 'Grade não encontrada.' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ error: 'Erro ao atualizar grade.' });
  }
});

// DELETE /schedules/:id - Delete a schedule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId!;
    
    const deleted = await db('schedules')
      .where({ id, organization_id: tenantId })
      .delete();
    
    if (!deleted) {
      return res.status(404).json({ error: 'Grade não encontrada.' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({ error: 'Erro ao excluir grade.' });
  }
});

// GET /schedules/count - Get count of schedules
router.get('/stats/count', async (req, res) => {
  try {
    const tenantId = req.tenantId!;
    const result = await db('schedules')
      .where({ organization_id: tenantId })
      .count('id as total')
      .first();
    
    res.json({ total: parseInt(result?.total as string) || 0 });
  } catch (error) {
    console.error("Error counting schedules:", error);
    res.status(500).json({ error: 'Erro ao contar grades.' });
  }
});

export default router;
