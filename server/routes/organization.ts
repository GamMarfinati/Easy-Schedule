import express from 'express';
import db from '../db.js';
import { tenantMiddleware } from '../middleware/tenant.js';

const router = express.Router();

router.use(tenantMiddleware);

// Get current organization details
router.get('/', async (req, res) => {
  try {
    const org = await db('organizations').where({ id: req.tenantId }).first();
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(org);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Update organization details
router.put('/', async (req, res) => {
  try {
    const { name } = req.body; // Removido timezone (não existe na tabela)
    await db('organizations')
      .where({ id: req.tenantId })
      .update({
        name,
        updated_at: new Date()
      });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// List organization members
router.get('/users', async (req, res) => {
  try {
    // Usando a estrutura correta: users tem organization_id direto (não organization_members)
    const users = await db('users')
      .where('organization_id', req.tenantId)
      .select(
        'id',
        'name',
        'email',
        'role',
        'created_at as joined_at'
      );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
